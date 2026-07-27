begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select has_function(
  'public',
  'claim_integration_deliveries_for_operations',
  array['text','integer','public.integration_operation[]'],
  'capability-scoped delivery claim exists'
);

select set_config('app.phase11_command', 'yes', true);
insert into public.integration_deliveries (
  provider, operation, idempotency_key, source_type, source_id, payload
) values
  ('gmail', 'gmail_mark_read', 'test:scoped:gmail', 'email_provider_action', gen_random_uuid(), '{"provider_message_id":"synthetic-message"}'),
  ('google_calendar', 'calendar_upsert', 'test:scoped:calendar', 'calendar_event', gen_random_uuid(), '{"event_id":"synthetic-event"}');
select set_config('app.phase11_command', '', true);

set local role authenticated;
select throws_ok(
  $$ select * from public.claim_integration_deliveries_for_operations(
    'untrusted-worker', 10, array['gmail_mark_read'::public.integration_operation]
  ) $$,
  '42501',
  'permission denied for function claim_integration_deliveries_for_operations',
  'authenticated staff cannot lease provider work'
);

reset role;
set local role service_role;
select results_eq(
  $$ select operation::text from public.claim_integration_deliveries_for_operations(
    'gmail-actions-worker', 10, array['gmail_mark_read'::public.integration_operation]
  ) where idempotency_key like 'test:scoped:%' order by operation $$,
  array['gmail_mark_read'],
  'worker leases only its declared operation'
);
select results_eq(
  $$ select status::text from public.integration_deliveries where idempotency_key = 'test:scoped:calendar' $$,
  array['pending'],
  'unrelated Calendar delivery remains available'
);
select results_eq(
  $$ select claimed_by from public.integration_deliveries where idempotency_key = 'test:scoped:gmail' $$,
  array['gmail-actions-worker'],
  'claim records the scoped worker identity'
);
select throws_ok(
  $$ select * from public.claim_integration_deliveries_for_operations(
    'gmail-actions-worker', 10, array[]::public.integration_operation[]
  ) $$,
  '22023',
  'At least one valid operation is required',
  'empty capabilities are rejected'
);
select throws_ok(
  $$ select * from public.claim_integration_deliveries_for_operations(
    'x', 10, array['gmail_mark_read'::public.integration_operation]
  ) $$,
  '22023',
  'Invalid claim parameters',
  'invalid worker identity is rejected'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries where idempotency_key like 'test:scoped:%' $$,
  array[2::bigint],
  'scoped claiming creates no duplicate work'
);

select * from finish();
rollback;
