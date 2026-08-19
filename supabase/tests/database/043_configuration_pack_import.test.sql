begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('public', 'configuration_pack_imports', 'protected configuration imports are retained for audit');
select has_function('public', 'preview_configuration_pack', array['jsonb'], 'configuration pack preview command exists');
select has_function('public', 'import_configuration_pack', array['jsonb'], 'configuration pack import command exists');

insert into auth.users (id, email, raw_user_meta_data)
values ('43000000-0000-4000-8000-000000000001', 'configuration.admin@example.test', '{"display_name":"Configuration Admin"}');
update public.profiles set active = true, role = 'administrator', access_approved_at = now(), access_approved_by = id
where id = '43000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '43000000-0000-4000-8000-000000000001';

select results_eq(
  $$ select (public.preview_configuration_pack('{"version":1,"yachts":[{"name":"Configuration Test Yacht"}],"workflow":{"name":"Configuration test workflow","steps":[{"code":"0.A","title":"First step"}]}}'::jsonb)->>'yachts') $$,
  array['1'::text], 'preview returns an accurate yacht count without mutating data'
);
select lives_ok(
  $$ select public.import_configuration_pack('{"version":1,"yachts":[{"name":"Configuration Test Yacht","commercial_profile":{"overview":"A synthetic configuration profile."},"rates":[{"name":"Synthetic season","valid_from":"2030-01-01","valid_to":"2030-01-31","weekly_rate":12345,"currency":"EUR","tax_rate":5.2}]}],"communication_templates":[{"kind":"kyc_request","name":"Synthetic KYC wording","subject":"KYC verification - {{client_name}}","body":"Dear {{broker_company_name}},\n\nPlease provide the required synthetic compliance confirmation for {{client_name}} in {{year}}."}],"workflow":{"name":"Configuration test workflow","steps":[{"code":"0.A","title":"First step","due_anchor":"booking_confirmed","due_date_required":true},{"code":"0.B","title":"Second step","after":["0.A"]}]}}'::jsonb) $$,
  'administrator can import a complete synthetic pack atomically'
);
select results_eq($$ select count(*) from public.yachts where name = 'Configuration Test Yacht' $$, array[1::bigint], 'pack creates its yacht record');
select results_eq($$ select count(*) from public.yacht_rate_periods rate join public.yachts yacht on yacht.id = rate.yacht_id where yacht.name = 'Configuration Test Yacht' $$, array[1::bigint], 'pack creates its seasonal rate');
select results_eq($$ select count(*) from public.task_template_steps step join public.task_templates template on template.id = step.template_id where template.name = 'Configuration test workflow' $$, array[2::bigint], 'pack creates draft workflow steps');
select results_eq($$ select count(*) from public.configuration_pack_imports $$, array[1::bigint], 'pack payload is retained only in protected operational storage');
select * from finish();
rollback;
