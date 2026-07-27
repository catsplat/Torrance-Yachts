begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'rehearsal_runs', 'rehearsal run table exists');
select has_table('public', 'rehearsal_run_records', 'rehearsal record mapping table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rehearsal_runs'::regclass),
  'rehearsal runs have RLS enabled'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('24000000-0000-4000-8000-000000000001', 'rehearsal.admin@example.test', '{"display_name":"Rehearsal Admin"}'::jsonb),
  ('24000000-0000-4000-8000-000000000002', 'rehearsal.staff@example.test', '{"display_name":"Rehearsal Staff"}'::jsonb);
update public.profiles set role = 'administrator'
where id = '24000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '24000000-0000-4000-8000-000000000002';
select throws_ok(
  $$ select public.create_rehearsal_run('Staff attempt') $$,
  '42501',
  'Administrator access is required',
  'staff cannot create a rehearsal run'
);

set local "request.jwt.claim.sub" = '24000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.create_rehearsal_run('Database isolation rehearsal') $$,
  'administrator can create a rehearsal run'
);
select results_eq(
  $$ select status from public.rehearsal_runs where label = 'Database isolation rehearsal' $$,
  array['active'],
  'new rehearsal run is active'
);
select lives_ok(
  $$
    select public.create_rehearsal_fixture_yacht(
      (select id from public.rehearsal_runs where label = 'Database isolation rehearsal')
    )
  $$,
  'administrator can create a fixture yacht for this run'
);
select results_eq(
  $$
    select count(*) from public.rehearsal_run_records
    where rehearsal_run_id = (select id from public.rehearsal_runs where label = 'Database isolation rehearsal')
      and entity_type = 'yacht'
  $$,
  array[1::bigint],
  'fixture yacht is explicitly tagged to its rehearsal run'
);
select results_eq(
  $$
    select count(*) from public.yachts
    where name like 'DEMO M/Y Asteria %'
  $$,
  array[1::bigint],
  'fixture yacht is created instead of reusing seeded operational data'
);
select lives_ok(
  $$
    select public.reset_rehearsal_run(
      (select id from public.rehearsal_runs where label = 'Database isolation rehearsal'),
      'The synthetic isolation test is complete.'
    )
  $$,
  'administrator can reset a supported rehearsal run atomically'
);
select results_eq(
  $$ select status from public.rehearsal_runs where label = 'Database isolation rehearsal' $$,
  array['reset'],
  'reset preserves run evidence without retaining active fictional records'
);
select results_eq(
  $$
    select count(*) from public.rehearsal_run_records
    where rehearsal_run_id = (select id from public.rehearsal_runs where label = 'Database isolation rehearsal')
  $$,
  array[0::bigint],
  'reset removes only the run mappings after fixture cleanup'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.rehearsal_runs $$,
  '42501',
  'permission denied for table rehearsal_runs',
  'anonymous requests cannot inspect rehearsal runs'
);

select * from finish();
rollback;
