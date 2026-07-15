-- Phase 2: individual identities, yacht records, database authorization, and audit history.

create type public.user_role as enum ('administrator', 'staff');
create type public.yacht_operational_status as enum ('active', 'inactive', 'maintenance');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  email text not null check (email = lower(email) and char_length(email) <= 320),
  phone text check (phone is null or char_length(phone) between 7 and 32),
  telegram_chat_id text check (
    telegram_chat_id is null or char_length(telegram_chat_id) between 1 and 64
  ),
  role public.user_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique_idx on public.profiles (lower(email));

create table public.yachts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  builder text check (builder is null or char_length(trim(builder)) between 2 and 120),
  year_built smallint check (year_built is null or year_built between 1900 and 2100),
  length_metres numeric(6, 2) check (length_metres is null or length_metres > 0),
  beam_metres numeric(5, 2) check (beam_metres is null or beam_metres > 0),
  guest_capacity smallint check (guest_capacity is null or guest_capacity > 0),
  cabin_count smallint check (cabin_count is null or cabin_count > 0),
  crew_count smallint check (crew_count is null or crew_count > 0),
  cruise_speed_knots numeric(5, 2) check (
    cruise_speed_knots is null or cruise_speed_knots > 0
  ),
  max_speed_knots numeric(5, 2) check (
    max_speed_knots is null
    or max_speed_knots > 0
    and (cruise_speed_knots is null or max_speed_knots >= cruise_speed_knots)
  ),
  home_port text check (home_port is null or char_length(trim(home_port)) <= 120),
  preferred_ports text[] not null default '{}',
  notification_phone text check (
    notification_phone is null or char_length(notification_phone) between 7 and 32
  ),
  status public.yacht_operational_status not null default 'active',
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index yachts_name_unique_idx on public.yachts (lower(name));
create index yachts_status_idx on public.yachts (status);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  source text not null default 'database' check (char_length(source) between 2 and 80),
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_actor_idx
  on public.audit_events (actor_user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.yachts enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and active = true
  );
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and active = true
      and role = 'administrator'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(lower(new.email), '@', 1), ''),
      'Internal user'
    ),
    lower(new.email)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception 'Profile identity fields are managed by authentication'
      using errcode = '42501';
  end if;

  if current_user not in ('postgres', 'supabase_admin', 'service_role')
    and not public.is_administrator()
    and (new.role is distinct from old.role or new.active is distinct from old.active)
  then
    raise exception 'Only administrators can change role or active status'
      using errcode = '42501';
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_authorization_fields
  before update on public.profiles
  for each row execute function public.protect_profile_authorization_fields();

create or replace function public.set_yacht_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := trim(new.name);
  new.builder := nullif(trim(new.builder), '');
  new.home_port := nullif(trim(new.home_port), '');
  new.notification_phone := nullif(trim(new.notification_phone), '');

  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.created_at := coalesce(new.created_at, now());
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_yacht_audit_fields
  before insert or update on public.yachts
  for each row execute function public.set_yacht_audit_fields();

create or replace function public.audit_yacht_change()
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
    'yacht',
    changed_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger audit_yacht_change
  after insert or update or delete on public.yachts
  for each row execute function public.audit_yacht_change();

create policy "Active staff can view internal profiles"
  on public.profiles
  for select
  to authenticated
  using ((select public.is_active_staff()));

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_active_staff()) and id = (select auth.uid()))
  with check ((select public.is_active_staff()) and id = (select auth.uid()));

create policy "Administrators can update profiles"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_administrator()))
  with check ((select public.is_administrator()));

create policy "Active staff can view yachts"
  on public.yachts
  for select
  to authenticated
  using ((select public.is_active_staff()));

create policy "Active staff can add yachts"
  on public.yachts
  for insert
  to authenticated
  with check (
    (select public.is_active_staff())
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy "Active staff can update yachts"
  on public.yachts
  for update
  to authenticated
  using ((select public.is_active_staff()))
  with check (
    (select public.is_active_staff())
    and updated_by = (select auth.uid())
  );

create policy "Administrators can delete yachts"
  on public.yachts
  for delete
  to authenticated
  using ((select public.is_administrator()));

create policy "Active staff can view audit events"
  on public.audit_events
  for select
  to authenticated
  using ((select public.is_active_staff()));

revoke all on public.profiles from anon, authenticated;
revoke all on public.yachts from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.yachts to authenticated;
grant select on public.audit_events to authenticated;

revoke all on function public.is_active_staff() from public, anon;
revoke all on function public.is_administrator() from public, anon;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_administrator() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_authorization_fields() from public, anon, authenticated;
revoke all on function public.set_yacht_audit_fields() from public, anon, authenticated;
revoke all on function public.audit_yacht_change() from public, anon, authenticated;
