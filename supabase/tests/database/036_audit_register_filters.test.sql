begin;
select plan(8);

select has_function('public','list_audit_event_page',array['integer','timestamp with time zone','bigint','uuid','text','text','text','timestamp with time zone','timestamp with time zone'],'audit page supports complete filters');
select has_function('public','count_audit_events',array['uuid','text','text','text','timestamp with time zone','timestamp with time zone'],'audit count supports complete filters');

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000091','audit-admin@example.test','{"display_name":"Audit Administrator"}'::jsonb),
  ('10000000-0000-0000-0000-000000000092','audit-staff@example.test','{"display_name":"Audit Staff"}'::jsonb);
update public.profiles set role = 'administrator', active = true, access_approved_at = now()
where id = '10000000-0000-0000-0000-000000000091';
update public.profiles set role = 'staff', active = true, access_approved_at = now()
where id = '10000000-0000-0000-0000-000000000092';

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000091',true);
select lives_ok($$select * from public.list_audit_event_page(p_source := 'database', p_from := now() - interval '1 year', p_to := now() + interval '1 day')$$,'administrator can filter audit history by source and date');
select lives_ok($$select public.count_audit_events(p_source := 'database')$$,'administrator can count source-filtered audit history');
select throws_ok($$select public.count_audit_events(p_from := now(), p_to := now() - interval '1 day')$$,'22023','Audit date range is invalid','invalid date ranges are rejected');

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000092',true);
select throws_ok($$select * from public.list_audit_event_page()$$,'42501','Administrator access is required','staff cannot list the global audit log');
select throws_ok($$select public.count_audit_events()$$,'42501','Administrator access is required','staff cannot count the global audit log');

reset role;
select ok(to_regclass('public.audit_events_source_created_idx') is not null,'source and cursor index exists');
select * from finish();
rollback;
