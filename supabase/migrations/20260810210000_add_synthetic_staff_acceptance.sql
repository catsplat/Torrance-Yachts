-- Reserved browser-acceptance helper. It is service-only and can never approve
-- an address outside the non-routable example.test domain.
create function public.prepare_synthetic_acceptance_staff(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare account_email text;
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Trusted acceptance harness required' using errcode = '42501';
  end if;
  select email into account_email from public.profiles where id = p_user_id;
  if account_email is null or account_email !~ '@example\.test$' then
    raise exception 'Acceptance identities must use the reserved example.test domain'
      using errcode = '22023';
  end if;
  update public.profiles set active = true, role = 'staff',
    access_approved_at = now(), access_approved_by = p_user_id
  where id = p_user_id;
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'SyntheticAcceptanceStaffPrepared','profile',p_user_id,null,
    jsonb_build_object('synthetic',true)
  );
end;
$$;

revoke all on function public.prepare_synthetic_acceptance_staff(uuid)
  from public, anon, authenticated;
grant execute on function public.prepare_synthetic_acceptance_staff(uuid) to service_role;
