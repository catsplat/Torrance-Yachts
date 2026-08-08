-- Allow trusted server routes to use a staff member's encrypted Google
-- Workspace connection when listing resources for an explicit user choice.

create or replace function public.get_user_google_workspace_credentials(
  p_user_id uuid
)
returns table (
  account_email text,
  client_id text,
  client_secret text,
  refresh_token text,
  scopes text[]
)
language sql security definer set search_path = '' as $$
  select
    connection.account_email,
    client_id.decrypted_secret,
    client_secret.decrypted_secret,
    refresh_token.decrypted_secret,
    connection.scopes
  from public.user_oauth_connections connection
  join vault.decrypted_secrets client_id
    on client_id.id = connection.client_id_secret_id
  join vault.decrypted_secrets client_secret
    on client_secret.id = connection.client_secret_secret_id
  join vault.decrypted_secrets refresh_token
    on refresh_token.id = connection.refresh_token_secret_id
  where connection.user_id = p_user_id
    and connection.provider = 'gmail'
    and connection.status = 'connected'
    and current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

revoke all on function public.get_user_google_workspace_credentials(uuid)
  from public, anon, authenticated;
grant execute on function public.get_user_google_workspace_credentials(uuid)
  to service_role;
