begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select has_function('public','get_business_readiness',array[]::text[],'business readiness contract exists');

insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
values (
  '35000000-0000-4000-8000-000000000001','readiness.admin@example.test',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Readiness Admin"}'::jsonb
);
update public.profiles set role = 'administrator', active = true,
  access_approved_at = now(), access_approved_by = id
where id = '35000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','35000000-0000-4000-8000-000000000001',true);
select ok(jsonb_typeof(public.get_business_readiness()) = 'object','administrator receives a redacted object');
select ok(public.get_business_readiness() ? 'connected_google_accounts','snapshot reports connection readiness without credentials');
select ok(not public.get_business_readiness() ? 'refresh_token','snapshot never returns OAuth token values');

select * from finish();
rollback;
