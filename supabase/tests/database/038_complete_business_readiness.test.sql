begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values (
  '38000000-0000-4000-8000-000000000001','readiness.complete@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Readiness Complete"}'::jsonb
);
update public.profiles set role = 'administrator', active = true,
  access_approved_at = now(), access_approved_by = id,
  telegram_chat_id = 'synthetic-readiness-chat'
where id = '38000000-0000-4000-8000-000000000001';

select set_config('app.personal_alert_command', 'yes', true);
update public.user_notification_preferences set telegram_enabled = true
where user_id = '38000000-0000-4000-8000-000000000001';
select set_config('app.personal_alert_command', '', true);

set local role authenticated;
select set_config('request.jwt.claim.sub','38000000-0000-4000-8000-000000000001',true);

select ok(public.get_business_readiness() ? 'configured_alert_routes', 'snapshot reports configured alert routes');
select is((public.get_business_readiness()->>'configured_alert_routes')::integer, 1, 'valid staff alert route is counted');
select ok(public.get_business_readiness() ? 'configured_google_destinations', 'snapshot reports Google destination count');
select ok(public.get_business_readiness() ? 'document_policy_accepted', 'snapshot reports document-policy acceptance');
select is(public.get_business_readiness()->>'document_policy_accepted', 'false', 'pending privacy checks are not accepted');
select ok(not public.get_business_readiness() ? 'telegram_chat_id', 'snapshot does not expose Telegram destinations');
select ok(not public.get_business_readiness() ? 'target_reference', 'snapshot does not expose Google destination references');

select * from finish();
rollback;
