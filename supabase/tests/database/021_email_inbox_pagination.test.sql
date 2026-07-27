begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function(
  'public',
  'list_email_inbox_page',
  array['integer', 'timestamp with time zone', 'uuid', 'public.email_classification', 'text'],
  'cursor-based email inbox function exists'
);
select has_function(
  'public',
  'count_email_inbox',
  array['public.email_classification', 'text'],
  'email inbox count function exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '23000000-0000-4000-8000-000000000001',
  'inbox.pagination@example.test',
  '{"display_name":"Inbox Pagination"}'::jsonb
);

set local role service_role;
select public.ingest_gmail_message(
  'inbox-pagination-event-1', 'inbox-pagination-message-1', 'inbox-pagination-thread-1',
  '<inbox-pagination-1@example.test>', now() - interval '1 minute',
  'Inbox Fixture', 'fixture@example.test', array['operations@example.test'], '{}'::text[],
  'Historic inbox rehearsal one', 'Historic inbox rehearsal one',
  'First synthetic historical inbox record.', array['INBOX'], false, false, false, false, '[]'::jsonb
);
select public.ingest_gmail_message(
  'inbox-pagination-event-2', 'inbox-pagination-message-2', 'inbox-pagination-thread-2',
  '<inbox-pagination-2@example.test>', now() - interval '2 minutes',
  'Inbox Fixture', 'fixture@example.test', array['operations@example.test'], '{}'::text[],
  'Historic inbox rehearsal two', 'Historic inbox rehearsal two',
  'Second synthetic historical inbox record.', array['INBOX'], false, false, false, false, '[]'::jsonb
);
select public.ingest_gmail_message(
  'inbox-pagination-event-3', 'inbox-pagination-message-3', 'inbox-pagination-thread-3',
  '<inbox-pagination-3@example.test>', now() - interval '3 minutes',
  'Inbox Fixture', 'fixture@example.test', array['operations@example.test'], '{}'::text[],
  'Historic inbox rehearsal three', 'Historic inbox rehearsal three',
  'Third synthetic historical inbox record.', array['INBOX'], false, false, false, false, '[]'::jsonb
);

set local role authenticated;
set local "request.jwt.claim.sub" = '23000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.list_email_inbox_page(100, null, null, null, 'historic inbox') $$,
  array[3::bigint],
  'email search covers historical matching messages in PostgreSQL'
);
select results_eq(
  $$ select public.count_email_inbox(null, 'historic inbox') $$,
  array[3::bigint],
  'email matching count covers the complete authorised inbox'
);
select results_eq(
  $$
    with first_page as (
      select * from public.list_email_inbox_page(2, null, null, null, 'historic inbox')
    ), cursor as (
      select received_at, id from first_page order by received_at desc, id desc offset 1 limit 1
    )
    select count(*) from public.list_email_inbox_page(
      2, (select received_at from cursor), (select id from cursor), null, 'historic inbox'
    )
  $$,
  array[1::bigint],
  'email cursor returns the remaining message without replaying the page'
);
select throws_ok(
  $$ select * from public.list_email_inbox_page(10, now(), null, null, null) $$,
  '22023',
  'Pagination cursor is incomplete',
  'partial email cursors are rejected'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.list_email_inbox_page(10, null, null, null, null) $$,
  '42501',
  'permission denied for function list_email_inbox_page',
  'anonymous callers cannot execute the inbox query'
);

select * from finish();
rollback;
