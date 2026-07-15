-- Phase 3: contacts, companies, and explicit yacht-contact responsibilities.

create type public.contact_role as enum (
  'customer',
  'charterer',
  'broker',
  'captain',
  'crew',
  'operations',
  'supplier',
  'other'
);

create type public.yacht_contact_responsibility as enum (
  'captain',
  'manager',
  'operations',
  'notification_recipient',
  'crew',
  'other'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  email text check (
    email is null
    or email = lower(email)
    and char_length(email) <= 320
  ),
  phone text check (phone is null or char_length(phone) between 7 and 32),
  website text check (
    website is null
    or website ~ '^https?://'
    and char_length(website) <= 500
  ),
  active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index companies_name_unique_idx on public.companies (lower(name));
create index companies_active_name_idx on public.companies (active, name);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text check (
    email is null
    or email = lower(email)
    and char_length(email) <= 320
  ),
  phone text check (phone is null or char_length(phone) between 7 and 32),
  roles public.contact_role[] not null check (
    cardinality(roles) between 1 and 8
    and array_position(roles, null) is null
  ),
  active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contacts_email_unique_idx
  on public.contacts (lower(email))
  where email is not null;
create index contacts_active_name_idx on public.contacts (active, full_name);
create index contacts_roles_idx on public.contacts using gin (roles);

create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  job_title text check (job_title is null or char_length(trim(job_title)) <= 160),
  is_primary boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, contact_id)
);

create unique index company_contacts_one_primary_company_idx
  on public.company_contacts (contact_id)
  where is_primary = true;
create index company_contacts_company_idx on public.company_contacts (company_id);
create index company_contacts_contact_idx on public.company_contacts (contact_id);

create table public.yacht_contacts (
  id uuid primary key default gen_random_uuid(),
  yacht_id uuid not null references public.yachts (id) on delete restrict,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  responsibility public.yacht_contact_responsibility not null,
  is_primary boolean not null default false,
  notifications_enabled boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yacht_id, contact_id, responsibility)
);

create unique index yacht_contacts_one_primary_responsibility_idx
  on public.yacht_contacts (yacht_id, responsibility)
  where is_primary = true;
create index yacht_contacts_yacht_idx on public.yacht_contacts (yacht_id);
create index yacht_contacts_contact_idx on public.yacht_contacts (contact_id);

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.company_contacts enable row level security;
alter table public.yacht_contacts enable row level security;

create or replace function public.set_directory_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  new.updated_by := coalesce((select auth.uid()), new.updated_by, new.created_by);
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.normalise_company()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := trim(new.name);
  new.email := nullif(lower(trim(new.email)), '');
  new.phone := nullif(trim(new.phone), '');
  new.website := nullif(trim(new.website), '');
  new.notes := nullif(trim(new.notes), '');
  return new;
end;
$$;

create or replace function public.normalise_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name := trim(new.full_name);
  new.email := nullif(lower(trim(new.email)), '');
  new.phone := nullif(trim(new.phone), '');
  new.notes := nullif(trim(new.notes), '');
  return new;
end;
$$;

create or replace function public.normalise_company_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.job_title := nullif(trim(new.job_title), '');
  return new;
end;
$$;

create or replace function public.normalise_yacht_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.notes := nullif(trim(new.notes), '');
  return new;
end;
$$;

create or replace function public.audit_directory_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_id uuid;
begin
  changed_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_events (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  )
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_argv[0],
    changed_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger a_normalise_company
  before insert or update on public.companies
  for each row execute function public.normalise_company();
create trigger b_set_company_audit_fields
  before insert or update on public.companies
  for each row execute function public.set_directory_audit_fields();
create trigger audit_company_change
  after insert or update or delete on public.companies
  for each row execute function public.audit_directory_change('company');

create trigger a_normalise_contact
  before insert or update on public.contacts
  for each row execute function public.normalise_contact();
create trigger b_set_contact_audit_fields
  before insert or update on public.contacts
  for each row execute function public.set_directory_audit_fields();
create trigger audit_contact_change
  after insert or update or delete on public.contacts
  for each row execute function public.audit_directory_change('contact');

create trigger a_normalise_company_contact
  before insert or update on public.company_contacts
  for each row execute function public.normalise_company_contact();
create trigger b_set_company_contact_audit_fields
  before insert or update on public.company_contacts
  for each row execute function public.set_directory_audit_fields();
create trigger audit_company_contact_change
  after insert or update or delete on public.company_contacts
  for each row execute function public.audit_directory_change('company_contact');

create trigger a_normalise_yacht_contact
  before insert or update on public.yacht_contacts
  for each row execute function public.normalise_yacht_contact();
create trigger b_set_yacht_contact_audit_fields
  before insert or update on public.yacht_contacts
  for each row execute function public.set_directory_audit_fields();
create trigger audit_yacht_contact_change
  after insert or update or delete on public.yacht_contacts
  for each row execute function public.audit_directory_change('yacht_contact');

create policy "Active staff can view companies"
  on public.companies for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add companies"
  on public.companies for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can update companies"
  on public.companies for update to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );
create policy "Administrators can delete companies"
  on public.companies for delete to authenticated
  using ((select public.is_administrator()));

create policy "Active staff can view contacts"
  on public.contacts for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add contacts"
  on public.contacts for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can update contacts"
  on public.contacts for update to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );
create policy "Administrators can delete contacts"
  on public.contacts for delete to authenticated
  using ((select public.is_administrator()));

create policy "Active staff can view company relationships"
  on public.company_contacts for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add company relationships"
  on public.company_contacts for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can update company relationships"
  on public.company_contacts for update to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can remove company relationships"
  on public.company_contacts for delete to authenticated
  using ((select public.is_active_staff()));

create policy "Active staff can view yacht relationships"
  on public.yacht_contacts for select to authenticated
  using ((select public.is_active_staff()));
create policy "Active staff can add yacht relationships"
  on public.yacht_contacts for insert to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can update yacht relationships"
  on public.yacht_contacts for update to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );
create policy "Active staff can remove yacht relationships"
  on public.yacht_contacts for delete to authenticated
  using ((select public.is_active_staff()));

revoke all on public.companies from anon, authenticated;
revoke all on public.contacts from anon, authenticated;
revoke all on public.company_contacts from anon, authenticated;
revoke all on public.yacht_contacts from anon, authenticated;

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.company_contacts to authenticated;
grant select, insert, update, delete on public.yacht_contacts to authenticated;

revoke all on function public.set_directory_audit_fields() from public, anon, authenticated;
revoke all on function public.normalise_company() from public, anon, authenticated;
revoke all on function public.normalise_contact() from public, anon, authenticated;
revoke all on function public.normalise_company_contact() from public, anon, authenticated;
revoke all on function public.normalise_yacht_contact() from public, anon, authenticated;
revoke all on function public.audit_directory_change() from public, anon, authenticated;
