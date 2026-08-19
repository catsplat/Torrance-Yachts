-- `audit_events.action` is deliberately constrained to database mutation
-- verbs. Keep manual-link events within that shared audit contract.

create or replace function public.store_manual_auth_link(
  p_user_id uuid,
  p_purpose text,
  p_token_hash text,
  p_created_by uuid,
  p_expires_in_minutes integer default 1440
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare link_id uuid; secret_id uuid;
begin
  if p_purpose not in ('invite', 'recovery') then raise exception 'Unsupported manual authentication link purpose' using errcode = '22023'; end if;
  if p_user_id is null or p_created_by is null or char_length(trim(coalesce(p_token_hash, ''))) < 16 then raise exception 'Manual authentication link details are invalid' using errcode = '22023'; end if;
  if p_expires_in_minutes < 5 or p_expires_in_minutes > 1440 then raise exception 'Manual authentication link expiry must be between 5 minutes and 24 hours' using errcode = '22023'; end if;

  for secret_id in
    select token_secret_id from public.manual_auth_links
    where user_id = p_user_id and purpose = p_purpose and consumed_at is null and revoked_at is null and token_secret_id is not null
    for update
  loop
    delete from vault.secrets where id = secret_id;
  end loop;
  update public.manual_auth_links set revoked_at = now(), token_secret_id = null, updated_at = now()
  where user_id = p_user_id and purpose = p_purpose and consumed_at is null and revoked_at is null;

  secret_id := vault.create_secret(trim(p_token_hash), 'torrance:manual-auth:' || p_user_id::text || ':' || p_purpose,
    'One-time Supabase token hash for a manually delivered account setup link');
  insert into public.manual_auth_links (user_id, purpose, token_secret_id, expires_at, created_by)
  values (p_user_id, p_purpose, secret_id, now() + make_interval(mins => p_expires_in_minutes), p_created_by)
  returning id into link_id;
  insert into public.audit_events (action, actor_user_id, entity_id, entity_type, new_values, source)
  values ('insert', p_created_by, link_id, 'manual_auth_link',
    jsonb_build_object('purpose', p_purpose, 'user_id', p_user_id, 'expires_at', now() + make_interval(mins => p_expires_in_minutes)),
    'application.manual_auth_link');
  return link_id;
end;
$$;
