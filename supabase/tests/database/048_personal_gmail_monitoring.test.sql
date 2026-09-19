begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(7);
insert into auth.users(id,email,raw_user_meta_data) values
('48000000-0000-4000-8000-000000000001','a@example.test','{"display_name":"Synthetic A"}'),
('48000000-0000-4000-8000-000000000002','b@example.test','{"display_name":"Synthetic B"}');
update public.profiles set active=true,access_approved_at=now() where id::text like '48000000%';
insert into public.user_gmail_monitoring(user_id,enabled) values
('48000000-0000-4000-8000-000000000001',false),('48000000-0000-4000-8000-000000000002',false);
set local role authenticated;
set local "request.jwt.claim.sub"='48000000-0000-4000-8000-000000000001';
set local "request.jwt.claims"='{"sub":"48000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.user_gmail_monitoring),1::bigint,'only own monitoring settings visible');
select throws_ok($$select public.configure_gmail_ingestion('48000000-0000-4000-8000-000000000002',false)$$,'42501','Only the mailbox owner may change monitoring','cannot change another owner');
select lives_ok($$select public.configure_gmail_ingestion('48000000-0000-4000-8000-000000000001',false)$$,'can pause own monitoring');
select throws_ok($$select public.configure_gmail_ingestion('48000000-0000-4000-8000-000000000001',true)$$,'23514','Connect your Gmail account first','cannot enable without credentials');
select throws_ok($$select * from public.get_active_gmail_ingestion_credentials()$$,'42501',null,'staff cannot retrieve credentials');
reset role;
select lives_ok($$select * from public.get_active_gmail_ingestion_credentials()$$,'bounded claim SQL executes');
select lives_ok($$select public.queue_email_provider_actions()$$,'owner-bound provider action SQL executes');
select * from finish();
rollback;
