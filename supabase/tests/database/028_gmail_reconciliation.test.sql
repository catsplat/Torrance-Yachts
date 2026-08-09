begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('public', 'gmail_ingestion_settings', 'Gmail ingestion settings exist');
select has_table('public', 'gmail_reconciliation_states', 'Gmail reconciliation cursor state exists');
select has_function('public', 'configure_gmail_ingestion', array['uuid', 'boolean'], 'mailbox selection command exists');
select has_function('public', 'get_active_gmail_ingestion_credentials', array[]::text[], 'trusted mailbox credential reader exists');

insert into auth.users (id, email, raw_user_meta_data) values
  ('28000000-0000-4000-8000-000000000001', 'gmail.admin@example.test', '{"display_name":"Gmail Administrator"}'),
  ('28000000-0000-4000-8000-000000000002', 'gmail.staff@example.test', '{"display_name":"Gmail Staff"}');
update public.profiles set role = 'administrator' where id = '28000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '28000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'gmail.staff@example.test', 'synthetic-client-id', 'synthetic-client-secret',
    'synthetic-refresh-token', array[
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ], 'Connect fictional intake mailbox'
  ) $$,
  'staff can connect their own fictional Gmail account'
);
select throws_ok(
  $$ select * from public.list_google_mailbox_candidates() $$,
  '42501', 'Administrator access is required',
  'staff cannot list other connected mailboxes'
);
select throws_ok(
  $$ select public.configure_gmail_ingestion('28000000-0000-4000-8000-000000000002', true) $$,
  '42501', 'Administrator access is required',
  'staff cannot select the operational inbox'
);

set local "request.jwt.claim.sub" = '28000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select account_email from public.list_google_mailbox_candidates()
     where user_id = '28000000-0000-4000-8000-000000000002' $$,
  array['gmail.staff@example.test'],
  'administrator sees only connected active mailbox candidates'
);
select lives_ok(
  $$ select public.configure_gmail_ingestion('28000000-0000-4000-8000-000000000002', true) $$,
  'administrator can select the connected inbox'
);
select results_eq(
  $$ select ingestion_enabled from public.list_google_mailbox_candidates()
     where user_id = '28000000-0000-4000-8000-000000000002' $$,
  array[true],
  'selected mailbox is visibly enabled'
);
select throws_ok(
  $$ select * from public.get_active_gmail_ingestion_credentials() $$,
  '42501', 'permission denied for function get_active_gmail_ingestion_credentials',
  'browser users cannot decrypt ingestion credentials'
);

reset role;
set local role service_role;
select results_eq(
  $$ select account_email from public.get_active_gmail_ingestion_credentials() $$,
  array['gmail.staff@example.test'],
  'trusted automation receives the selected account'
);
select lives_ok(
  $$ select public.complete_gmail_reconciliation(
    '28000000-0000-4000-8000-000000000002', '123456789', '2026-08-09T12:00:00Z'
  ) $$,
  'trusted automation records a successful cursor'
);
select results_eq(
  $$ select last_history_id from public.gmail_reconciliation_states
     where user_id = '28000000-0000-4000-8000-000000000002' $$,
  array['123456789'],
  'history cursor is durable'
);
select lives_ok(
  $$ select public.fail_gmail_reconciliation(
    '28000000-0000-4000-8000-000000000002', 'Synthetic provider outage', '2026-08-09T12:05:00Z'
  ) $$,
  'trusted automation records a bounded failure'
);
select results_eq(
  $$ select last_error from public.gmail_reconciliation_states
     where user_id = '28000000-0000-4000-8000-000000000002' $$,
  array['Synthetic provider outage'],
  'failure is visible without exposing credentials'
);

select * from finish();
rollback;
