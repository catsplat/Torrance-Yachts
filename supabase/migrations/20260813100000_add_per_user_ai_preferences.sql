-- AI provider selection is a personal preference. Provider secrets remain in
-- Vault and are never exposed through the user-readable preference row.

create table public.user_ai_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text check (provider is null or provider in ('local', 'ollama', 'openai')),
  model text check (
    model is null
    or (char_length(model) between 1 and 128 and model ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$')
  ),
  enabled boolean not null default true,
  summary_style text not null default 'concise'
    check (summary_style in ('concise', 'detailed')),
  openai_api_key_secret_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.guard_user_ai_preferences_direct_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('app.user_ai_preferences_command', true), '') <> 'yes' then
    raise exception 'Use an approved personal AI preference command' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_user_ai_preferences
  before insert or update or delete on public.user_ai_preferences
  for each row execute function public.guard_user_ai_preferences_direct_mutation();

create or replace function public.create_user_ai_preferences()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.user_ai_preferences_command', 'yes', true);
  insert into public.user_ai_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  perform set_config('app.user_ai_preferences_command', '', true);
  return new;
end;
$$;

create trigger create_user_ai_preferences
  after insert on public.profiles
  for each row execute function public.create_user_ai_preferences();

select set_config('app.user_ai_preferences_command', 'yes', true);
insert into public.user_ai_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
select set_config('app.user_ai_preferences_command', '', true);

create or replace function public.update_my_ai_preferences(
  p_provider text,
  p_model text,
  p_enabled boolean,
  p_summary_style text
)
returns public.user_ai_preferences
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  clean_provider text := nullif(lower(trim(coalesce(p_provider, ''))), '');
  clean_model text := nullif(trim(coalesce(p_model, '')), '');
  updated_record public.user_ai_preferences;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if clean_provider is not null and clean_provider not in ('local', 'ollama', 'openai') then
    raise exception 'A supported AI provider is required' using errcode = '22023';
  end if;
  if clean_model is not null and (
    char_length(clean_model) > 128
    or clean_model !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ) then
    raise exception 'A valid model identifier is required' using errcode = '22023';
  end if;
  if p_summary_style not in ('concise', 'detailed') then
    raise exception 'A supported summary style is required' using errcode = '22023';
  end if;

  perform set_config('app.user_ai_preferences_command', 'yes', true);
  insert into public.user_ai_preferences (
    user_id, provider, model, enabled, summary_style, updated_at
  ) values (
    actor_id, clean_provider, clean_model, p_enabled, p_summary_style, now()
  )
  on conflict (user_id) do update
  set provider = excluded.provider,
      model = excluded.model,
      enabled = excluded.enabled,
      summary_style = excluded.summary_style,
      updated_at = now()
  returning * into updated_record;
  perform set_config('app.user_ai_preferences_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'UserAiPreferencesUpdated', 'profile', actor_id, actor_id,
    jsonb_build_object(
      'provider', coalesce(clean_provider, 'organisation_default'),
      'model', clean_model,
      'enabled', p_enabled,
      'summary_style', p_summary_style
    )
  );
  return updated_record;
end;
$$;

create or replace function public.save_my_openai_api_key(
  p_api_key text,
  p_reason text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  preference public.user_ai_preferences;
  secret_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_api_key, ''))) < 16 then
    raise exception 'A complete API key is required' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception 'A reason for the credential change is required' using errcode = '22023';
  end if;

  select * into preference
  from public.user_ai_preferences
  where user_id = actor_id
  for update;

  if preference.openai_api_key_secret_id is null then
    secret_id := vault.create_secret(
      trim(p_api_key),
      'torrance:' || actor_id::text || ':openai:api-key',
      'Per-user OpenAI API key'
    );
  else
    perform vault.update_secret(preference.openai_api_key_secret_id, trim(p_api_key));
    secret_id := preference.openai_api_key_secret_id;
  end if;

  perform set_config('app.user_ai_preferences_command', 'yes', true);
  update public.user_ai_preferences
  set openai_api_key_secret_id = secret_id, updated_at = now()
  where user_id = actor_id;
  perform set_config('app.user_ai_preferences_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'UserAiCredentialUpdated', 'profile', actor_id, actor_id,
    jsonb_build_object('provider', 'openai', 'reason', trim(p_reason))
  );
end;
$$;

create or replace function public.clear_my_openai_api_key(p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  secret_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception 'A reason for the credential change is required' using errcode = '22023';
  end if;

  select openai_api_key_secret_id into secret_id
  from public.user_ai_preferences
  where user_id = actor_id
  for update;

  if secret_id is not null then
    delete from vault.secrets where id = secret_id;
  end if;
  perform set_config('app.user_ai_preferences_command', 'yes', true);
  update public.user_ai_preferences
  set openai_api_key_secret_id = null, updated_at = now()
  where user_id = actor_id;
  perform set_config('app.user_ai_preferences_command', '', true);

  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'UserAiCredentialRemoved', 'profile', actor_id, actor_id,
    jsonb_build_object('provider', 'openai', 'reason', trim(p_reason))
  );
end;
$$;

create or replace function public.get_effective_user_ai_configuration(p_user_id uuid)
returns table (
  provider text,
  model text,
  enabled boolean,
  summary_style text,
  openai_api_key text,
  has_personal_openai_api_key boolean
)
language sql stable security definer set search_path = '' as $$
  select
    preference.provider,
    preference.model,
    preference.enabled,
    preference.summary_style,
    secret.decrypted_secret,
    preference.openai_api_key_secret_id is not null
  from public.user_ai_preferences preference
  left join vault.decrypted_secrets secret
    on secret.id = preference.openai_api_key_secret_id
  where current_user in ('service_role', 'postgres', 'supabase_admin')
    and preference.user_id = p_user_id;
$$;

alter table public.user_ai_preferences enable row level security;

create policy "users read own AI preferences"
  on public.user_ai_preferences for select to authenticated
  using ((select public.is_active_staff()) and user_id = (select auth.uid()));

revoke all on public.user_ai_preferences from public, anon, authenticated;
grant select (user_id, provider, model, enabled, summary_style, created_at, updated_at)
  on public.user_ai_preferences to authenticated;
grant select on public.user_ai_preferences to service_role;

revoke all on function public.guard_user_ai_preferences_direct_mutation() from public, anon, authenticated;
revoke all on function public.create_user_ai_preferences() from public, anon, authenticated;
revoke all on function public.update_my_ai_preferences(text,text,boolean,text) from public, anon;
revoke all on function public.save_my_openai_api_key(text,text) from public, anon;
revoke all on function public.clear_my_openai_api_key(text) from public, anon;
revoke all on function public.get_effective_user_ai_configuration(uuid) from public, anon, authenticated;
grant execute on function public.update_my_ai_preferences(text,text,boolean,text) to authenticated;
grant execute on function public.save_my_openai_api_key(text,text) to authenticated;
grant execute on function public.clear_my_openai_api_key(text) to authenticated;
grant execute on function public.get_effective_user_ai_configuration(uuid) to service_role;
