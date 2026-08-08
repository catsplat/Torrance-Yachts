begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_function(
  'public',
  'get_user_google_workspace_credentials',
  array['uuid'],
  'trusted Google Workspace credential reader exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '25000000-0000-4000-8000-000000000001',
  'workspace.admin@example.test',
  '{"display_name":"Workspace Administrator"}'
);
update public.profiles
set role = 'administrator'
where id = '25000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '25000000-0000-4000-8000-000000000001';
set local "request.jwt.claim.role" = 'authenticated';

select lives_ok(
  $$ select public.save_my_gmail_oauth_credentials(
    'workspace.admin@example.test',
    'synthetic-client-id',
    'synthetic-client-secret',
    'synthetic-refresh-token',
    array[
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    'Connect fictional Workspace account'
  ) $$,
  'administrator can connect a fictional Workspace account'
);

select throws_ok(
  $$ select * from public.get_user_google_workspace_credentials(
    '25000000-0000-4000-8000-000000000001'
  ) $$,
  '42501',
  'permission denied for function get_user_google_workspace_credentials',
  'browser-authenticated users cannot decrypt Google credentials'
);

reset role;
set local role service_role;

select results_eq(
  $$ select account_email from public.get_user_google_workspace_credentials(
    '25000000-0000-4000-8000-000000000001'
  ) $$,
  array['workspace.admin@example.test'],
  'trusted server routes can resolve the selected account'
);
select results_eq(
  $$ select client_id from public.get_user_google_workspace_credentials(
    '25000000-0000-4000-8000-000000000001'
  ) $$,
  array['synthetic-client-id'],
  'trusted server routes receive the encrypted client ID value'
);
select results_eq(
  $$ select refresh_token from public.get_user_google_workspace_credentials(
    '25000000-0000-4000-8000-000000000001'
  ) $$,
  array['synthetic-refresh-token'],
  'trusted server routes receive the encrypted refresh token value'
);
select ok(
  (select scopes @> array[
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ]::text[]
   from public.get_user_google_workspace_credentials(
     '25000000-0000-4000-8000-000000000001'
   )),
  'trusted resource selection can verify the granted scopes'
);

select * from finish();
rollback;
