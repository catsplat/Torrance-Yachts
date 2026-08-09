begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users(id,email,raw_user_meta_data)
values ('33000000-0000-4000-8000-000000000001','large.register@example.test','{"display_name":"Large Register Staff"}'::jsonb);
insert into public.contacts(id,full_name,email,roles)
values ('33000000-0000-4000-8000-000000000002','Large Register Customer','large.customer@example.test',array['customer']::public.contact_role[]);

insert into public.enquiries(reference,customer_contact_id,owner_user_id,summary,updated_at)
select 'LOAD-' || lpad(series::text,5,'0'), '33000000-0000-4000-8000-000000000002',
  '33000000-0000-4000-8000-000000000001',
  'Synthetic load record ' || series,
  now() - make_interval(secs => series)
from generate_series(1,10000) series;

set local role authenticated;
select set_config('request.jwt.claim.sub','33000000-0000-4000-8000-000000000001',true);
select is(public.count_enquiry_register(null,false,null,null,'synthetic load record'),10000::bigint,'exact register count includes all 10,000 records');
select results_eq(
  $$ select summary from public.list_enquiry_register_page(50,null,null,null,false,null,null,'Synthetic load record 10000') $$,
  array['Synthetic load record 10000'::text],
  'the oldest synthetic enquiry remains directly discoverable'
);
select results_eq(
  $$ select total_count from public.search_workspace('Synthetic load record 10000',8) where entity_type = 'enquiry' limit 1 $$,
  array[1::bigint],
  'workspace search reports an exact total for an old record'
);
select is((select count(*) from public.list_enquiry_register_page(101,null,null,null,false,null,null,'synthetic load record')),100::bigint,'register pages remain bounded at 100 rows');
select ok((select count(*) from public.enquiries where summary = 'Synthetic load record 10000') = 1,'load fixture did not lose or duplicate the historical record');
reset role;

select * from finish();
rollback;
