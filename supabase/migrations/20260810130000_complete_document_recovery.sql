create or replace function public.set_document_retention_review_date()
returns trigger language plpgsql set search_path = '' as $$
declare charter_end date;
begin
  if new.retention_review_due_at is not null then return new; end if;
  select booking.charter_end_date into charter_end from public.bookings booking where booking.id = new.booking_id;
  new.retention_review_due_at := coalesce(charter_end, current_date) +
    case when new.retention_class = 'identity_sensitive' then 30 else 365 end;
  return new;
end;
$$;
create trigger set_document_retention_review_date
  before insert on public.documents for each row execute function public.set_document_retention_review_date();

create or replace function public.reject_quarantined_document(p_document_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_reason)) < 10 or char_length(trim(p_reason)) > 2000 then
    raise exception 'A clear rejection reason is required' using errcode = '22023';
  end if;
  perform set_config('app.phase8_command', 'yes', true);
  update public.documents set scan_status = 'error', verification_status = 'rejected',
    scanner_detail = trim(p_reason), scan_completed_at = now()
  where id = p_document_id and storage_bucket = 'booking-quarantine'
    and scan_status in ('pending', 'scanning', 'error');
  if not found then raise exception 'Recoverable quarantined document not found' using errcode = 'P0002'; end if;
  insert into public.document_history(document_id, action, reason, changed_by)
  values (p_document_id, 'rejected', trim(p_reason), (select auth.uid()));
  perform set_config('app.phase8_command', '', true);
end;
$$;
revoke all on function public.reject_quarantined_document(uuid,text) from public, anon;
grant execute on function public.reject_quarantined_document(uuid,text) to authenticated;
