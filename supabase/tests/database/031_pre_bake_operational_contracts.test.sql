begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

select has_function('public','get_workspace_dashboard_summary',array[]::text[],'exact dashboard summary exists');
select has_function('public','search_workspace',array['text','integer'],'workspace search exists');
select has_function('public','list_ai_review_page',array['integer','timestamp with time zone','uuid','public.ai_suggestion_status'],'AI review pagination exists');
select has_function('public','count_ai_review',array['public.ai_suggestion_status'],'AI review count exists');
select has_function('public','list_integration_delivery_page',array['integer','timestamp with time zone','uuid','public.integration_delivery_status','public.integration_provider'],'delivery pagination exists');
select has_function('public','count_integration_deliveries',array['public.integration_delivery_status','public.integration_provider'],'delivery count exists');
select has_function('public','list_audit_event_page',array['integer','timestamp with time zone','bigint','uuid','text','text','text','timestamp with time zone','timestamp with time zone'],'audit pagination exists');
select has_function('public','count_audit_events',array['uuid','text','text','text','timestamp with time zone','timestamp with time zone'],'audit count exists');
select has_table('public','ai_work_queue','AI work queue exists');
select has_function('public','claim_ai_email_work',array['text','integer'],'AI work claim exists');
select has_function('public','complete_ai_email_work',array['uuid','text'],'AI work completion exists');
select has_function('public','fail_ai_email_work',array['uuid','text','text','boolean'],'AI work failure exists');
select has_function('public','get_ai_queue_health',array[]::text[],'AI queue health exists');
select has_function('public','reject_quarantined_document',array['uuid','text'],'document rejection recovery exists');
select has_table('public','request_rate_limits','rate-limit state exists');
select has_function('public','consume_rate_limit',array['text','text','integer','integer'],'rate limiter exists');
select has_index('public','documents','documents_requirement_content_unique_idx','duplicate document index exists');
select has_index('public','ai_suggestions','ai_suggestions_register_idx','AI register index exists');
select has_index('public','integration_deliveries','integration_deliveries_register_idx','delivery register index exists');
select has_index('public','audit_events','audit_events_register_idx','audit register index exists');

set local role service_role;
select is(public.consume_rate_limit('test_scope', repeat('a',64), 2, 60), true, 'first request is accepted');
select is(public.consume_rate_limit('test_scope', repeat('a',64), 2, 60), true, 'second request is accepted');
select is(public.consume_rate_limit('test_scope', repeat('a',64), 2, 60), false, 'request above the limit is rejected');
reset role;

set local role authenticated;
select throws_ok(
  $$ select public.consume_rate_limit('test_scope', repeat('b',64), 2, 60) $$,
  '42501', 'permission denied for function consume_rate_limit',
  'browser sessions cannot manipulate rate limits'
);

select * from finish();
rollback;
