begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

select has_table(
  'public',
  'user_notification_preferences',
  'personal notification preferences exist'
);
select has_table(
  'public',
  'user_oauth_connections',
  'personal OAuth connection metadata exists'
);
select has_column('public', 'notifications', 'read_at', 'notifications track read state');
select has_column(
  'public',
  'integration_deliveries',
  'credential_user_id',
  'deliveries identify the credential owner'
);
select has_function(
  'public',
  'update_my_alert_preferences',
  array[
    'text','text','text','boolean','boolean','boolean','boolean','boolean',
    'boolean','boolean','boolean','boolean','boolean','boolean','boolean','text'
  ],
  'self-service alert preference command exists'
);
select has_function(
  'public',
  'save_my_gmail_oauth_credentials',
  array['text','text','text','text','text[]','text'],
  'encrypted Gmail OAuth command exists'
);
select has_function(
  'public',
  'claim_internal_alert_deliveries',
  array['text','integer'],
  'internal alert worker claim exists'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.user_notification_preferences'::regclass),
  'personal notification preferences have RLS'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.user_oauth_connections'::regclass),
  'personal OAuth metadata has RLS'
);
select ok(
  'gmail_send_internal' = any(enum_range(null::public.integration_operation)::text[]),
  'internal Gmail send operation is distinct from draft creation'
);
select ok(
  'email_alert' = any(enum_range(null::public.notification_channel)::text[]),
  'internal email alert channel exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '21000000-0000-4000-8000-000000000001',
    'alerts.admin@example.test',
    '{"display_name":"Alerts Administrator"}'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    'alerts.staff@example.test',
    '{"display_name":"Alerts Staff"}'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    'alerts.other@example.test',
    '{"display_name":"Other Alerts Staff"}'
  );
update public.profiles
set role = 'administrator'
where id = '21000000-0000-4000-8000-000000000001';

select results_eq(
  $$ select count(*) from public.user_notification_preferences
     where user_id::text like '21000000-%' $$,
  array[3::bigint],
  'new internal users receive personal alert defaults'
);
select results_eq(
  $$ select count(*) from public.user_notification_preferences
     where user_id::text like '21000000-%' and in_app_enabled $$,
  array[3::bigint],
  'safe in-app alerts are enabled by default'
);

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000000';
select throws_ok(
  $$ select count(*) from public.user_notification_preferences $$,
  '42501',
  'permission denied for table user_notification_preferences',
  'anonymous users cannot read personal preferences'
);
select throws_ok(
  $$ select count(*) from public.user_oauth_connections $$,
  '42501',
  'permission denied for table user_oauth_connections',
  'anonymous users cannot read OAuth metadata'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.user_notification_preferences $$,
  array[1::bigint],
  'staff see only their personal alert preferences'
);
select throws_ok(
  $$ update public.user_notification_preferences set email_enabled = true $$,
  '42501',
  'permission denied for table user_notification_preferences',
  'staff cannot bypass the self-service preference command'
);
select lives_ok(
  $$ select public.update_my_alert_preferences(
    'alerts.staff@example.test',
    '+44 20 7000 0002',
    '210000002',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    'Configure my operational alerts'
  ) $$,
  'staff can configure their own alert routes'
);
select results_eq(
  $$ select telegram_chat_id from public.profiles
     where id = '21000000-0000-4000-8000-000000000002' $$,
  array['210000002'],
  'Telegram destination is stored on the staff profile'
);
select results_eq(
  $$ select notification_email from public.user_notification_preferences $$,
  array['alerts.staff@example.test'],
  'personal alert email is stored in preferences'
);
select throws_ok(
  $$ select public.update_my_alert_preferences(
    'alerts.staff@example.test',
    '',
    '',
    false,
    false,
    false,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    'Disable every route'
  ) $$,
  '23514',
  null,
  'the database prevents disabling every alert route'
);
select throws_ok(
  $$ select count(*) from public.user_oauth_connections $$,
  '42501',
  'permission denied for table user_oauth_connections',
  'raw OAuth metadata table is not directly exposed to staff'
);
select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'alerts.staff@example.test',
    'synthetic-client-id',
    'synthetic-client-secret',
    'synthetic-refresh-token',
    array['https://www.googleapis.com/auth/gmail.send'],
    'Connect synthetic staff mailbox'
  ) $$,
  'staff can store their own complete Gmail OAuth credential set'
);
select results_eq(
  $$ select status::text from public.get_my_oauth_connections() $$,
  array['connected'],
  'staff can read only redacted connection status'
);
select results_eq(
  $$ select account_email from public.get_my_oauth_connections() $$,
  array['alerts.staff@example.test'],
  'connection status identifies the configured mailbox'
);

reset role;
select results_eq(
  $$ select count(*) from vault.secrets
     where name like 'torrance:21000000-0000-4000-8000-000000000002:gmail:%' $$,
  array[3::bigint],
  'three Gmail credential values are encrypted in Vault'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.update_integration_connection(
    'telegram',
    true,
    'company-bot',
    'Synthetic provider enablement'
  ) $$,
  'administrator can enable Telegram'
);
select lives_ok(
  $$ select public.update_integration_connection(
    'gmail',
    true,
    'staff-oauth',
    'Synthetic provider enablement'
  ) $$,
  'administrator can enable Gmail'
);

set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
reset role;
select results_eq(
  $$ select channel::text
     from public.personal_notification_channels(
       '21000000-0000-4000-8000-000000000002'
     ) as channel
     order by channel::text $$,
  array['email_alert','in_app','telegram'],
  'configured staff receive all enabled personal channels'
);
set local role authenticated;
set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.create_notification(
    'personal:email:alert:test',
    'test_internal_alert',
    'task',
    '21000000-0000-4000-8000-000000000099',
    '21000000-0000-4000-8000-000000000002',
    null,
    'email_alert',
    'normal',
    'Synthetic internal email alert',
    'Synthetic AI summary for a staff-only alert.',
    '/notifications',
    false
  ) $$,
  'safe internal email alerts can be queued automatically'
);
select results_eq(
  $$ select operation::text from public.integration_deliveries
     where idempotency_key like 'notification:%'
       and source_id = (
         select id from public.notifications
         where idempotency_key = 'personal:email:alert:test'
       ) $$,
  array['gmail_send_internal'],
  'email alert uses internal send rather than external draft'
);
select results_eq(
  $$ select credential_user_id from public.integration_deliveries
     where source_id = (
       select id from public.notifications
       where idempotency_key = 'personal:email:alert:test'
     ) $$,
  array['21000000-0000-4000-8000-000000000002'::uuid],
  'delivery records the staff credential owner'
);
select lives_ok(
  $$ select public.create_notification(
    'personal:external:draft:test',
    'test_external_draft',
    'task',
    '21000000-0000-4000-8000-000000000097',
    null,
    (select id from public.contacts where email is not null order by created_at limit 1),
    'email_draft',
    'normal',
    'Synthetic captain draft',
    'Synthetic reviewed external draft body.',
    '/notifications',
    true
  ) $$,
  'external email remains held for approval'
);
select lives_ok(
  $$ select public.review_notification(
    (select id from public.notifications
     where idempotency_key = 'personal:external:draft:test'),
    true,
    'Recipient and wording reviewed'
  ) $$,
  'staff can approve an external Gmail draft without sending it'
);
select results_eq(
  $$ select operation::text || ':' || credential_user_id::text
     from public.integration_deliveries
     where source_id = (
       select id from public.notifications
       where idempotency_key = 'personal:external:draft:test'
     ) $$,
  array['gmail_create_draft:21000000-0000-4000-8000-000000000002'],
  'approved external drafts use the reviewing staff Gmail credentials'
);
select lives_ok(
  $$ select public.mark_notification_read(
    (select id from public.notifications
     where idempotency_key = 'personal:email:alert:test')
  ) $$,
  'staff can mark their own notification read'
);
select ok(
  (select read_at is not null from public.notifications
   where idempotency_key = 'personal:email:alert:test'),
  'read state is recorded'
);

reset role;
select set_config('app.phase11_command', 'yes', true);
insert into public.notifications (
  idempotency_key,
  notification_type,
  source_type,
  source_id,
  recipient_user_id,
  channel,
  priority,
  title,
  body,
  requires_approval,
  status,
  approved_by,
  approved_at,
  approval_reason
) values (
  'personal:other:user:test',
  'test_internal_alert',
  'task',
  '21000000-0000-4000-8000-000000000098',
  '21000000-0000-4000-8000-000000000003',
  'in_app',
  'normal',
  'Other staff alert',
  'Synthetic other-user alert.',
  false,
  'delivered',
  '21000000-0000-4000-8000-000000000003',
  now(),
  'Synthetic test'
);
select set_config('app.phase11_command', '', true);

set local role authenticated;
set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select results_eq(
  $$ select count(*) from public.notifications
     where idempotency_key = 'personal:other:user:test' $$,
  array[0::bigint],
  'staff cannot read another staff member notification'
);
select throws_ok(
  $$ select public.mark_notification_read(
    (select id from public.notifications
     where idempotency_key = 'personal:other:user:test')
  ) $$,
  'P0002',
  'Notification not found',
  'staff cannot mark another user notification read'
);

set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.notifications
     where idempotency_key = 'personal:other:user:test' $$,
  array[0::bigint],
  'administrators cannot read another user private notification receipt'
);

set local "request.jwt.claim.sub" = '21000000-0000-4000-8000-000000000002';
select lives_ok(
  $$ select public.disconnect_my_gmail_oauth(
    'Disconnect synthetic mailbox after test'
  ) $$,
  'staff can disconnect their own Gmail OAuth credentials'
);
select results_eq(
  $$ select status::text from public.get_my_oauth_connections() $$,
  array['disconnected'],
  'disconnected OAuth status remains auditable'
);

reset role;
select results_eq(
  $$ select count(*) from vault.secrets
     where name like 'torrance:21000000-0000-4000-8000-000000000002:gmail:%' $$,
  array[0::bigint],
  'disconnect removes credential material from Vault'
);
select results_eq(
  $$ select count(*) from public.workflow_events
     where aggregate_id = '21000000-0000-4000-8000-000000000002'
       and event_type in (
         'UserAlertPreferencesUpdated',
         'UserOAuthCredentialsUpdated',
         'UserOAuthDisconnected'
       ) $$,
  array[3::bigint],
  'personal alert and credential changes are audited'
);

select * from finish();
rollback;
