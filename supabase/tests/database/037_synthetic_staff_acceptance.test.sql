begin;
select plan(5);

select has_function('public','prepare_synthetic_acceptance_staff',array['uuid'],'synthetic staff preparation exists');
select function_privs_are('public','prepare_synthetic_acceptance_staff',array['uuid'],'service_role',array['EXECUTE'],'only service role can execute the staff harness');

insert into auth.users (id,email,raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000093','browser-staff@example.test','{"display_name":"Browser Staff"}'::jsonb),
  ('10000000-0000-0000-0000-000000000094','unsafe@example.com','{"display_name":"Unsafe"}'::jsonb);

set local role service_role;
select lives_ok($$select public.prepare_synthetic_acceptance_staff('10000000-0000-0000-0000-000000000093')$$,'service role prepares reserved staff');
select throws_ok($$select public.prepare_synthetic_acceptance_staff('10000000-0000-0000-0000-000000000094')$$,'22023','Acceptance identities must use the reserved example.test domain','real domains are rejected');
reset role;

select results_eq(
  $$select role::text, active, access_approved_at is not null from public.profiles where id = '10000000-0000-0000-0000-000000000093'$$,
  $$values ('staff'::text,true,true)$$,
  'the reserved identity is active approved staff'
);

select * from finish();
rollback;
