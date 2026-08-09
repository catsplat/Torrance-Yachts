begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

select has_table('public', 'google_workspace_dispatch_settings', 'shared Google dispatch settings exist');
select has_function('public', 'configure_google_workspace_dispatch', array['uuid', 'boolean'], 'Google dispatch selection command exists');
select has_function('public', 'get_active_google_workspace_dispatch_credentials', array[]::text[], 'trusted Google dispatch credential reader exists');

insert into auth.users (id, email, raw_user_meta_data) values
  ('29000000-0000-4000-8000-000000000001', 'dispatch.admin@example.test', '{"display_name":"Dispatch Administrator"}'),
  ('29000000-0000-4000-8000-000000000002', 'dispatch.staff@example.test', '{"display_name":"Dispatch Staff"}');
update public.profiles set role = 'administrator' where id = '29000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '29000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'dispatch.staff@example.test', 'synthetic-client-id', 'synthetic-client-secret',
    'synthetic-refresh-token', array['https://www.googleapis.com/auth/spreadsheets'],
    'Connect fictional account with incomplete scopes'
  ) $$,
  'staff can connect their own fictional Google account'
);
select throws_ok(
  $$ select * from public.list_google_workspace_dispatch_candidates() $$,
  '42501', 'Administrator access is required',
  'staff cannot list shared Google account candidates'
);
select throws_ok(
  $$ select public.configure_google_workspace_dispatch('29000000-0000-4000-8000-000000000002', true) $$,
  '42501', 'Administrator access is required',
  'staff cannot select the shared Google account'
);

set local "request.jwt.claim.sub" = '29000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select account_email from public.list_google_workspace_dispatch_candidates()
     where user_id = '29000000-0000-4000-8000-000000000002' $$,
  array['dispatch.staff@example.test'],
  'administrator sees connected staff accounts'
);
select throws_ok(
  $$ select public.configure_google_workspace_dispatch('29000000-0000-4000-8000-000000000002', true) $$,
  '23514',
  'Reconnect an active staff Google account with Calendar, Drive and Sheets access',
  'dispatch cannot be enabled without every required scope'
);

set local "request.jwt.claim.sub" = '29000000-0000-4000-8000-000000000002';
select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'dispatch.staff@example.test', 'synthetic-client-id', 'synthetic-client-secret',
    'synthetic-refresh-token', array[
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ], 'Approve fictional shared service scopes'
  ) $$,
  'staff can approve the required scopes through their own connection'
);

set local "request.jwt.claim.sub" = '29000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.configure_google_workspace_dispatch('29000000-0000-4000-8000-000000000002', true) $$,
  'administrator can select the fully authorised account'
);
select results_eq(
  $$ select dispatch_enabled from public.list_google_workspace_dispatch_candidates()
     where user_id = '29000000-0000-4000-8000-000000000002' $$,
  array[true],
  'selected shared account is visibly enabled'
);
select throws_ok(
  $$ select * from public.get_active_google_workspace_dispatch_credentials() $$,
  '42501', 'permission denied for function get_active_google_workspace_dispatch_credentials',
  'browser users cannot decrypt shared provider credentials'
);
select throws_ok(
  $$ update public.google_workspace_dispatch_settings set enabled = false $$,
  '42501', 'permission denied for table google_workspace_dispatch_settings',
  'browser roles cannot mutate shared settings directly'
);

reset role;
set local role service_role;
select results_eq(
  $$ select account_email from public.get_active_google_workspace_dispatch_credentials() $$,
  array['dispatch.staff@example.test'],
  'trusted automation receives only the selected account'
);
select ok(
  (select scopes @> array[
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ]::text[] from public.get_active_google_workspace_dispatch_credentials()),
  'trusted automation receives the reviewed scopes'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '29000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.configure_google_workspace_dispatch('29000000-0000-4000-8000-000000000002', false) $$,
  'administrator can pause shared Google delivery'
);
select results_eq(
  $$ select count(*)::integer from public.list_google_workspace_dispatch_candidates()
     where dispatch_enabled $$,
  array[0],
  'pausing shared Google delivery clears the enabled state'
);

select lives_ok(
  $$ select public.update_integration_connection(
    'google_sheets', true, 'synthetic-sheet', 'Fictional reporting target'
  ) $$,
  'administrator can enable a fictional reporting target'
);
select lives_ok(
  $$ select public.queue_operations_sheet_snapshot() $$,
  'administrator can queue the immutable reporting snapshot'
);
select ok(
  (select
    not exists (select 1 from jsonb_array_elements(payload->'enquiries') row where not row ? 'id')
    and not exists (select 1 from jsonb_array_elements(payload->'bookings') row where not row ? 'id')
    and not exists (select 1 from jsonb_array_elements(payload->'captains') row where not row ? 'id')
   from public.integration_snapshots
   where snapshot_type = 'operations_workbook'
   order by requested_at desc limit 1),
  'every reporting row carries an immutable internal identifier'
);
select ok(
  (select payload_sha256 = encode(
      extensions.digest((payload - 'generated_at')::text, 'sha256'), 'hex'
    )
   from public.integration_snapshots
   where snapshot_type = 'operations_workbook'
   order by requested_at desc limit 1),
  'request time is excluded from the snapshot idempotency hash'
);

select * from finish();
rollback;
