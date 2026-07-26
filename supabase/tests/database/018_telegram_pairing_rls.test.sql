begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_table('public', 'telegram_pairing_requests', 'Telegram pairing requests exist');
select has_function('public', 'create_my_telegram_pairing_request', array['text'], 'staff pairing request command exists');
select has_function('public', 'complete_telegram_pairing', array['text','text'], 'trusted webhook completion command exists');
select ok((select relrowsecurity from pg_class where oid = 'public.telegram_pairing_requests'::regclass), 'Telegram pairing requests have RLS');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('28000000-0000-4000-8000-000000000001', 'telegram.admin@example.test', '{"display_name":"Telegram Administrator"}'),
  ('28000000-0000-4000-8000-000000000002', 'telegram.staff@example.test', '{"display_name":"Telegram Staff"}');
update public.profiles set role = 'administrator' where id = '28000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '28000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role" = 'authenticated';
select lives_ok(
  $$ select public.create_my_telegram_pairing_request(repeat('a', 64)) $$,
  'staff can create a private pairing request'
);
select throws_ok(
  $$ select count(*) from public.telegram_pairing_requests $$,
  '42501',
  'permission denied for table telegram_pairing_requests',
  'staff cannot inspect pairing records or hashes'
);
select throws_ok(
  $$ select public.complete_telegram_pairing(repeat('a', 64), '280000002') $$,
  '42501',
  'permission denied for function complete_telegram_pairing',
  'staff cannot complete a pairing by calling the webhook command'
);

reset role;
set local role service_role;
select results_eq(
  $$ select public.complete_telegram_pairing(repeat('a', 64), '280000002') $$,
  array['connected'],
  'trusted webhook completion connects the pending staff request'
);
reset role;
select results_eq(
  $$ select telegram_chat_id from public.profiles where id = '28000000-0000-4000-8000-000000000002' $$,
  array['280000002'],
  'webhook pairing writes only the intended staff destination'
);
select results_eq(
  $$ select telegram_enabled::text from public.user_notification_preferences where user_id = '28000000-0000-4000-8000-000000000002' $$,
  array['true'],
  'webhook pairing enables the connected staff Telegram route'
);
set local role service_role;
select results_eq(
  $$ select public.complete_telegram_pairing(repeat('a', 64), '999999999') $$,
  array['ignored'],
  'replaying a consumed deep-link token is idempotently ignored'
);
reset role;
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'TelegramPaired' and aggregate_id = '28000000-0000-4000-8000-000000000002' $$,
  array[1::bigint],
  'a successful pairing is recorded exactly once'
);
select throws_ok(
  $$ select public.complete_telegram_pairing('not-a-hash', '280000002') $$,
  '22023',
  'Invalid Telegram pairing payload',
  'invalid webhook payloads are rejected'
);

select * from finish();
rollback;
