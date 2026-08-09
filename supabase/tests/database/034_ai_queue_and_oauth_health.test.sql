begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function(
  'public','record_google_oauth_health',
  array['uuid','boolean','boolean','text','timestamp with time zone'],
  'service OAuth health recorder exists'
);
select has_function(
  'public','prepare_synthetic_acceptance_administrator',array['uuid'],
  'reserved acceptance identity preparation exists'
);

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values (
  '34000000-0000-4000-8000-000000000001',
  'queue.owner@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Queue Owner"}'::jsonb
);
update public.profiles set role = 'administrator', active = true,
  access_approved_at = now(), access_approved_by = id
where id = '34000000-0000-4000-8000-000000000001';

set local role service_role;
select public.ingest_gmail_message(
  'queue-event-1','queue-message-1','queue-thread-1','<queue-1@example.test>',now(),
  'Synthetic Broker','broker@example.test',array['charter@example.test'],'{}'::text[],
  'Synthetic charter request one','August availability','Fictional body one.',
  array['INBOX'],false,false,false,false,'[]'::jsonb
);
select public.ingest_gmail_message(
  'queue-event-2','queue-message-2','queue-thread-2','<queue-2@example.test>',now(),
  'Synthetic Broker','broker@example.test',array['charter@example.test'],'{}'::text[],
  'Synthetic charter request two','September availability','Fictional body two.',
  array['INBOX'],false,false,false,false,'[]'::jsonb
);
select public.ingest_gmail_message(
  'queue-event-3','queue-message-3','queue-thread-3','<queue-3@example.test>',now(),
  'Synthetic Broker','broker@example.test',array['charter@example.test'],'{}'::text[],
  'Synthetic charter request three','October availability','Fictional body three.',
  array['INBOX'],false,false,false,false,'[]'::jsonb
);

create temporary table first_claim as
  select * from public.claim_ai_email_work('queue-worker',2);

select is((select count(*) from first_claim),2::bigint,'claim respects the requested batch limit');
select is((select count(*) from public.ai_work_queue),3::bigint,'all eligible emails receive exactly one queue record');
select is((select count(*) from public.ai_work_queue where status = 'claimed'),2::bigint,'claimed rows are leased');
select is((select min(attempt_count) from first_claim),1,'first claim records attempt one');
select is((select max(attempt_count) from first_claim),1,'attempt count is consistent across the batch');

select lives_ok(
  format('select public.complete_ai_email_work(%L,%L)',
    (select work_id from first_claim order by work_id limit 1),'queue-worker'),
  'the owning worker can complete a lease'
);
select is((select count(*) from public.ai_work_queue where status = 'completed'),1::bigint,'completion is durable');

select lives_ok(
  format('select public.fail_ai_email_work(%L,%L,%L,true)',
    (select work_id from first_claim order by work_id offset 1 limit 1),'queue-worker','Synthetic timeout'),
  'a transient failure is recorded'
);
select is((select count(*) from public.ai_work_queue where status = 'pending' and last_error = 'Synthetic timeout'),1::bigint,'transient work returns to pending');
select ok((select min(next_attempt_at) from public.ai_work_queue where last_error = 'Synthetic timeout') > now(),'retry is backed off');

update public.ai_work_queue set next_attempt_at = now() - interval '1 second'
where last_error = 'Synthetic timeout';
create temporary table second_claim as
  select * from public.claim_ai_email_work('recovery-worker',2);
select is((select count(*) from second_claim),2::bigint,'retry and remaining pending work are claimed together');
select ok((select max(attempt_count) from second_claim) = 2,'retried work increments its attempt count');

select public.fail_ai_email_work(
  (select work_id from second_claim where attempt_count = 2),
  'recovery-worker','Synthetic permanent provider rejection',false
);
select is((select count(*) from public.ai_work_queue where status = 'permanent_failure'),1::bigint,'non-retryable work becomes a permanent failure');

update public.ai_work_queue set lease_expires_at = now() - interval '1 second'
where status = 'claimed';
select is((select count(*) from public.claim_ai_email_work('lease-recovery-worker',5)),1::bigint,'an expired lease is reclaimed');
select is((public.get_ai_queue_health()->>'permanent_failure')::integer,1,'queue health exposes permanent failures');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','34000000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$ select public.record_google_oauth_health(
    '34000000-0000-4000-8000-000000000001',false,true,'forged',now()
  ) $$,
  '42501','permission denied for function record_google_oauth_health',
  'browser sessions cannot forge OAuth health'
);
select throws_ok(
  $$ select public.prepare_synthetic_acceptance_administrator(
    '34000000-0000-4000-8000-000000000001'
  ) $$,
  '42501','permission denied for function prepare_synthetic_acceptance_administrator',
  'browser sessions cannot promote acceptance users'
);

select * from finish();
rollback;
