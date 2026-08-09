-- One redacted readiness snapshot replaces direct browser queries across
-- configuration and credential-adjacent tables.

create or replace function public.get_business_readiness()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_administrator() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'companies', (select count(*) from public.companies where active),
    'yachts', (select count(*) from public.yachts where status = 'active'),
    'primary_captains', (select count(*) from public.yacht_contacts where responsibility = 'captain' and is_primary),
    'active_rates', (select count(*) from public.yacht_rate_periods where active),
    'approved_offer_templates', (select count(*) from public.yacht_offer_templates where status = 'approved'),
    'approved_communication_templates', (select count(*) from public.communication_templates where status = 'approved'),
    'approved_invoice_profiles', (select count(*) from public.invoice_profiles where status = 'approved'),
    'approved_staff', (select count(*) from public.profiles where active and access_approved_at is not null),
    'connected_google_accounts', (select count(*) from public.user_oauth_connections where provider = 'gmail' and status = 'connected'),
    'approved_task_templates', (select count(*) from public.task_templates where status = 'approved'),
    'new_enquiry_timeout_days', (select new_enquiry_timeout_days from public.operational_settings limit 1)
  );
end;
$$;

revoke all on function public.get_business_readiness() from public, anon;
grant execute on function public.get_business_readiness() to authenticated;
