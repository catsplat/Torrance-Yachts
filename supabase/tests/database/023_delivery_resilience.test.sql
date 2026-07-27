begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_function(
  'public',
  'get_integration_queue_health',
  array[]::text[],
  'queue health function exists'
);

set local role postgres;
select set_config('app.phase11_command', 'yes', true);
insert into public.integration_deliveries (
  provider, operation, idempotency_key, source_type, source_id, payload, next_attempt_at
) values (
  'telegram', 'telegram_send', 'test:resilience:telegram:retry',
  'notification', gen_random_uuid(), '{"recipient":"synthetic","title":"Synthetic","body":"Retry test"}',
  '2000-01-01T00:00:00Z'
);
select set_config('app.phase11_command', '', true);

select lives_ok(
  $$
    select set_config('app.phase11_command', 'yes', true);
    update public.integration_deliveries
    set status = 'claimed',
        claimed_by = 'resilience-worker',
        claimed_at = now(),
        lease_expires_at = now() + interval '5 minutes',
        attempt_count = 1
    where idempotency_key = 'test:resilience:telegram:retry'
  $$,
  'controlled fixture has an active trusted-worker claim'
);
select lives_ok(
  $$
    select public.fail_integration_delivery(
      (select id from public.integration_deliveries where idempotency_key = 'test:resilience:telegram:retry'),
      'resilience-worker', 'provider_timeout', 'Synthetic transient provider timeout.', true
    )
  $$,
  'retryable provider failure is recorded'
);
select ok(
  (
    select status = 'failed'
      and next_attempt_at > now() + interval '59 seconds'
      and next_attempt_at < now() + interval '91 seconds'
    from public.integration_deliveries
    where idempotency_key = 'test:resilience:telegram:retry'
  ),
  'first retry uses bounded exponential delay with jitter'
);

select results_eq(
  $$ select failed_count from public.get_integration_queue_health() $$,
  array[1::bigint],
  'queue health exposes failed delivery count'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.get_integration_queue_health() $$,
  '42501',
  'permission denied for function get_integration_queue_health',
  'anonymous requests cannot inspect queue health'
);

select * from finish();
rollback;
