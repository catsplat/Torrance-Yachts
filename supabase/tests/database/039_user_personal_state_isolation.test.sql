begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select has_table('public', 'user_ui_preferences', 'personal UI preferences are stored server-side');
select has_function('public', 'update_my_ui_theme', array['text'], 'self-service theme command exists');
select has_function('public', 'list_active_staff_directory', array[]::text[], 'safe staff directory exists');
select has_function('public', 'list_internal_user_administration_records', array[]::text[], 'administrator profile directory exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_ui_preferences'::regclass),
  'personal UI preferences have RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'raw profile writes are not available to ordinary authenticated clients'
);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  (
    '39000000-0000-4000-8000-000000000001',
    'personal.state.a@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Personal State A"}'::jsonb
  ),
  (
    '39000000-0000-4000-8000-000000000002',
    'personal.state.b@example.test',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Personal State B"}'::jsonb
  );

update public.profiles
set phone = case id
  when '39000000-0000-4000-8000-000000000001'::uuid then '+44000000001'
  else '+44000000002'
end,
telegram_chat_id = case id
  when '39000000-0000-4000-8000-000000000001'::uuid then 'state-a-chat'
  else 'state-b-chat'
end
where id in (
  '39000000-0000-4000-8000-000000000001',
  '39000000-0000-4000-8000-000000000002'
);

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000000';
select throws_ok(
  $$ select count(*) from public.user_ui_preferences $$,
  '42501',
  'permission denied for table user_ui_preferences',
  'anonymous clients cannot read personal UI preferences'
);
select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  'permission denied for table profiles',
  'anonymous clients cannot read private profiles'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '39000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select results_eq(
  $$ select count(*) from public.user_ui_preferences $$,
  array[1::bigint],
  'user A sees only one personal UI preference row'
);
select lives_ok(
  $$ select public.update_my_ui_theme('dark') $$,
  'user A can persist a dark theme through the approved command'
);
select results_eq(
  $$ select theme from public.user_ui_preferences $$,
  array['dark'],
  'user A gets the saved dark theme back'
);
select throws_ok(
  $$ update public.user_ui_preferences set theme = 'light' $$,
  '42501',
  'permission denied for table user_ui_preferences',
  'user A cannot bypass the personal UI command'
);
select results_eq(
  $$ select count(*) from public.profiles $$,
  array[1::bigint],
  'user A can read only their own private profile'
);
select results_eq(
  $$ select count(*) from public.profiles where phone = '+44000000002' $$,
  array[0::bigint],
  'user A cannot discover user B phone details'
);
select results_eq(
  $$ select count(*) from public.list_active_staff_directory() $$,
  array[2::bigint],
  'user A can still use the safe shared staff directory'
);
select lives_ok(
  $$ select public.update_my_alert_preferences(
    'personal.state.a.alerts@example.test', '+44000000001', 'state-a-chat',
    true, false, true, true, true, true, true, true, true, true, true, true,
    'Configure personal state A notifications'
  ) $$,
  'user A can persist distinct personal notification preferences'
);
select results_eq(
  $$ select notification_email from public.user_notification_preferences $$,
  array['personal.state.a.alerts@example.test'],
  'user A can read their own notification address'
);
select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'personal.state.a@example.test', 'synthetic-client-id-a', 'synthetic-client-secret-a',
    'synthetic-refresh-token-a', array['https://www.googleapis.com/auth/gmail.readonly'],
    'Connect synthetic mailbox for personal-state test'
  ) $$,
  'user A can save their own encrypted Gmail connection'
);
select results_eq(
  $$ select account_email from public.get_my_oauth_connections() $$,
  array['personal.state.a@example.test'],
  'user A sees only their Gmail connection status'
);
select lives_ok($$ select public.start_tutorial() $$, 'user A can start their own tutorial');
select results_eq(
  $$ select count(*) from public.tutorial_sessions $$,
  array[1::bigint],
  'user A sees only their tutorial state'
);
select lives_ok(
  $$ select public.create_notification(
    'personal-state:a:notification', 'personal_state_test', 'task',
    '39000000-0000-4000-8000-000000000099',
    '39000000-0000-4000-8000-000000000001', null,
    'in_app', 'normal', 'User A private notification', 'Private A receipt.',
    '/notifications', false
  ) $$,
  'user A can receive a private in-app notification'
);
select results_eq(
  $$ select public.count_my_notifications(false) $$,
  array[1::bigint],
  'user A unread count includes their own notification'
);

set local "request.jwt.claim.sub" = '39000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select theme from public.user_ui_preferences $$,
  array['light'],
  'user B receives their own default theme rather than user A dark theme'
);
select results_eq(
  $$ select count(*) from public.profiles $$,
  array[1::bigint],
  'user B can read only their own private profile'
);
select results_eq(
  $$ select count(*) from public.profiles where phone = '+44000000001' $$,
  array[0::bigint],
  'user B cannot discover user A phone details'
);
select lives_ok(
  $$ select public.update_my_ui_theme('light') $$,
  'user B can save a different theme without naming user A'
);
select results_eq(
  $$ select notification_email from public.user_notification_preferences $$,
  array['personal.state.b@example.test'],
  'user B gets their own notification defaults, not user A preferences'
);
select results_eq(
  $$ select count(*) from public.get_my_oauth_connections() $$,
  array[0::bigint],
  'user B cannot see or use user A Gmail connection'
);
select results_eq(
  $$ select public.count_my_notifications(false) $$,
  array[0::bigint],
  'user B unread count cannot include user A private notification'
);
select lives_ok($$ select public.start_tutorial() $$, 'user B can start a separate tutorial');
select results_eq(
  $$ select count(*) from public.tutorial_sessions $$,
  array[1::bigint],
  'user B sees only their own tutorial state'
);

set local "request.jwt.claim.sub" = '39000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select theme from public.user_ui_preferences $$,
  array['dark'],
  'user A signing in again restores their dark theme'
);
select results_eq(
  $$ select notification_email from public.user_notification_preferences $$,
  array['personal.state.a.alerts@example.test'],
  'user A signing in again restores their notification preferences'
);
select results_eq(
  $$ select account_email from public.get_my_oauth_connections() $$,
  array['personal.state.a@example.test'],
  'user A signing in again restores only their encrypted Gmail connection metadata'
);
select results_eq(
  $$ select public.count_my_notifications(false) $$,
  array[1::bigint],
  'user A signing in again restores their own unread notification state'
);

select * from finish();
rollback;
