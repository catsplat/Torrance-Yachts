-- An operations workbook represents a point-in-time view of operational data.
-- Do not include request metadata in its content hash: doing so turns every
-- manual retry into a new snapshot and a duplicate delivery.

create or replace function public.queue_operations_sheet_snapshot()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  snapshot_content jsonb;
  snapshot_payload jsonb;
  snapshot_hash text;
  snapshot_id uuid;
  rows_total integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.integration_connections
    where provider = 'google_sheets' and enabled
  ) then
    raise exception 'Google Sheets is not enabled' using errcode = '23514';
  end if;

  snapshot_content := jsonb_build_object(
    'enquiries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'reference', enquiry.reference,
        'status', enquiry.status,
        'priority', enquiry.priority,
        'summary', enquiry.summary,
        'yacht', yacht.name,
        'start_date', enquiry.charter_start_date,
        'end_date', enquiry.charter_end_date,
        'updated_at', enquiry.updated_at
      ) order by enquiry.updated_at desc), '[]'::jsonb)
      from public.enquiries enquiry
      left join public.yachts yacht on yacht.id = enquiry.requested_yacht_id
    ),
    'bookings', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'reference', booking.reference,
        'status', booking.status,
        'yacht', yacht.name,
        'start_date', booking.charter_start_date,
        'end_date', booking.charter_end_date,
        'currency', booking.currency,
        'charter_fee', booking.charter_fee
      ) order by booking.charter_start_date), '[]'::jsonb)
      from public.bookings booking
      join public.yachts yacht on yacht.id = booking.yacht_id
    ),
    'captains', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'yacht', yacht.name,
        'captain', contact.full_name,
        'email', contact.email,
        'phone', contact.phone
      ) order by yacht.name), '[]'::jsonb)
      from public.yacht_contacts assignment
      join public.yachts yacht on yacht.id = assignment.yacht_id
      join public.contacts contact on contact.id = assignment.contact_id
      where assignment.responsibility = 'captain' and assignment.is_primary
    )
  );

  rows_total := jsonb_array_length(snapshot_content->'enquiries') +
    jsonb_array_length(snapshot_content->'bookings') +
    jsonb_array_length(snapshot_content->'captains');
  snapshot_hash := encode(extensions.digest(snapshot_content::text, 'sha256'), 'hex');
  snapshot_payload := jsonb_build_object('generated_at', now()) || snapshot_content;

  perform set_config('app.phase11_command', 'yes', true);
  insert into public.integration_snapshots (
    snapshot_type, payload, payload_sha256, row_count, requested_by
  ) values (
    'operations_workbook', snapshot_payload, snapshot_hash, rows_total, (select auth.uid())
  )
  on conflict (snapshot_type, payload_sha256) do update
    set requested_at = now(), requested_by = (select auth.uid())
  returning id into snapshot_id;

  insert into public.integration_deliveries (
    provider, operation, idempotency_key, source_type, source_id, payload
  ) values (
    'google_sheets', 'sheets_snapshot', 'sheet_snapshot:' || snapshot_id::text,
    'integration_snapshot', snapshot_id, snapshot_payload
  ) on conflict (idempotency_key) do nothing;
  perform set_config('app.phase11_command', '', true);

  return snapshot_id;
end;
$$;
