begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(2);
insert into auth.users(id,email,raw_user_meta_data) values
('50000000-0000-4000-8000-000000000001','template-admin@example.test','{"display_name":"Synthetic Template Admin"}');
update public.profiles set active=true,access_approved_at=now(),role='administrator' where id='50000000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub"='50000000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select lives_ok($$select public.import_configuration_pack('{"version":1,"yachts":[{"name":"Synthetic reply yacht","offer_template":{"name":"Reply offer","subject":"","body":"Dear {{customer_name}}, please offer {{yacht_name}}."}}]}'::jsonb)$$,'blank-subject offer imports through the protected command');
select is((select subject_template from public.yacht_offer_templates where name='Reply offer'),'','reply subject remains blank in the template');
reset role;
select * from finish();
rollback;
