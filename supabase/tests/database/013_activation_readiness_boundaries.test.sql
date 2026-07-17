begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function('public', 'get_initial_setup_profile_count', array[]::text[], 'bootstrap count boundary exists');
select has_function('public', 'complete_initial_administrator', array['uuid','text','text','text'], 'bootstrap completion boundary exists');
select has_function('public', 'get_activation_readiness_snapshot', array[]::text[], 'redacted activation snapshot exists');

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '22000000-0000-4000-8000-000000000002',
    'existing.setup@example.test',
    '{"display_name":"Existing Setup User"}'::jsonb
  ),
  (
    '22000000-0000-4000-8000-000000000001',
    'pending.setup@example.test',
    '{"display_name":"Pending Setup","_initial_setup_pending":"true"}'::jsonb
  );

select results_eq(
  $$ select active from public.profiles where id = '22000000-0000-4000-8000-000000000001' $$,
  array[false],
  'bootstrap metadata creates an inactive profile atomically'
);

set local role anon;
select throws_ok($$ select public.get_initial_setup_profile_count() $$, '42501', 'permission denied for function get_initial_setup_profile_count', 'anonymous cannot inspect bootstrap state');
select throws_ok($$ select public.get_activation_readiness_snapshot() $$, '42501', 'permission denied for function get_activation_readiness_snapshot', 'anonymous cannot inspect activation state');
select throws_ok($$ select public.complete_initial_administrator('22000000-0000-4000-8000-000000000001','Pending Setup','','') $$, '42501', 'permission denied for function complete_initial_administrator', 'anonymous cannot complete bootstrap');

set local role authenticated;
select throws_ok($$ select public.get_initial_setup_profile_count() $$, '42501', 'permission denied for function get_initial_setup_profile_count', 'authenticated users cannot inspect bootstrap state directly');
select throws_ok($$ select public.get_activation_readiness_snapshot() $$, '42501', 'permission denied for function get_activation_readiness_snapshot', 'authenticated users cannot invoke trusted activation snapshot');
select throws_ok($$ select public.complete_initial_administrator('22000000-0000-4000-8000-000000000001','Pending Setup','','') $$, '42501', 'permission denied for function complete_initial_administrator', 'authenticated users cannot complete bootstrap');

set local role service_role;
select ok(public.get_initial_setup_profile_count() >= 1, 'service role can read only the bootstrap count');
select ok(public.get_activation_readiness_snapshot() ? 'connections', 'service role receives redacted connection state');
select is(
  public.complete_initial_administrator(
    '22000000-0000-4000-8000-000000000001', 'Pending Setup', '', ''
  ),
  false,
  'bootstrap refuses completion when another profile already exists'
);
reset role;
select results_eq(
  $$ select active from public.profiles where id = '22000000-0000-4000-8000-000000000001' $$,
  array[false],
  'refused bootstrap remains inactive'
);
select results_eq(
  $$ select count(*) from public.workflow_events where aggregate_id = '22000000-0000-4000-8000-000000000001' $$,
  array[0::bigint],
  'refused bootstrap emits no success event'
);

select * from finish();
rollback;
