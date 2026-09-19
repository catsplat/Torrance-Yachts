begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

select has_table('public', 'operational_settings', 'operational settings table exists');
select has_table('public', 'email_threads', 'email threads table exists');
select has_table('public', 'email_messages', 'email messages table exists');
select has_table('public', 'email_attachments', 'email attachments table exists');
select has_table('public', 'email_ingestion_events', 'email ingestion events table exists');
select has_table('public', 'email_classification_history', 'email classification history exists');
select has_table('public', 'email_provider_actions', 'provider action outbox exists');
select ok((select relrowsecurity from pg_class where oid = 'public.email_messages'::regclass), 'email messages have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.operational_settings'::regclass), 'settings have RLS');
select results_eq(
  $$ select enquiry_timeout_enabled::text || ':' || new_enquiry_timeout_days::text
     from public.operational_settings $$,
  array['true:14'],
  'safe timeout defaults are seeded'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('17000000-0000-0000-0000-000000000001', 'email.admin@example.test', '{"display_name":"Email Administrator"}'::jsonb),
  ('17000000-0000-0000-0000-000000000002', 'email.inactive@example.test', '{"display_name":"Inactive Email User"}'::jsonb);
update public.profiles set role = 'administrator'
where id = '17000000-0000-0000-0000-000000000001';
update public.profiles set active = false
where id = '17000000-0000-0000-0000-000000000002';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok(
  $$ select count(*) from public.email_messages $$,
  '42501', 'permission denied for table email_messages',
  'anonymous users cannot read email content'
);
select throws_ok(
  $$ select count(*) from public.operational_settings $$,
  '42501', 'permission denied for table operational_settings',
  'anonymous users cannot read operational settings'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.update_operational_settings(
    true, 7, 21, 28, 42, array['internal.example.test']
  ) $$,
  'administrator can configure timeout and internal routing settings'
);
select results_eq(
  $$ select new_enquiry_timeout_days::text || ':' || waiting_reply_timeout_days::text ||
            ':' || internal_email_domains[1]
     from public.operational_settings $$,
  array['7:21:internal.example.test'],
  'settings are normalised and saved'
);
select throws_ok(
  $$ update public.operational_settings set new_enquiry_timeout_days = 1 $$,
  '42501', 'permission denied for table operational_settings',
  'direct settings mutation is blocked'
);
select throws_ok(
  $$ insert into public.email_messages (
    thread_id, provider_message_id, received_at, sender_email, subject
  ) values (
    '00000000-0000-4000-8000-000000000001', 'bypass', now(),
    'bypass@example.test', 'Bypass'
  ) $$,
  '42501', 'permission denied for table email_messages',
  'staff cannot bypass the ingestion boundary'
);

set local role service_role;
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-unknown-1', 'gmail-message-unknown-1', 'gmail-thread-unknown-1', '<unknown-1@example.test>',
    '2026-07-16T09:00:00Z', 'Synthetic Broker', 'broker@example.test',
    array['charter@example.test'], '{}'::text[], 'Charter request',
    'Please advise availability for August.', 'Synthetic plain text body.',
    array['INBOX','UNREAD'], false, false, false, false, '[]'::jsonb
  ) $$,
  'service ingestion accepts a representative unknown message'
);
select results_eq(
  $$ select classification::text || ':' || processing_status::text || ':' || deterministic_rule
     from public.email_messages where provider_message_id = 'gmail-message-unknown-1' $$,
  array['unclassified:review_required:manual_review'],
  'uncertain messages enter human review'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'EmailReceived' $$,
  array[1::bigint],
  'ingestion emits one durable event'
);
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-unknown-1', 'gmail-message-unknown-1', 'gmail-thread-unknown-1', '<unknown-1@example.test>',
    '2026-07-16T09:00:00Z', 'Synthetic Broker', 'broker@example.test',
    array['charter@example.test'], '{}'::text[], 'Charter request',
    'Please advise availability for August.', 'Synthetic plain text body.',
    array['INBOX','UNREAD'], false, false, false, false, '[]'::jsonb
  ) $$,
  'replaying the same provider event is safe'
);
select results_eq(
  $$ select count(*) from public.email_messages where provider_message_id = 'gmail-message-unknown-1' $$,
  array[1::bigint],
  'same event does not duplicate the message'
);
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-unknown-retry', 'gmail-message-unknown-1', 'gmail-thread-unknown-1', '<unknown-1@example.test>',
    '2026-07-16T09:00:00Z', 'Synthetic Broker', 'broker@example.test',
    array['charter@example.test'], '{}'::text[], 'Charter request',
    'Please advise availability for August.', 'Synthetic plain text body.',
    array['INBOX','UNREAD'], false, false, false, false, '[]'::jsonb
  ) $$,
  'a second provider event for the same Gmail message is idempotent'
);
select results_eq(
  $$ select count(*) from public.email_ingestion_events where provider_message_id = 'gmail-message-unknown-1' $$,
  array[2::bigint],
  'provider retries are recorded without duplicating business data'
);
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-circular-1', 'gmail-message-circular-1', 'gmail-thread-circular-1', '<circular-1@example.test>',
    '2026-07-16T09:05:00Z', 'Synthetic Newsletter', 'news@example.test',
    array['charter@example.test'], '{}'::text[], 'Monthly newsletter',
    'Synthetic circular.', 'Synthetic newsletter body.', array['INBOX','UNREAD'],
    false, true, true, true, '[]'::jsonb
  ) $$,
  'mailing-list message can be ingested'
);
select results_eq(
  $$ select classification::text || ':' || processing_status::text || ':' || deterministic_rule
     from public.email_messages where provider_message_id = 'gmail-message-circular-1' $$,
  array['circular:ignored:mailing_list_headers'],
  'mailing-list headers route circulars deterministically'
);
select results_eq(
  $$ select count(*) from public.email_provider_actions a
     join public.email_messages m on m.id = a.message_id
     where m.provider_message_id = 'gmail-message-circular-1' $$,
  array[2::bigint],
  'circular requests mark-read and archive provider actions'
);
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-internal-1', 'gmail-message-internal-1', 'gmail-thread-internal-1', '<internal-1@example.test>',
    '2026-07-16T09:10:00Z', 'Synthetic Colleague', 'staff@internal.example.test',
    array['charter@example.test'], '{}'::text[], 'Internal operations note',
    'Synthetic internal update.', 'Synthetic internal body.', array['INBOX','UNREAD'],
    false, false, false, false, '[]'::jsonb
  ) $$,
  'configured internal-domain message can be ingested'
);
select results_eq(
  $$ select classification::text || ':' || deterministic_rule
     from public.email_messages where provider_message_id = 'gmail-message-internal-1' $$,
  array['internal:configured_internal_domain'],
  'configured domain routes internal mail'
);
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-attachment-1', 'gmail-message-attachment-1', 'gmail-thread-attachment-1', '<attachment-1@example.test>',
    '2026-07-16T09:15:00Z', 'Synthetic Sender', 'files@example.test',
    array['charter@example.test'], '{}'::text[], 'Document attached',
    'Synthetic attachment metadata.', 'Synthetic body.', array['INBOX','UNREAD'],
    true, false, false, false,
    '[{"provider_attachment_id":"att-1","filename":"request.pdf","mime_type":"application/pdf","size_bytes":4096}]'::jsonb
  ) $$,
  'attachment metadata can be ingested without downloading untrusted content'
);
select results_eq(
  $$ select filename || ':' || storage_status from public.email_attachments $$,
  array['request.pdf:metadata_only'],
  'attachments remain metadata-only pending a later quarantine policy'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.classify_email_message(
    (select id from public.email_messages where provider_message_id = 'gmail-message-unknown-1'),
    'new_enquiry', 'Human confirmed a new charter request', null,
    null,
    'Synthetic email-originated charter enquiry'
  ) $$,
  'human review can create and link a new enquiry'
);
select results_eq(
  $$ select source::text || ':' || status::text || ':' || summary
     from public.enquiries where summary = 'Synthetic email-originated charter enquiry' $$,
  array['email:new:Synthetic email-originated charter enquiry'],
  'new enquiry is reviewable and records email provenance'
);
select results_eq(
  $$ select email from public.contacts where email = 'broker@example.test' $$,
  array['broker@example.test'],
  'human-approved new enquiry creates or reuses the sender contact'
);
select results_eq(
  $$ select count(*) from public.email_threads where enquiry_id is not null $$,
  array[1::bigint],
  'new enquiry classification links its email thread'
);
select results_eq(
  $$ select classification::text || ':' || processing_status::text
     from public.email_messages where provider_message_id = 'gmail-message-unknown-1' $$,
  array['new_enquiry:linked'],
  'reviewed message records the new-enquiry classification'
);

set local role service_role;
select lives_ok(
  $$ select public.ingest_gmail_message_for_owner(
    '17000000-0000-0000-0000-000000000001',
    'event-follow-up-1', 'gmail-message-follow-up-1', 'gmail-thread-unknown-1', '<follow-up-1@example.test>',
    '2026-07-17T09:00:00Z', 'Synthetic Broker', 'broker@example.test',
    array['charter@example.test'], '{}'::text[], 'Re: Charter request',
    'Following up with preferred dates.', 'Synthetic follow-up body.',
    array['INBOX','UNREAD'], false, false, false, false, '[]'::jsonb
  ) $$,
  'later message in a linked Gmail thread is ingested'
);
select results_eq(
  $$ select classification::text || ':' || processing_status::text || ':' || deterministic_rule
     from public.email_messages where provider_message_id = 'gmail-message-follow-up-1' $$,
  array['enquiry_follow_up:linked:existing_enquiry_thread'],
  'known thread is safely recognised as a follow-up'
);
select results_eq(
  $$ select count(*) from public.enquiry_notes where kind = 'follow_up' $$,
  array[1::bigint],
  'automatic known-thread follow-up creates communication history'
);
select results_eq(
  $$ select message_count from public.email_threads where provider_thread_id = 'gmail-thread-unknown-1' $$,
  array[2],
  'thread message count remains accurate'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.classify_email_message(
    (select id from public.email_messages where provider_message_id = 'gmail-message-attachment-1'),
    'enquiry_follow_up', 'Human linked a message that arrived under a new Gmail thread',
    (select id from public.enquiries where summary = 'Synthetic email-originated charter enquiry'),
    null, null
  ) $$,
  'human can associate a separate provider thread as a follow-up'
);
select results_eq(
  $$ select count(*) from public.enquiry_notes where kind = 'follow_up' $$,
  array[2::bigint],
  'manual follow-up association also records communication history'
);
select lives_ok(
  $$ select public.classify_email_message(
    (select id from public.email_messages where provider_message_id = 'gmail-message-internal-1'),
    'other_relevant', 'Human corrected the deterministic internal classification',
    null, null, null
  ) $$,
  'human review can correct deterministic classification'
);
select results_eq(
  $$ select count(*) from public.email_classification_history
     where message_id = (select id from public.email_messages where provider_message_id = 'gmail-message-internal-1') $$,
  array[2::bigint],
  'classification corrections preserve history'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'EmailClassified' $$,
  array[3::bigint],
  'human classifications emit workflow events for later notifications'
);
select results_eq(
  $$ select count(*) from public.email_messages where processing_status = 'review_required' $$,
  array[0::bigint],
  'review queue clears as messages are classified'
);

insert into public.enquiries (
  customer_contact_id, status, priority, source, summary, created_by, updated_by
) values (
  '40000000-0000-4000-8000-000000000003', 'new', 'normal', 'manual',
  'Synthetic stale enquiry for timeout testing',
  '17000000-0000-0000-0000-000000000001',
  '17000000-0000-0000-0000-000000000001'
);
reset role;
set local session_replication_role = replica;
update public.enquiries
set updated_at = '2026-06-01T00:00:00Z'
where summary = 'Synthetic stale enquiry for timeout testing';
set local session_replication_role = origin;
set local role authenticated;
set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.apply_enquiry_timeouts('2026-07-16T12:00:00Z') $$,
  'timeout sweep can run manually or from the later scheduler'
);
select results_eq(
  $$ select status::text from public.enquiries
     where summary = 'Synthetic stale enquiry for timeout testing' $$,
  array['archived'],
  'inactive dead-end enquiry is archived rather than deleted'
);
select results_eq(
  $$ select reason from public.enquiry_status_history
     where enquiry_id = (
       select id from public.enquiries where summary = 'Synthetic stale enquiry for timeout testing'
     ) and to_status = 'archived' limit 1 $$,
  array['Automatically archived after 7 days without recorded activity; configurable in Settings'],
  'automatic archival records the exact policy reason'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'EnquiryTimeoutSweepCompleted' $$,
  array[1::bigint],
  'timeout sweep emits an auditable event'
);
select results_eq(
  $$ select status::text from public.enquiries
     where summary = 'Synthetic email-originated charter enquiry' $$,
  array['new'],
  'recent email activity prevents premature archival'
);
select lives_ok(
  $$ select public.update_operational_settings(
    false, 7, 21, 28, 42, array['internal.example.test']
  ) $$,
  'administrator can disable automatic timeouts'
);
select results_eq(
  $$ select public.apply_enquiry_timeouts('2027-07-16T12:00:00Z') $$,
  array[0],
  'disabled timeout sweep makes no lifecycle changes'
);

set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*) from public.email_messages $$,
  array[0::bigint],
  'inactive users cannot read email content'
);
select throws_ok(
  $$ select public.apply_enquiry_timeouts(now()) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot run timeout sweeps'
);
select throws_ok(
  $$ select public.update_operational_settings(true, 7, 21, 28, 42, '{}'::text[]) $$,
  '42501', 'Administrator access is required',
  'inactive users cannot change operational settings'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '17000000-0000-0000-0000-000000000001';
select throws_ok(
  $$ delete from public.email_classification_history $$,
  '42501', 'permission denied for table email_classification_history',
  'classification history cannot be deleted by staff'
);
select throws_ok(
  $$ update public.email_messages set body_text = 'tampered' $$,
  '42501', 'permission denied for table email_messages',
  'ingested message content is immutable to staff'
);
select results_eq(
  $$ select count(*) from public.email_ingestion_events where status = 'completed' $$,
  array[6::bigint],
  'all synthetic provider deliveries completed'
);
select results_eq(
  $$ select count(*) from public.email_threads $$,
  array[4::bigint],
  'provider messages are grouped into four durable threads'
);
select results_eq(
  $$ select count(*) from public.email_messages $$,
  array[5::bigint],
  'five unique Gmail messages exist after retries'
);
select results_eq(
  $$ select count(*) from public.email_attachments $$,
  array[1::bigint],
  'attachment metadata remains linked to its message'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'EmailReceived' $$,
  array[5::bigint],
  'each unique message emits exactly one receipt event'
);

select * from finish();
rollback;
