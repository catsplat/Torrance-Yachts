begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

select has_table('public', 'companies', 'companies table exists');
select has_table('public', 'contacts', 'contacts table exists');
select has_table('public', 'company_contacts', 'company relationships table exists');
select has_table('public', 'yacht_contacts', 'yacht relationships table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.companies'::regclass),
  'companies has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.contacts'::regclass),
  'contacts has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.company_contacts'::regclass),
  'company relationships have RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.yacht_contacts'::regclass),
  'yacht relationships have RLS enabled'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '11000000-0000-0000-0000-000000000001',
    'directory.staff@example.test',
    '{"display_name":"Directory Staff"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000002',
    'directory.admin@example.test',
    '{"display_name":"Directory Administrator"}'::jsonb
  ),
  (
    '11000000-0000-0000-0000-000000000003',
    'directory.inactive@example.test',
    '{"display_name":"Inactive Directory User"}'::jsonb
  );

update public.profiles
set role = 'administrator'
where id = '11000000-0000-0000-0000-000000000002';

update public.profiles
set active = false
where id = '11000000-0000-0000-0000-000000000003';

insert into public.yachts (id, name, status)
values ('21000000-0000-0000-0000-000000000001', 'Directory Test Yacht', 'active');

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';

select throws_ok(
  $$ select count(*) from public.contacts $$,
  '42501',
  'permission denied for table contacts',
  'anonymous requests have no contact table privilege'
);

select throws_ok(
  $$ select count(*) from public.companies $$,
  '42501',
  'permission denied for table companies',
  'anonymous requests have no company table privilege'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    insert into public.companies (id, name)
    values ('31000000-0000-0000-0000-000000000001', 'Directory Test Company')
  $$,
  'active staff can create companies'
);

select lives_ok(
  $$
    insert into public.contacts (id, full_name, email, roles)
    values (
      '41000000-0000-0000-0000-000000000001',
      'Directory Test Contact',
      'directory.contact@example.test',
      array['broker', 'customer']::public.contact_role[]
    )
  $$,
  'active staff can create contacts'
);

select ok(
  (
    select roles @> array['broker', 'customer']::public.contact_role[]
    from public.contacts
    where id = '41000000-0000-0000-0000-000000000001'
  ),
  'one contact can hold multiple roles'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '41000000-0000-0000-0000-000000000001'
      and action = 'insert'
      and actor_user_id = '11000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'contact creation produces an attributed audit event'
);

select lives_ok(
  $$
    insert into public.company_contacts (
      id,
      company_id,
      contact_id,
      job_title,
      is_primary
    )
    values (
      '51000000-0000-0000-0000-000000000001',
      '31000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      'Test broker',
      true
    )
  $$,
  'active staff can link contacts to companies'
);

select lives_ok(
  $$
    insert into public.yacht_contacts (
      id,
      yacht_id,
      contact_id,
      responsibility,
      is_primary
    )
    values (
      '61000000-0000-0000-0000-000000000001',
      '21000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000001',
      'captain',
      true
    )
  $$,
  'active staff can link contacts to yachts'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '51000000-0000-0000-0000-000000000001'
      and action = 'insert'
      and actor_user_id = '11000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'relationship creation produces an attributed audit event'
);

select throws_ok(
  $$
    insert into public.contacts (full_name, email, roles)
    values (
      'Duplicate Email Contact',
      'directory.contact@example.test',
      array['other']::public.contact_role[]
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "contacts_email_unique_idx"',
  'duplicate contact email is rejected'
);

insert into public.companies (id, name)
values ('31000000-0000-0000-0000-000000000002', 'Second Directory Company');

select throws_ok(
  $$
    insert into public.company_contacts (
      company_id,
      contact_id,
      is_primary
    )
    values (
      '31000000-0000-0000-0000-000000000002',
      '41000000-0000-0000-0000-000000000001',
      true
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "company_contacts_one_primary_company_idx"',
  'a contact cannot have two primary companies'
);

insert into public.contacts (id, full_name, roles)
values (
  '41000000-0000-0000-0000-000000000002',
  'Second Directory Captain',
  array['captain']::public.contact_role[]
);

select throws_ok(
  $$
    insert into public.yacht_contacts (
      yacht_id,
      contact_id,
      responsibility,
      is_primary
    )
    values (
      '21000000-0000-0000-0000-000000000001',
      '41000000-0000-0000-0000-000000000002',
      'captain',
      true
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "yacht_contacts_one_primary_responsibility_idx"',
  'a yacht cannot have two primary contacts for one responsibility'
);

select lives_ok(
  $$
    update public.contacts
    set roles = array['broker', 'operations']::public.contact_role[]
    where id = '41000000-0000-0000-0000-000000000001'
  $$,
  'active staff can update contact roles'
);

select results_eq(
  $$
    delete from public.company_contacts
    where id = '51000000-0000-0000-0000-000000000001'
    returning id
  $$,
  array['51000000-0000-0000-0000-000000000001'::uuid],
  'active staff can remove a company relationship'
);

select results_eq(
  $$
    select count(*)
    from public.audit_events
    where entity_id = '51000000-0000-0000-0000-000000000001'
      and action = 'delete'
      and actor_user_id = '11000000-0000-0000-0000-000000000001'
  $$,
  array[1::bigint],
  'relationship removal produces an attributed audit event'
);

select is_empty(
  $$
    delete from public.contacts
    where id = '41000000-0000-0000-0000-000000000001'
    returning id
  $$,
  'staff cannot delete contact records'
);

set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000003';

select results_eq(
  $$ select count(*) from public.contacts $$,
  array[0::bigint],
  'inactive users cannot read contacts'
);

set local "request.jwt.claim.sub" = '11000000-0000-0000-0000-000000000002';

select lives_ok(
  $$
    delete from public.yacht_contacts
    where id = '61000000-0000-0000-0000-000000000001'
  $$,
  'administrators can remove yacht relationships before deleting a contact'
);

select results_eq(
  $$
    delete from public.contacts
    where id = '41000000-0000-0000-0000-000000000001'
    returning id
  $$,
  array['41000000-0000-0000-0000-000000000001'::uuid],
  'administrators can delete unlinked contacts'
);

select results_eq(
  $$
    delete from public.companies
    where id = '31000000-0000-0000-0000-000000000001'
    returning id
  $$,
  array['31000000-0000-0000-0000-000000000001'::uuid],
  'administrators can delete unlinked companies'
);

select * from finish();
rollback;
