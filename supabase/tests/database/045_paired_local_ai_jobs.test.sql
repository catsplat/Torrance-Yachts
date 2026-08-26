begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select has_table('public', 'local_ai_jobs', 'paired helper jobs are durable');
select has_function('public', 'claim_local_ai_job', array['text'], 'a helper can only claim through its token');
select has_function('public', 'complete_local_ai_job', array['text','uuid','jsonb','text','integer','integer'], 'a helper completes through its lease');

insert into auth.users (id, email, raw_user_meta_data)
values ('45000000-0000-4000-8000-000000000001', 'paired-ai-owner@example.test', '{"display_name":"Paired AI Owner"}'::jsonb);
update public.profiles set active = true, access_approved_at = now(), access_approved_by = id
where id = '45000000-0000-4000-8000-000000000001';
insert into public.local_ai_agents (id, user_id, device_name, token_sha256, status, last_seen_at)
values ('45000000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000001', 'Synthetic Mac', encode(extensions.digest('synthetic-paired-agent-token', 'sha256'), 'hex'), 'available', now());
insert into public.local_ai_jobs (id, agent_id, owner_user_id, analysis_kind, input_payload)
values ('45000000-0000-4000-8000-000000000020', '45000000-0000-4000-8000-000000000010', '45000000-0000-4000-8000-000000000001', 'email_triage', '{"input":{"subject":"Synthetic"},"summary_style":"concise"}'::jsonb);

set local role service_role;
select throws_ok($$ select * from public.claim_local_ai_job('wrong-token') $$, 'P0002', 'Paired helper is unavailable', 'an unknown helper token cannot claim work');
select results_eq($$ select work_id from (select job_id as work_id from public.claim_local_ai_job('synthetic-paired-agent-token')) claimed $$, array['45000000-0000-4000-8000-000000000020'::uuid], 'the paired helper claims only its own job');
select lives_ok($$ select public.complete_local_ai_job('synthetic-paired-agent-token','45000000-0000-4000-8000-000000000020','{"summary":"Synthetic only"}'::jsonb,'test-request',1,1) $$, 'the paired helper can complete its owned lease');
select results_eq($$ select status || ':' || (result_payload->>'summary') from public.local_ai_jobs where id = '45000000-0000-4000-8000-000000000020' $$, array['completed:Synthetic only'], 'result is durable for server-side schema validation');

select * from finish();
rollback;
