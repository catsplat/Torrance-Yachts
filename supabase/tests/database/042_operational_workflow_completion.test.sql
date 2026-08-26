begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public', 'manual_auth_links', 'manual setup links are recorded without exposing token hashes');
select has_table('public', 'imap_mailbox_connections', 'private IMAP mailbox connections are stored separately from Gmail OAuth');
select has_table('public', 'local_ai_agents', 'paired local AI helpers are owner-bound records');
select has_function('public', 'store_manual_auth_link', array['uuid','text','text','uuid','integer'], 'manual setup links are stored through a service command');
select has_function('public', 'revoke_my_local_ai_agent', array['uuid'], 'users can revoke their own paired helper');
select has_function('public', 'get_pending_imap_provider_actions', array[]::text[], 'trusted IMAP mailbox actions have a separate credential path');
select has_function('public', 'complete_imap_provider_action', array['uuid'], 'trusted IMAP action completion is recorded through a guarded command');
select has_function('public', 'add_operational_task', array['uuid','uuid','text','text','date','public.task_priority','uuid','uuid[]','public.document_type','public.booking_status','date'], 'operational task command supports friendly conditions');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('42000000-0000-4000-8000-000000000001', 'workflow-owner@example.test', '{"display_name":"Workflow Owner"}'),
  ('42000000-0000-4000-8000-000000000002', 'workflow-other@example.test', '{"display_name":"Workflow Other"}');
update public.profiles set active = true, access_approved_at = now(), access_approved_by = id
where id in ('42000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002');

set local role service_role;
create temporary table manual_link_test_reference (id uuid not null) on commit drop;
select lives_ok(
  $$ insert into manual_link_test_reference (id) values (public.store_manual_auth_link('42000000-0000-4000-8000-000000000001', 'invite', 'synthetic-verification-token-hash-only', '42000000-0000-4000-8000-000000000001', 60)) $$,
  'service can create one opaque setup link'
);
select results_eq(
  $$ select count(*) from public.get_manual_auth_link_status((select id from manual_link_test_reference)) $$,
  array[1::bigint],
  'a GET-only setup preview can inspect status without consuming the link'
);
select results_eq(
  $$ select count(*) from public.claim_manual_auth_link((select id from manual_link_test_reference)) $$,
  array[1::bigint],
  'explicit confirmation can claim the one-time setup link'
);
select results_eq(
  $$ select count(*) from public.claim_manual_auth_link((select id from manual_link_test_reference)) $$,
  array[0::bigint],
  'a concurrent second confirmation cannot claim the leased setup link'
);
select lives_ok(
  $$ select public.finish_manual_auth_link((select id from manual_link_test_reference), true) $$,
  'successful setup consumes and destroys the verification secret'
);
select results_eq(
  $$ select count(*) from public.get_manual_auth_link_status((select id from manual_link_test_reference)) $$,
  array[0::bigint],
  'a consumed setup link can never be reused'
);

reset role;
insert into public.local_ai_agents (id, user_id, device_name, token_sha256)
values ('42000000-0000-4000-8000-000000000010', '42000000-0000-4000-8000-000000000001', 'Synthetic Mac', repeat('a', 64));
set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '42000000-0000-4000-8000-000000000002';
select results_eq($$ select count(*) from public.local_ai_agents $$, array[0::bigint], 'another staff user cannot see a private helper');
select throws_ok($$ select public.revoke_my_local_ai_agent('42000000-0000-4000-8000-000000000010') $$, 'P0002', 'Local AI helper not found', 'another staff user cannot revoke a private helper');
set local "request.jwt.claim.sub" = '42000000-0000-4000-8000-000000000001';
select lives_ok($$ select public.revoke_my_local_ai_agent('42000000-0000-4000-8000-000000000010') $$, 'owner can revoke their local helper');
select results_eq($$ select status from public.local_ai_agents where id = '42000000-0000-4000-8000-000000000010' $$, array['revoked'::text], 'revoked helper cannot remain available');

select * from finish();
rollback;
