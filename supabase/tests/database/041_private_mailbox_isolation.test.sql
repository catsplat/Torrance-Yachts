begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_column('public', 'email_threads', 'owner_user_id', 'email threads record mailbox ownership');
select has_column('public', 'email_threads', 'shared_at', 'email threads record explicit sharing');
select has_column('public', 'email_messages', 'owner_user_id', 'email messages record mailbox ownership');
select has_column('public', 'email_ingestion_events', 'owner_user_id', 'ingestion events record mailbox ownership');
select has_function(
  'public', 'ingest_gmail_message_for_owner',
  array[
    'uuid','text','text','text','text','timestamp with time zone','text','text',
    'text[]','text[]','text','text','text','text[]','boolean','boolean','boolean',
    'boolean','jsonb'
  ],
  'owner-aware Gmail ingestion command exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('41000000-0000-4000-8000-000000000001', 'mailbox-a@example.test', '{"display_name":"Mailbox A"}'),
  ('41000000-0000-4000-8000-000000000002', 'mailbox-b@example.test', '{"display_name":"Mailbox B"}');
update public.profiles
set active = true, role = case when id = '41000000-0000-4000-8000-000000000001' then 'administrator'::public.user_role else 'staff'::public.user_role end,
    access_approved_at = now(), access_approved_by = id
where id in (
  '41000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000002'
);

set local role service_role;
select public.ingest_gmail_message_for_owner(
  '41000000-0000-4000-8000-000000000001',
  'gmail:shared-provider-event', 'gmail:shared-provider-message',
  'gmail:shared-provider-thread', '<mailbox-a@example.test>', now(),
  'Mailbox A Sender', 'sender-a@example.test', array['mailbox-a@example.test'],
  '{}'::text[], 'Mailbox A private subject', 'Mailbox A private snippet',
  'Mailbox A body', array['INBOX'], false, false, false, false, '[]'::jsonb
);
select public.ingest_gmail_message_for_owner(
  '41000000-0000-4000-8000-000000000002',
  'gmail:shared-provider-event', 'gmail:shared-provider-message',
  'gmail:shared-provider-thread', '<mailbox-b@example.test>', now(),
  'Mailbox B Sender', 'sender-b@example.test', array['mailbox-b@example.test'],
  '{}'::text[], 'Mailbox B private subject', 'Mailbox B private snippet',
  'Mailbox B body', array['INBOX'], false, false, false, false, '[]'::jsonb
);
select public.materialise_operational_notifications(now());

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.email_messages $$,
  array[1::bigint],
  'User A sees only User A private mailbox messages'
);
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select count(*) from public.email_messages $$,
  array[1::bigint],
  'User B sees only User B private mailbox messages'
);
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.email_messages where body_text = 'Mailbox B body' $$,
  array[0::bigint],
  'administrator status does not bypass another user private mailbox'
);
select results_eq(
  $$ select count(*) from public.notifications where body like '%Mailbox A private subject%' $$,
  array[1::bigint],
  'private email notification is delivered only to its mailbox owner'
);
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select count(*) from public.notifications where body like '%Mailbox A private subject%' $$,
  array[0::bigint],
  'private email notification content is not visible to another user'
);

set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ select public.classify_email_message(
    (select id from public.email_messages where body_text = 'Mailbox A body'),
    'new_enquiry', 'Mailbox owner explicitly promoted this email into an enquiry',
    null, null, 'Promoted mailbox A enquiry'
  ) $$,
  'mailbox owner can explicitly promote a private email into shared operational work'
);
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select count(*) from public.email_messages where body_text = 'Mailbox A body' $$,
  array[1::bigint],
  'another user can see an email after its thread is explicitly promoted'
);
select results_eq(
  $$ select count(*) from public.enquiries where summary = 'Promoted mailbox A enquiry' $$,
  array[1::bigint],
  'User B can see the same promoted shared enquiry'
);
set local "request.jwt.claim.sub" = '41000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.enquiries where summary = 'Promoted mailbox A enquiry' $$,
  array[1::bigint],
  'User A can see the same promoted shared enquiry'
);

select * from finish();
rollback;
