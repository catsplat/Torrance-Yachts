begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select has_function('public','list_active_enquiry_choices',array['text','integer'],'bounded enquiry lookup exists');
select has_function('public','redact_audit_json',array['jsonb'],'recursive audit redaction exists');
select has_function('public','get_operations_health',array[]::text[],'operations health exists');
select has_function('public','mark_document_quarantine_removed',array['uuid','text'],'quarantine tombstone command exists');
select has_table('public','upload_leases','upload concurrency leases exist');
select has_table('public','upload_byte_quotas','per-user byte quotas exist');
select has_function('public','claim_upload_capacity',array['uuid','bigint','integer','bigint'],'upload capacity claim exists');
select has_function('public','release_upload_capacity',array['uuid'],'upload capacity release exists');
select has_function('public','list_stale_enquiry_page',array['integer','timestamp with time zone','uuid','text'],'stale enquiry register exists');
select has_function('public','count_stale_enquiries',array['text'],'exact stale enquiry count exists');
select has_function('public','archive_stale_enquiries',array['uuid[]','text'],'reviewed stale archive command exists');
select has_column('public','documents','quarantine_removed_at','documents record quarantine removal');
select has_index('public','documents','documents_quarantine_recovery_idx','document recovery queue is indexed');

select is(
  public.redact_audit_json('{"safe":"visible","nested":{"email":"private@example.test","token":"abc"}}'::jsonb),
  '{"safe":"visible","nested":{"email":"[redacted]","token":"[redacted]"}}'::jsonb,
  'audit values are redacted recursively'
);

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values (
  '32000000-0000-4000-8000-000000000001',
  'capacity.admin@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Capacity Test Admin"}'::jsonb
);
update public.profiles set role = 'administrator', active = true,
  access_approved_at = now(), access_approved_by = id
where id = '32000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','32000000-0000-4000-8000-000000000001',true);
select ok(jsonb_typeof(public.get_operations_health()) = 'object','administrator can load redacted operations health');
select ok((select count(*) from public.list_active_enquiry_choices('TY',20)) >= 0,'enquiry lookup runs under RLS');
select throws_ok(
  $$ select public.claim_upload_capacity('32000000-0000-4000-8000-000000000001',1000,2,104857600) $$,
  '42501','permission denied for function claim_upload_capacity',
  'browser sessions cannot claim service upload capacity'
);
reset role;

set local role service_role;
select ok(public.claim_upload_capacity('32000000-0000-4000-8000-000000000001',1000,2,104857600) is not null,'first upload lease is granted');
select ok(public.claim_upload_capacity('32000000-0000-4000-8000-000000000001',1000,2,104857600) is not null,'second upload lease is granted');
select is(public.claim_upload_capacity('32000000-0000-4000-8000-000000000001',1000,2,104857600),null,'third concurrent upload is rejected');
select is((select count(*) from public.upload_leases where user_id = '32000000-0000-4000-8000-000000000001'),2::bigint,'only two active leases exist');
select ok(public.release_upload_capacity((select id from public.upload_leases limit 1)),'an upload lease can be released');
select is((select count(*) from public.upload_leases where user_id = '32000000-0000-4000-8000-000000000001'),1::bigint,'release removes one lease');
select is(public.claim_upload_capacity('32000000-0000-4000-8000-000000000001',20971520,2,20971520),null,'hourly byte quota rejects excess consumption');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','32000000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$ select public.mark_document_quarantine_removed(gen_random_uuid(),'Not permitted') $$,
  '42501','permission denied for function mark_document_quarantine_removed',
  'browser sessions cannot forge quarantine removal evidence'
);
reset role;

select * from finish();
rollback;
