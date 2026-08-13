-- Personal interface preferences must be keyed to the authenticated profile,
-- never to a browser-wide cookie. This is particularly important on shared
-- office devices where separate staff members use the same browser.

create table public.user_ui_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.guard_user_ui_preferences_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.user_ui_preferences_command', true), '') <> 'yes' then
    raise exception 'Use an approved personal preference command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_user_ui_preferences
  before insert or update or delete on public.user_ui_preferences
  for each row execute function public.guard_user_ui_preferences_direct_mutation();

create or replace function public.create_user_ui_preferences()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.user_ui_preferences_command', 'yes', true);
  insert into public.user_ui_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  perform set_config('app.user_ui_preferences_command', '', true);
  return new;
end;
$$;

create trigger create_user_ui_preferences
  after insert on public.profiles
  for each row execute function public.create_user_ui_preferences();

select set_config('app.user_ui_preferences_command', 'yes', true);
insert into public.user_ui_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
select set_config('app.user_ui_preferences_command', '', true);

create or replace function public.update_my_ui_theme(p_theme text)
returns public.user_ui_preferences
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  updated_record public.user_ui_preferences;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_theme not in ('light', 'dark') then
    raise exception 'A supported interface theme is required' using errcode = '22023';
  end if;

  perform set_config('app.user_ui_preferences_command', 'yes', true);
  insert into public.user_ui_preferences (user_id, theme, updated_at)
  values (actor_id, p_theme, now())
  on conflict (user_id) do update
  set theme = excluded.theme,
      updated_at = now()
  returning * into updated_record;
  perform set_config('app.user_ui_preferences_command', '', true);
  return updated_record;
end;
$$;

alter table public.user_ui_preferences enable row level security;

create policy "users read own interface preferences"
  on public.user_ui_preferences for select to authenticated
  using (
    (select public.is_active_staff())
    and user_id = (select auth.uid())
  );

revoke all on public.user_ui_preferences from public, anon, authenticated;
grant select on public.user_ui_preferences to authenticated;
grant select on public.user_ui_preferences to service_role;

revoke all on function public.guard_user_ui_preferences_direct_mutation()
  from public, anon, authenticated;
revoke all on function public.create_user_ui_preferences()
  from public, anon, authenticated;
revoke all on function public.update_my_ui_theme(text)
  from public, anon;
grant execute on function public.update_my_ui_theme(text) to authenticated;

-- `profiles` contains private contact routing fields. Operational screens only
-- need a staff directory, so raw profile rows are no longer readable by every
-- active staff member. Administrators get the fuller account-management view
-- through an explicit, role-checked function instead of an ambient table grant.
drop policy if exists "Active staff can view internal profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Administrators can update profiles" on public.profiles;

create policy "users read own private profile"
  on public.profiles for select to authenticated
  using (
    (select public.is_active_staff())
    and id = (select auth.uid())
  );

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create or replace function public.list_active_staff_directory()
returns table (id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select profile.id, profile.display_name
  from public.profiles profile
  where public.is_active_staff()
    and profile.active
    and profile.access_approved_at is not null
  order by profile.display_name, profile.id;
$$;

create or replace function public.list_active_notification_recipient_directory()
returns table (
  id uuid,
  display_name text,
  email text,
  telegram_chat_id text
)
language sql stable security definer set search_path = '' as $$
  select
    profile.id,
    profile.display_name,
    case
      when preference.email_enabled and preference.notification_email is not null
        then 'Email alerts configured'
      else 'In-app alerts'
    end,
    case
      when preference.telegram_enabled and profile.telegram_chat_id is not null
        then 'configured'
      else null
    end
  from public.profiles profile
  join public.user_notification_preferences preference on preference.user_id = profile.id
  where public.is_active_staff()
    and profile.active
    and profile.access_approved_at is not null
  order by profile.display_name, profile.id;
$$;

create or replace function public.list_internal_user_administration_records()
returns table (
  id uuid,
  display_name text,
  email text,
  phone text,
  telegram_chat_id text,
  role public.user_role,
  active boolean,
  access_approved_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    profile.id,
    profile.display_name,
    profile.email,
    profile.phone,
    profile.telegram_chat_id,
    profile.role,
    profile.active,
    profile.access_approved_at
  from public.profiles profile
  where public.is_administrator()
  order by profile.active desc, profile.display_name, profile.id;
$$;

revoke all on function public.list_active_staff_directory() from public, anon;
revoke all on function public.list_active_notification_recipient_directory() from public, anon;
revoke all on function public.list_internal_user_administration_records() from public, anon;
grant execute on function public.list_active_staff_directory() to authenticated;
grant execute on function public.list_active_notification_recipient_directory() to authenticated;
grant execute on function public.list_internal_user_administration_records() to authenticated;

-- Personal notification receipts—including their read state—belong only to
-- their recipient or creator. Team-level delivery diagnostics remain available
-- through their separate operational registers and audit log.
drop policy if exists "users read relevant notifications" on public.notifications;
create policy "users read own notification receipts"
  on public.notifications for select to authenticated
  using (
    (select public.is_active_staff())
    and (
      recipient_user_id = (select auth.uid())
      or created_by = (select auth.uid())
      -- Approval-held external drafts are shared operational work, rather
      -- than a staff member's personal receipt. Administrators may review
      -- those drafts without gaining access to private in-app alerts.
      or (requires_approval and (select public.is_administrator()))
    )
  );
