-- Business configuration is supplied at runtime by an administrator, never
-- committed alongside source. A pack only creates new draft/versioned records
-- or updates the named yacht's operational profile; it never deletes history.

create table public.configuration_pack_imports (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 500000),
  summary jsonb not null default '{}'::jsonb,
  imported_by uuid not null references public.profiles(id) on delete restrict,
  imported_at timestamptz not null default now()
);
alter table public.configuration_pack_imports enable row level security;
create policy "administrators view configuration pack imports" on public.configuration_pack_imports
  for select to authenticated using ((select public.is_administrator()));
revoke all on public.configuration_pack_imports from public, anon;
grant select on public.configuration_pack_imports to authenticated;

create or replace function public.preview_configuration_pack(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare yacht_count integer; rate_count integer; communication_count integer; step_count integer;
begin
  if not public.is_administrator() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' or coalesce((p_payload->>'version')::integer, 0) <> 1 then
    raise exception 'Configuration pack version 1 is required' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_payload->'yachts'), 'null') not in ('array','null')
    or coalesce(jsonb_typeof(p_payload->'communication_templates'), 'null') not in ('array','null')
    or coalesce(jsonb_typeof(p_payload->'workflow'), 'null') not in ('object','null') then
    raise exception 'Configuration pack structure is invalid' using errcode = '22023';
  end if;
  select count(*) into yacht_count from jsonb_array_elements(coalesce(p_payload->'yachts', '[]'::jsonb));
  select count(*) into communication_count from jsonb_array_elements(coalesce(p_payload->'communication_templates', '[]'::jsonb));
  select count(*) into rate_count from jsonb_array_elements(coalesce((select jsonb_agg(rate) from jsonb_array_elements(coalesce(p_payload->'yachts','[]'::jsonb)) yacht cross join lateral jsonb_array_elements(coalesce(yacht->'rates','[]'::jsonb)) rate), '[]'::jsonb));
  select count(*) into step_count from jsonb_array_elements(coalesce(p_payload->'workflow'->'steps', '[]'::jsonb));
  return jsonb_build_object('yachts', yacht_count, 'rates', rate_count, 'communication_templates', communication_count, 'workflow_steps', step_count);
end;
$$;

create or replace function public.import_configuration_pack(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  yacht jsonb; rate jsonb; material jsonb; communication jsonb; step jsonb; dependency_code text;
  target_yacht_id uuid; template_record_id uuid; step_id uuid; dependency_step_id uuid; imported_id uuid;
  next_version integer; yacht_count integer := 0; rate_count integer := 0; material_count integer := 0;
  communication_count integer := 0; step_count integer := 0; workflow_name text;
begin
  perform public.preview_configuration_pack(p_payload);

  for yacht in select value from jsonb_array_elements(coalesce(p_payload->'yachts', '[]'::jsonb)) loop
    if nullif(trim(yacht->>'name'), '') is null then raise exception 'Each yacht needs a name' using errcode = '22023'; end if;
    select id into target_yacht_id from public.yachts where lower(name) = lower(trim(yacht->>'name')) for update;
    if target_yacht_id is null then
      insert into public.yachts (name, builder, year_built, length_metres, beam_metres, guest_capacity, cabin_count, crew_count, cruise_speed_knots, max_speed_knots, home_port, preferred_ports, notification_phone, notes)
      values (trim(yacht->>'name'), nullif(trim(yacht->>'builder'), ''), nullif(yacht->>'year_built','')::smallint, nullif(yacht->>'length_metres','')::numeric, nullif(yacht->>'beam_metres','')::numeric,
        nullif(yacht->>'guest_capacity','')::smallint, nullif(yacht->>'cabin_count','')::smallint, nullif(yacht->>'crew_count','')::smallint, nullif(yacht->>'cruise_speed_knots','')::numeric, nullif(yacht->>'max_speed_knots','')::numeric,
        nullif(trim(yacht->>'home_port'), ''), coalesce(array(select jsonb_array_elements_text(coalesce(yacht->'preferred_ports','[]'::jsonb))), '{}'::text[]), nullif(trim(yacht->>'notification_phone'), ''), nullif(trim(yacht->>'notes'), '')) returning id into target_yacht_id;
    end if;
    yacht_count := yacht_count + 1;

    if jsonb_typeof(yacht->'commercial_profile') = 'object' then
      insert into public.yacht_commercial_profiles (yacht_id, overview, port_guidance, fuel_consumption_lph, fuel_consumption_speed_knots, short_charter_divisor, default_currency, default_tax_rate, key_features, reference_notes)
      values (target_yacht_id, trim(yacht->'commercial_profile'->>'overview'), nullif(trim(yacht->'commercial_profile'->>'port_guidance'), ''), nullif(yacht->'commercial_profile'->>'fuel_consumption_lph','')::numeric,
        nullif(yacht->'commercial_profile'->>'fuel_consumption_speed_knots','')::numeric, coalesce(nullif(yacht->'commercial_profile'->>'short_charter_divisor','')::numeric, 6),
        coalesce(nullif(upper(trim(yacht->'commercial_profile'->>'default_currency')), ''), 'EUR'), coalesce(nullif(yacht->'commercial_profile'->>'default_tax_rate','')::numeric, 0),
        coalesce(array(select jsonb_array_elements_text(coalesce(yacht->'commercial_profile'->'key_features','[]'::jsonb))), '{}'::text[]), nullif(trim(yacht->'commercial_profile'->>'reference_notes'), ''))
      on conflict (yacht_id) do update set overview = excluded.overview, port_guidance = excluded.port_guidance, fuel_consumption_lph = excluded.fuel_consumption_lph,
        fuel_consumption_speed_knots = excluded.fuel_consumption_speed_knots, short_charter_divisor = excluded.short_charter_divisor, default_currency = excluded.default_currency,
        default_tax_rate = excluded.default_tax_rate, key_features = excluded.key_features, reference_notes = excluded.reference_notes, updated_by = (select auth.uid()), updated_at = now();
    end if;
    for rate in select value from jsonb_array_elements(coalesce(yacht->'rates', '[]'::jsonb)) loop
      if nullif(trim(rate->>'name'), '') is null or nullif(rate->>'valid_from','') is null or nullif(rate->>'valid_to','') is null or nullif(rate->>'weekly_rate','') is null then raise exception 'Each rate needs a name, dates and weekly rate' using errcode = '22023'; end if;
      insert into public.yacht_rate_periods (yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate, active)
      values (target_yacht_id, trim(rate->>'name'), (rate->>'valid_from')::date, (rate->>'valid_to')::date, (rate->>'weekly_rate')::numeric,
        coalesce(nullif(upper(trim(rate->>'currency')), ''), 'EUR'), coalesce(nullif(rate->>'tax_rate','')::numeric, 0), coalesce((rate->>'active')::boolean, true));
      rate_count := rate_count + 1;
    end loop;
    for material in select value from jsonb_array_elements(coalesce(yacht->'sales_materials', '[]'::jsonb)) loop
      insert into public.yacht_sales_materials (yacht_id, material_type, label, public_url, approved_for_offers, active, sort_order)
      values (target_yacht_id, (material->>'type')::public.sales_material_type, trim(material->>'label'), trim(material->>'url'), false, coalesce((material->>'active')::boolean, true), coalesce((material->>'sort_order')::smallint, 0))
      on conflict (yacht_id, public_url) do update set label = excluded.label, active = excluded.active, sort_order = excluded.sort_order, updated_by = (select auth.uid()), updated_at = now();
      material_count := material_count + 1;
    end loop;
    if jsonb_typeof(yacht->'offer_template') = 'object' then
      insert into public.yacht_offer_templates (yacht_id, version_number, name, subject_template, body_template)
      values (target_yacht_id, (select coalesce(max(version_number), 0) + 1 from public.yacht_offer_templates template where template.yacht_id = target_yacht_id), trim(yacht->'offer_template'->>'name'), trim(yacht->'offer_template'->>'subject'), trim(yacht->'offer_template'->>'body'));
    end if;
  end loop;

  for communication in select value from jsonb_array_elements(coalesce(p_payload->'communication_templates', '[]'::jsonb)) loop
    perform public.create_communication_template_draft((communication->>'kind')::public.communication_template_kind, trim(communication->>'name'), trim(communication->>'subject'), trim(communication->>'body'));
    communication_count := communication_count + 1;
  end loop;

  if jsonb_typeof(p_payload->'workflow') = 'object' then
    workflow_name := nullif(trim(p_payload->'workflow'->>'name'), '');
    if workflow_name is null then raise exception 'Workflow needs a name' using errcode = '22023'; end if;
    select coalesce(max(version_number), 0) + 1 into next_version from public.task_templates where name = workflow_name;
    perform set_config('app.task_template_create_authorised', 'yes', true);
    insert into public.task_templates (version_number, name, description, status, is_default, created_by, updated_by)
    values (next_version, workflow_name, nullif(trim(p_payload->'workflow'->>'description'), ''), 'draft', false, (select auth.uid()), (select auth.uid())) returning id into template_record_id;
    perform set_config('app.task_template_create_authorised', '', true);
    perform set_config('app.task_template_step_authorised', 'yes', true);
    for step in select value from jsonb_array_elements(coalesce(p_payload->'workflow'->'steps', '[]'::jsonb)) loop
      insert into public.task_template_steps (template_id, step_code, title, description, priority, required, due_anchor, due_offset_days, due_date_required, reminder_lead_days, escalation_after_days, external_action, auto_complete_on_generation, sort_order, created_by, updated_by)
      values (template_record_id, trim(step->>'code'), trim(step->>'title'), nullif(trim(step->>'description'), ''), coalesce(nullif(step->>'priority','')::public.task_priority, 'normal'), coalesce((step->>'required')::boolean, true),
        coalesce(nullif(step->>'due_anchor','')::public.task_due_anchor, 'none'), coalesce(nullif(step->>'due_offset_days','')::integer, 0), coalesce((step->>'due_date_required')::boolean, false),
        nullif(step->>'reminder_lead_days','')::smallint, nullif(step->>'escalation_after_days','')::smallint, coalesce(nullif(step->>'external_action','')::public.task_external_action, 'none'), coalesce((step->>'auto_complete_on_generation')::boolean, false), coalesce(nullif(step->>'sort_order','')::integer, step_count * 10), (select auth.uid()), (select auth.uid())) returning id into step_id;
      for dependency_code in select jsonb_array_elements_text(coalesce(step->'after', '[]'::jsonb)) loop
        select dependency.id into dependency_step_id from public.task_template_steps dependency where dependency.template_id = template_record_id and dependency.step_code = upper(trim(dependency_code));
        if dependency_step_id is null then raise exception 'Workflow prerequisite % must appear before the dependent step', dependency_code using errcode = '22023'; end if;
        insert into public.task_template_step_dependencies (step_id, depends_on_step_id) values (step_id, dependency_step_id);
      end loop;
      step_count := step_count + 1;
    end loop;
    perform set_config('app.task_template_step_authorised', '', true);
  end if;

  insert into public.configuration_pack_imports (version, payload, summary, imported_by)
  values (1, p_payload, jsonb_build_object('yachts', yacht_count, 'rates', rate_count, 'sales_materials', material_count, 'communication_templates', communication_count, 'workflow_steps', step_count, 'workflow_template_id', template_record_id), (select auth.uid())) returning id into imported_id;
  insert into public.audit_events (action, actor_user_id, entity_id, entity_type, new_values, source)
  values ('insert', (select auth.uid()), imported_id, 'configuration_pack_import', (select summary from public.configuration_pack_imports where id = imported_id), 'application.configuration_pack');
  return (select summary || jsonb_build_object('import_id', imported_id) from public.configuration_pack_imports where id = imported_id);
exception when others then
  perform set_config('app.task_template_create_authorised', '', true);
  perform set_config('app.task_template_step_authorised', '', true);
  raise;
end;
$$;

revoke all on function public.preview_configuration_pack(jsonb), public.import_configuration_pack(jsonb) from public, anon;
grant execute on function public.preview_configuration_pack(jsonb), public.import_configuration_pack(jsonb) to authenticated;
