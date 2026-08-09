begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_function(
  'public',
  'approve_internal_user_invitation',
  array['uuid', 'uuid'],
  'service-only invitation approval command exists'
);

select is(
  public.should_approve_new_internal_profile(now(), false, false),
  true,
  'an administrator invitation is approved'
);
select is(
  public.should_approve_new_internal_profile(null, false, false),
  false,
  'an unsolicited provider identity is not approved'
);
select is(
  public.should_approve_new_internal_profile(null, false, true),
  true,
  'a trusted direct database fixture is approved'
);
select is(
  public.should_approve_new_internal_profile(now(), true, false),
  false,
  'the one-time setup account stays blocked until bootstrap completes'
);

insert into auth.users (
  id, email, invited_at, raw_app_meta_data, raw_user_meta_data
) values (
  '2f000000-0000-4000-8000-000000000001',
  'invited.oauth@example.test',
  now(),
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"display_name":"Invited OAuth User"}'::jsonb
);

insert into auth.users (
  id, email, raw_app_meta_data, raw_user_meta_data
) values (
  '2f000000-0000-4000-8000-000000000002',
  'unsolicited.oauth@example.test',
  '{"provider":"google","providers":["google"]}'::jsonb,
  '{"display_name":"Unsolicited OAuth User"}'::jsonb
);

-- Direct test fixtures are inserted by the trusted database role. Reproduce
-- the result of the provider decision above for the uninvited identity before
-- exercising the application authorization boundary.
update public.profiles
set active = false,
    access_approved_at = null,
    access_approved_by = null
where id = '2f000000-0000-4000-8000-000000000002';

select results_eq(
  $$ select active from public.profiles where id = '2f000000-0000-4000-8000-000000000001' $$,
  array[true],
  'an administrator invitation creates an active internal profile'
);
select results_eq(
  $$ select access_approved_at is not null from public.profiles where id = '2f000000-0000-4000-8000-000000000001' $$,
  array[true],
  'an administrator invitation records explicit access approval'
);
select results_eq(
  $$ select active from public.profiles where id = '2f000000-0000-4000-8000-000000000002' $$,
  array[false],
  'an unsolicited OAuth identity remains inactive'
);
select results_eq(
  $$ select access_approved_at is null from public.profiles where id = '2f000000-0000-4000-8000-000000000002' $$,
  array[true],
  'an unsolicited OAuth identity has no access approval'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '2f000000-0000-4000-8000-000000000002', true);
select is(public.is_active_staff(), false, 'an unsolicited OAuth identity is not internal staff');
select results_eq(
  $$ select count(*) from public.yachts $$,
  array[0::bigint],
  'RLS hides operational yachts from an unsolicited OAuth identity'
);
select results_eq(
  $$ select count(*) from public.enquiries $$,
  array[0::bigint],
  'RLS hides enquiries from an unsolicited OAuth identity'
);

select throws_ok(
  $$ select public.approve_internal_user_invitation(
    '2f000000-0000-4000-8000-000000000002',
    '2f000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  'permission denied for function approve_internal_user_invitation',
  'an authenticated user cannot self-approve'
);

select set_config('request.jwt.claim.sub', '2f000000-0000-4000-8000-000000000001', true);
select is(public.is_active_staff(), true, 'the invited OAuth identity is internal staff');
select ok((select count(*) from public.yachts) > 0, 'the invited staff account can read operational yachts');
reset role;

update public.profiles
set role = 'administrator'
where id = '2f000000-0000-4000-8000-000000000001';

set local role service_role;
select is(
  public.approve_internal_user_invitation(
    '2f000000-0000-4000-8000-000000000002',
    '2f000000-0000-4000-8000-000000000001'
  ),
  true,
  'the trusted invitation boundary accepts an approved administrator'
);
reset role;

select results_eq(
  $$ select active from public.profiles where id = '2f000000-0000-4000-8000-000000000002' $$,
  array[true],
  'the invitation command activates the selected account'
);
select results_eq(
  $$ select access_approved_by from public.profiles where id = '2f000000-0000-4000-8000-000000000002' $$,
  array['2f000000-0000-4000-8000-000000000001'::uuid],
  'the invitation command attributes approval to the administrator'
);
select results_eq(
  $$ select count(*) from public.audit_events where entity_id = '2f000000-0000-4000-8000-000000000002' and source = 'internal_user_invitation' $$,
  array[1::bigint],
  'the invitation command records an audit event'
);
select results_eq(
  $$ select count(*) from public.workflow_events where aggregate_id = '2f000000-0000-4000-8000-000000000002' and event_type = 'InternalUserInvitationApproved' $$,
  array[1::bigint],
  'the invitation command records workflow evidence'
);

select lives_ok(
  $$ update public.profiles set active = false where id = '2f000000-0000-4000-8000-000000000001' $$,
  'a trusted database administrator can deactivate an invited account'
);
select results_eq(
  $$ select access_approved_at is not null from public.profiles where id = '2f000000-0000-4000-8000-000000000001' $$,
  array[true],
  'deactivation preserves the approval history'
);
select results_eq(
  $$ select active from public.profiles where id = '2f000000-0000-4000-8000-000000000001' $$,
  array[false],
  'the deactivated account is no longer active'
);

select * from finish();
rollback;
