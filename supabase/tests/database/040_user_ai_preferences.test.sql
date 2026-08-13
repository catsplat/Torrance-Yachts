begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'user_ai_preferences', 'per-user AI preferences are stored server-side');
select has_function('public', 'update_my_ai_preferences', array['text','text','boolean','text'], 'AI preference command exists');
select has_function('public', 'save_my_openai_api_key', array['text','text'], 'personal cloud credential command exists');
select has_function('public', 'get_effective_user_ai_configuration', array['uuid'], 'trusted effective configuration resolver exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_ai_preferences'::regclass),
  'per-user AI preferences have RLS'
);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('40000000-0000-4000-8000-000000000001', 'ai.a@example.test', '{"provider":"email"}', '{"display_name":"AI User A"}'),
  ('40000000-0000-4000-8000-000000000002', 'ai.b@example.test', '{"provider":"email"}', '{"display_name":"AI User B"}');

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-4000-8000-000000000000';
select throws_ok(
  $$ select count(*) from public.user_ai_preferences $$,
  '42501', 'permission denied for table user_ai_preferences',
  'anonymous clients cannot read AI preferences'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select count(*) from public.user_ai_preferences $$,
  array[1::bigint], 'user A sees only their AI preference row'
);
select lives_ok(
  $$ select public.update_my_ai_preferences('ollama', 'qwen3:8b', true, 'detailed') $$,
  'user A can select an Ollama model'
);
select results_eq(
  $$ select provider, model, summary_style from public.user_ai_preferences $$,
  $$ values ('ollama'::text, 'qwen3:8b'::text, 'detailed'::text) $$,
  'user A receives their saved provider, model, and summary style'
);
select throws_ok(
  $$ update public.user_ai_preferences set provider = 'openai' $$,
  '42501', 'permission denied for table user_ai_preferences',
  'direct client mutation is unavailable'
);
select throws_ok(
  $$ select openai_api_key_secret_id from public.user_ai_preferences $$,
  '42501', 'permission denied for table user_ai_preferences',
  'credential identifiers are not exposed to authenticated clients'
);
select lives_ok(
  $$ select public.save_my_openai_api_key('synthetic-openai-key-user-a', 'Synthetic AI isolation test') $$,
  'user A can store a personal OpenAI key in Vault'
);
select results_eq(
  $$ select event_type from public.workflow_events where aggregate_id = '40000000-0000-4000-8000-000000000001'::uuid and event_type = 'UserAiCredentialUpdated' $$,
  array['UserAiCredentialUpdated'::text], 'credential changes are audited without the secret'
);

set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000002';
select results_eq(
  $$ select provider, model, enabled, summary_style from public.user_ai_preferences $$,
  $$ values (null::text, null::text, true, 'concise'::text) $$,
  'user B receives independent defaults rather than user A settings'
);
select results_eq(
  $$ select count(*) from public.user_ai_preferences where user_id = '40000000-0000-4000-8000-000000000001'::uuid $$,
  array[0::bigint], 'user B cannot address user A preferences through RLS'
);
select lives_ok(
  $$ select public.update_my_ai_preferences('local', 'deterministic-v1', false, 'concise') $$,
  'user B can store a different personal configuration'
);

set local role service_role;
select results_eq(
  $$ select provider, model, enabled, summary_style, has_personal_openai_api_key from public.get_effective_user_ai_configuration('40000000-0000-4000-8000-000000000001') $$,
  $$ values ('ollama'::text, 'qwen3:8b'::text, true, 'detailed'::text, true) $$,
  'trusted resolver restores user A effective settings and credential presence'
);
select results_eq(
  $$ select openai_api_key from public.get_effective_user_ai_configuration('40000000-0000-4000-8000-000000000001') $$,
  array['synthetic-openai-key-user-a'::text],
  'only the trusted resolver can unwrap user A credential'
);
select results_eq(
  $$ select provider, enabled, has_personal_openai_api_key from public.get_effective_user_ai_configuration('40000000-0000-4000-8000-000000000002') $$,
  $$ values ('local'::text, false, false) $$,
  'trusted resolver keeps user B configuration separate'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '40000000-0000-4000-8000-000000000001';
select results_eq(
  $$ select provider, model, summary_style from public.user_ai_preferences $$,
  $$ values ('ollama'::text, 'qwen3:8b'::text, 'detailed'::text) $$,
  'user A signing in again restores the original configuration'
);
select lives_ok(
  $$ select public.clear_my_openai_api_key('Synthetic isolation cleanup') $$,
  'user A can remove their personal cloud credential'
);

set local role service_role;
select results_eq(
  $$ select has_personal_openai_api_key, openai_api_key from public.get_effective_user_ai_configuration('40000000-0000-4000-8000-000000000001') $$,
  $$ values (false, null::text) $$,
  'credential removal clears both presence and decrypted value'
);

select * from finish();
rollback;
