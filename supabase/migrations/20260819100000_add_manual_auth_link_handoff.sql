-- Manual account setup links are deliberately application-owned handoffs.
-- The Supabase OTP hash stays encrypted in Vault and is only redeemed after an
-- explicit same-origin confirmation request, so a GET-only link preview cannot
-- consume the one-time Auth token.

create table public.manual_auth_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('invite', 'recovery')),
  token_secret_id uuid references vault.secrets(id) on delete set null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  verification_lease_until timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index manual_auth_links_active_user_idx
  on public.manual_auth_links (user_id, purpose, expires_at desc)
  where consumed_at is null and revoked_at is null;

alter table public.manual_auth_links enable row level security;
revoke all on public.manual_auth_links from anon, authenticated;

create or replace function public.store_manual_auth_link(
  p_user_id uuid,
  p_purpose text,
  p_token_hash text,
  p_created_by uuid,
  p_expires_in_minutes integer default 1440
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_id uuid;
  secret_id uuid;
begin
  if p_purpose not in ('invite', 'recovery') then
    raise exception 'Unsupported manual authentication link purpose' using errcode = '22023';
  end if;
  if p_user_id is null or p_created_by is null or char_length(trim(coalesce(p_token_hash, ''))) < 16 then
    raise exception 'Manual authentication link details are invalid' using errcode = '22023';
  end if;
  if p_expires_in_minutes < 5 or p_expires_in_minutes > 1440 then
    raise exception 'Manual authentication link expiry must be between 5 minutes and 24 hours' using errcode = '22023';
  end if;

  -- A newly generated GoTrue token supersedes every prior token for this user
  -- and purpose. Revoke records first and destroy their Vault payloads.
  for secret_id in
    select token_secret_id from public.manual_auth_links
    where user_id = p_user_id and purpose = p_purpose
      and consumed_at is null and revoked_at is null and token_secret_id is not null
    for update
  loop
    delete from vault.secrets where id = secret_id;
  end loop;
  update public.manual_auth_links
    set revoked_at = now(), token_secret_id = null, updated_at = now()
    where user_id = p_user_id and purpose = p_purpose
      and consumed_at is null and revoked_at is null;

  secret_id := vault.create_secret(
    trim(p_token_hash),
    'torrance:manual-auth:' || p_user_id::text || ':' || p_purpose,
    'One-time Supabase token hash for a manually delivered account setup link'
  );
  insert into public.manual_auth_links (
    user_id, purpose, token_secret_id, expires_at, created_by
  ) values (
    p_user_id, p_purpose, secret_id,
    now() + make_interval(mins => p_expires_in_minutes), p_created_by
  ) returning id into link_id;
  insert into public.audit_events (action, actor_user_id, entity_id, entity_type, new_values, source)
  values ('create', p_created_by, link_id, 'manual_auth_link',
    jsonb_build_object('purpose', p_purpose, 'user_id', p_user_id, 'expires_at', now() + make_interval(mins => p_expires_in_minutes)),
    'application.manual_auth_link');
  return link_id;
end;
$$;

create or replace function public.get_manual_auth_link_status(p_link_id uuid)
returns table (purpose text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select link.purpose, link.expires_at
  from public.manual_auth_links link
  where link.id = p_link_id
    and link.consumed_at is null
    and link.revoked_at is null
    and link.expires_at > now()
    and (link.verification_lease_until is null or link.verification_lease_until < now());
$$;

create or replace function public.claim_manual_auth_link(p_link_id uuid)
returns table (purpose text, token_hash text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.manual_auth_links;
begin
  select * into link from public.manual_auth_links
  where id = p_link_id for update;
  if not found or link.consumed_at is not null or link.revoked_at is not null
    or link.expires_at <= now() or link.token_secret_id is null
    or (link.verification_lease_until is not null and link.verification_lease_until >= now()) then
    return;
  end if;
  update public.manual_auth_links
    set verification_lease_until = now() + interval '90 seconds', updated_at = now()
    where id = link.id;
  return query
    select link.purpose, secret.decrypted_secret
    from vault.decrypted_secrets secret where secret.id = link.token_secret_id;
end;
$$;

create or replace function public.finish_manual_auth_link(
  p_link_id uuid,
  p_succeeded boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.manual_auth_links;
begin
  select * into link from public.manual_auth_links where id = p_link_id for update;
  if not found then return false; end if;
  if p_succeeded then
    if link.token_secret_id is not null then delete from vault.secrets where id = link.token_secret_id; end if;
    update public.manual_auth_links set consumed_at = now(), token_secret_id = null,
      verification_lease_until = null, updated_at = now() where id = link.id;
    insert into public.audit_events (action, actor_user_id, entity_id, entity_type, new_values, source)
    values ('update', null, link.id, 'manual_auth_link', jsonb_build_object('purpose', link.purpose, 'outcome', 'consumed'), 'application.manual_auth_link');
  else
    update public.manual_auth_links set verification_lease_until = null, updated_at = now() where id = link.id;
  end if;
  return true;
end;
$$;

revoke all on function public.store_manual_auth_link(uuid, text, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_manual_auth_link_status(uuid) from public, anon, authenticated;
revoke all on function public.claim_manual_auth_link(uuid) from public, anon, authenticated;
revoke all on function public.finish_manual_auth_link(uuid, boolean) from public, anon, authenticated;
grant execute on function public.store_manual_auth_link(uuid, text, text, uuid, integer) to service_role;
grant execute on function public.get_manual_auth_link_status(uuid) to service_role;
grant execute on function public.claim_manual_auth_link(uuid) to service_role;
grant execute on function public.finish_manual_auth_link(uuid, boolean) to service_role;
