-- Extend the protected, administrator-only configuration pack with operational
-- contacts, yacht assignments and a draft invoice profile.  The source pack is
-- stored only in the protected database audit table; no operational values are
-- introduced by this migration.

create or replace function public.preview_configuration_pack_v2(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  base_summary jsonb;
  contact_count integer;
  assignment_count integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
    or coalesce((p_payload->>'version')::integer, 0) <> 1 then
    raise exception 'Configuration pack version 1 is required' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_payload->'contacts'), 'null') not in ('array', 'null')
    or coalesce(jsonb_typeof(p_payload->'invoice_profile'), 'null') not in ('object', 'null') then
    raise exception 'Configuration pack contacts or invoice profile are invalid' using errcode = '22023';
  end if;

  select public.preview_configuration_pack(p_payload) into base_summary;
  select count(*) into contact_count from jsonb_array_elements(coalesce(p_payload->'contacts', '[]'::jsonb));
  select count(*) into assignment_count
  from jsonb_array_elements(coalesce(p_payload->'contacts', '[]'::jsonb)) contact
  cross join lateral jsonb_array_elements(coalesce(contact->'yacht_assignments', '[]'::jsonb));

  return base_summary || jsonb_build_object(
    'contacts', contact_count,
    'yacht_assignments', assignment_count,
    'invoice_profiles', case when p_payload ? 'invoice_profile' then 1 else 0 end
  );
end;
$$;

create or replace function public.import_configuration_pack_v2(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  base_summary jsonb;
  contact jsonb;
  assignment jsonb;
  invoice jsonb;
  target_contact_id uuid;
  target_company_id uuid;
  target_yacht_id uuid;
  invoice_profile_id uuid;
  contact_count integer := 0;
  assignment_count integer := 0;
begin
  perform public.preview_configuration_pack_v2(p_payload);

  -- The original importer remains the authoritative compatibility path for
  -- yachts, rates, sales material, communication drafts and workflow drafts.
  select public.import_configuration_pack(p_payload) into base_summary;

  for contact in select value from jsonb_array_elements(coalesce(p_payload->'contacts', '[]'::jsonb)) loop
    if nullif(trim(contact->>'full_name'), '') is null
      or jsonb_typeof(contact->'roles') <> 'array'
      or jsonb_array_length(contact->'roles') = 0 then
      raise exception 'Each contact needs a name and at least one role' using errcode = '22023';
    end if;

    if nullif(lower(trim(contact->>'email')), '') is not null then
      select id into target_contact_id
      from public.contacts
      where lower(email) = lower(trim(contact->>'email'))
      for update;
    else
      select id into target_contact_id
      from public.contacts
      where lower(full_name) = lower(trim(contact->>'full_name')) and email is null
      order by created_at asc
      limit 1
      for update;
    end if;

    if target_contact_id is null then
      insert into public.contacts (full_name, email, phone, roles, active, created_by, updated_by)
      values (
        trim(contact->>'full_name'),
        nullif(lower(trim(contact->>'email')), ''),
        nullif(trim(contact->>'phone'), ''),
        array(select value::text::public.contact_role from jsonb_array_elements_text(contact->'roles') values_table(value)),
        true, (select auth.uid()), (select auth.uid())
      ) returning id into target_contact_id;
    else
      update public.contacts set
        full_name = trim(contact->>'full_name'),
        email = nullif(lower(trim(contact->>'email')), ''),
        phone = nullif(trim(contact->>'phone'), ''),
        roles = array(select value::text::public.contact_role from jsonb_array_elements_text(contact->'roles') values_table(value)),
        updated_by = (select auth.uid())
      where id = target_contact_id;
    end if;
    contact_count := contact_count + 1;

    if nullif(trim(contact->>'company_name'), '') is not null then
      insert into public.companies (name, created_by, updated_by)
      values (trim(contact->>'company_name'), (select auth.uid()), (select auth.uid()))
      on conflict (lower(name)) do update set updated_by = (select auth.uid()), updated_at = now()
      returning id into target_company_id;
      insert into public.company_contacts (company_id, contact_id, is_primary, created_by, updated_by)
      values (target_company_id, target_contact_id, true, (select auth.uid()), (select auth.uid()))
      on conflict (company_id, contact_id) do update set is_primary = true, updated_by = (select auth.uid()), updated_at = now();
    end if;

    for assignment in select value from jsonb_array_elements(coalesce(contact->'yacht_assignments', '[]'::jsonb)) loop
      select id into target_yacht_id from public.yachts where lower(name) = lower(trim(assignment->>'yacht_name')) for update;
      if target_yacht_id is null then
        raise exception 'Yacht assignment references an unknown yacht: %', assignment->>'yacht_name' using errcode = '22023';
      end if;
      if coalesce((assignment->>'is_primary')::boolean, false) then
        update public.yacht_contacts
        set is_primary = false, updated_by = (select auth.uid()), updated_at = now()
        where yacht_id = target_yacht_id and responsibility = (assignment->>'responsibility')::public.yacht_contact_responsibility;
      end if;
      insert into public.yacht_contacts (yacht_id, contact_id, responsibility, is_primary, notifications_enabled, notes, created_by, updated_by)
      values (
        target_yacht_id, target_contact_id, (assignment->>'responsibility')::public.yacht_contact_responsibility,
        coalesce((assignment->>'is_primary')::boolean, false),
        coalesce((assignment->>'notifications_enabled')::boolean, false),
        nullif(trim(assignment->>'notes'), ''), (select auth.uid()), (select auth.uid())
      )
      on conflict (yacht_id, contact_id, responsibility) do update set
        is_primary = excluded.is_primary,
        notifications_enabled = excluded.notifications_enabled,
        notes = excluded.notes,
        updated_by = (select auth.uid()),
        updated_at = now();
      assignment_count := assignment_count + 1;
    end loop;
  end loop;

  if jsonb_typeof(p_payload->'invoice_profile') = 'object' then
    invoice := p_payload->'invoice_profile';
    select public.create_invoice_profile_draft(
      trim(invoice->>'profile_name'), trim(invoice->>'issuer_name'), trim(invoice->>'issuer_address'),
      trim(invoice->>'recipient_name'), trim(invoice->>'recipient_address'),
      nullif(lower(trim(invoice->>'recipient_email')), ''), trim(invoice->>'service_description_template'),
      trim(invoice->>'payment_instructions')
    ) into invoice_profile_id;
  end if;

  return base_summary || jsonb_build_object(
    'contacts', contact_count,
    'yacht_assignments', assignment_count,
    'invoice_profile_id', invoice_profile_id
  );
end;
$$;

revoke all on function public.preview_configuration_pack_v2(jsonb), public.import_configuration_pack_v2(jsonb) from public, anon;
grant execute on function public.preview_configuration_pack_v2(jsonb), public.import_configuration_pack_v2(jsonb) to authenticated;
