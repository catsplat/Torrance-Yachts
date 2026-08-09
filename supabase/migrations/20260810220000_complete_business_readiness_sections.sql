-- Complete the redacted business-readiness snapshot with operational routing,
-- Google destination, and document-policy signals.

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
    'configured_alert_routes', (
      select count(*)
      from public.profiles profile
      join public.user_notification_preferences preference on preference.user_id = profile.id
      where profile.active
        and profile.access_approved_at is not null
        and (
          preference.telegram_enabled and profile.telegram_chat_id is not null
          or preference.email_enabled and preference.notification_email is not null
        )
    ),
    'connected_google_accounts', (select count(*) from public.user_oauth_connections where provider = 'gmail' and status = 'connected'),
    'configured_google_destinations', (
      select count(*) from public.integration_connections
      where provider in ('google_calendar', 'google_drive', 'google_sheets')
        and enabled
        and target_reference is not null
    ),
    'approved_task_templates', (select count(*) from public.task_templates where status = 'approved'),
    'new_enquiry_timeout_days', (select new_enquiry_timeout_days from public.operational_settings limit 1),
    'document_policy_accepted', (
      select count(*) = 2
      from public.launch_readiness_checks
      where check_key in ('retention_policy', 'document_security')
        and status in ('passed', 'waived')
    )
  );
end;
$$;

revoke all on function public.get_business_readiness() from public, anon;
grant execute on function public.get_business_readiness() to authenticated;

select set_config('app.phase12_command', 'yes', true);
update public.launch_readiness_checks
set description = 'The private scheduler holds no Google or Telegram credentials, imports only reviewed inactive workflows, has protected administration, backups, health monitoring, and a completed security audit.',
    updated_at = now()
where check_key = 'n8n_production';
select set_config('app.phase12_command', '', true);
