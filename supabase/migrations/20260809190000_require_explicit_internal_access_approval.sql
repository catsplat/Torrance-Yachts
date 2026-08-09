-- Require explicit internal approval independently of a successful Auth login.

alter table public.profiles
  add column access_approved_at timestamptz,
  add column access_approved_by uuid references public.profiles (id) on delete set null;

-- Every account that predates this boundary was created through the existing
-- administrator-controlled bootstrap or invitation flow.
update public.profiles
set access_approved_at = coalesce(updated_at, created_at, now());

create index profiles_active_approved_idx
  on public.profiles (active, access_approved_at)
  where active and access_approved_at is not null;

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
      and access_approved_at is not null
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
      and access_approved_at is not null
      and role = 'administrator'
  );
$$;

create or replace function public.should_approve_new_internal_profile(
  p_invited_at timestamptz,
  p_initial_setup_pending boolean,
  p_trusted_database_insert boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_invited_at is not null or p_trusted_database_insert)
    and not p_initial_setup_pending;
$$;

revoke all on function public.should_approve_new_internal_profile(
  timestamptz, boolean, boolean
) from public, anon, authenticated;

create or replace function public.approve_internal_user_invitation(
  p_user_id uuid,
  p_approved_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_profile public.profiles;
  approved_profile public.profiles;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_approved_by
      and active
      and access_approved_at is not null
      and role = 'administrator'
  ) then
    return false;
  end if;

  select * into previous_profile
  from public.profiles
  where id = p_user_id
  for update;
  if not found then
    return false;
  end if;

  update public.profiles
  set active = true,
      access_approved_at = coalesce(access_approved_at, now()),
      access_approved_by = coalesce(access_approved_by, p_approved_by)
  where id = p_user_id
  returning * into approved_profile;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, old_values, new_values, source
  ) values (
    p_approved_by,
    'update',
    'profile',
    p_user_id,
    to_jsonb(previous_profile),
    to_jsonb(approved_profile),
    'internal_user_invitation'
  );

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InternalUserInvitationApproved',
    'profile',
    p_user_id,
    p_approved_by,
    jsonb_build_object('approved_at', approved_profile.access_approved_at)
  );

  return true;
end;
$$;

revoke all on function public.approve_internal_user_invitation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_internal_user_invitation(uuid, uuid)
  to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_database_insert boolean := session_user in ('postgres', 'supabase_admin');
  initial_setup_pending boolean :=
    coalesce(new.raw_user_meta_data ->> '_initial_setup_pending', 'false') = 'true';
  access_is_approved boolean;
begin
  access_is_approved := public.should_approve_new_internal_profile(
    new.invited_at,
    initial_setup_pending,
    trusted_database_insert
  );

  insert into public.profiles (
    id,
    display_name,
    email,
    active,
    access_approved_at
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(lower(new.email), '@', 1), ''),
      'Internal user'
    ),
    lower(new.email),
    access_is_approved,
    case
      when access_is_approved then coalesce(new.invited_at, now())
      else null
    end
  );

  return new;
end;
$$;

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
    and (
      new.role is distinct from old.role
      or new.active is distinct from old.active
    )
  then
    raise exception 'Only administrators can change role or active status'
      using errcode = '42501';
  end if;

  if current_user not in ('postgres', 'supabase_admin', 'service_role')
    and (
      new.access_approved_at is distinct from old.access_approved_at
      or new.access_approved_by is distinct from old.access_approved_by
    )
  then
    raise exception 'Access approval is managed by an administrator command'
      using errcode = '42501';
  end if;

  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.update_internal_user(
  p_user_id uuid,
  p_display_name text,
  p_phone text,
  p_telegram_chat_id text,
  p_role public.user_role,
  p_active boolean,
  p_reason text
)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  current_profile public.profiles;
  updated_profile public.profiles;
  other_administrators integer;
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if char_length(trim(p_display_name)) not between 2 and 100
     or char_length(trim(p_reason)) < 2 then
    raise exception 'Display name and review reason are required' using errcode = '22023';
  end if;

  select * into current_profile
  from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Internal user not found' using errcode = 'P0002';
  end if;
  if p_user_id = (select auth.uid())
     and (not p_active or p_role <> 'administrator') then
    raise exception 'Administrators cannot remove their own recovery access'
      using errcode = '23514';
  end if;

  if current_profile.active and current_profile.role = 'administrator'
     and (not p_active or p_role <> 'administrator') then
    select count(*) into other_administrators
    from public.profiles
    where active
      and access_approved_at is not null
      and role = 'administrator'
      and id <> p_user_id;
    if other_administrators = 0 then
      raise exception 'At least one active administrator is required'
        using errcode = '23514';
    end if;
  end if;

  update public.profiles
  set display_name = trim(p_display_name),
      phone = nullif(trim(p_phone), ''),
      telegram_chat_id = nullif(trim(p_telegram_chat_id), ''),
      role = p_role,
      active = p_active,
      access_approved_at = case
        when p_active then coalesce(access_approved_at, now())
        else access_approved_at
      end,
      access_approved_by = case
        when p_active and access_approved_at is null then (select auth.uid())
        else access_approved_by
      end
  where id = p_user_id
  returning * into updated_profile;

  insert into public.audit_events (
    actor_user_id, action, entity_type, entity_id, old_values, new_values, source
  ) values (
    (select auth.uid()), 'update', 'profile', p_user_id,
    to_jsonb(current_profile), to_jsonb(updated_profile), 'user_administration'
  );
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InternalUserUpdated', 'profile', p_user_id, (select auth.uid()),
    jsonb_build_object(
      'reason', trim(p_reason),
      'role', p_role,
      'active', p_active,
      'access_approved', updated_profile.access_approved_at is not null
    )
  );
  return updated_profile;
end;
$$;

create or replace function public.complete_initial_administrator(
  p_user_id uuid,
  p_display_name text,
  p_phone text,
  p_telegram_chat_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(p_display_name);
  clean_phone text := nullif(trim(p_phone), '');
  clean_telegram text := nullif(trim(p_telegram_chat_id), '');
begin
  if char_length(clean_name) not between 2 and 100
     or (clean_phone is not null and char_length(clean_phone) not between 7 and 32)
     or (clean_telegram is not null and char_length(clean_telegram) not between 1 and 64)
  then
    raise exception 'Invalid initial administrator profile values' using errcode = '22023';
  end if;

  if (select count(*) from public.profiles) <> 1
     or not exists (
       select 1 from public.profiles
       where id = p_user_id
         and active = false
         and access_approved_at is null
         and role = 'staff'
     )
  then
    return false;
  end if;

  update public.profiles
  set active = true,
      access_approved_at = now(),
      access_approved_by = p_user_id,
      display_name = clean_name,
      phone = clean_phone,
      role = 'administrator',
      telegram_chat_id = clean_telegram
  where id = p_user_id;

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'InitialAdministratorCreated', 'profile', p_user_id, p_user_id,
    jsonb_build_object('setup_method', 'one_time_token')
  );

  return true;
end;
$$;
