-- AI requests for email triage inherit the same mailbox visibility boundary as
-- the source message. The service worker may process the request, but staff
-- cannot create or read a request for somebody else's private email.

create or replace function public.request_ai_analysis(
  p_request_key text,
  p_analysis_kind public.ai_analysis_kind,
  p_source_type text,
  p_source_id uuid,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_input_sha256 text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  run_id uuid;
begin
  if not public.is_active_staff() then
    raise exception 'An active internal account is required' using errcode = '42501';
  end if;
  if p_analysis_kind = 'email_triage' and (
    p_source_type <> 'email_message'
    or not public.can_read_email_message(p_source_id)
  ) then
    raise exception 'Email analysis requires an email message you are allowed to review'
      using errcode = '23514';
  end if;
  if p_analysis_kind = 'contract_extraction' and (
    p_source_type <> 'document'
    or not exists (
      select 1 from public.documents
      where id = p_source_id
        and document_type = 'charter_agreement'
        and verification_status = 'verified'
    )
  ) then
    raise exception 'Contract extraction requires a verified charter agreement'
      using errcode = '23514';
  end if;
  select id into run_id from public.ai_runs where request_key = trim(p_request_key);
  if found then return run_id; end if;
  perform set_config('app.phase10_command', 'yes', true);
  insert into public.ai_runs (
    request_key, analysis_kind, source_type, source_id, provider, model,
    prompt_version, input_sha256, requested_by
  ) values (
    trim(p_request_key), p_analysis_kind, p_source_type, p_source_id,
    lower(trim(p_provider)), trim(p_model), lower(trim(p_prompt_version)),
    lower(trim(p_input_sha256)), (select auth.uid())
  ) returning id into run_id;
  perform set_config('app.phase10_command', '', true);
  insert into public.workflow_events (
    event_type, aggregate_type, aggregate_id, actor_user_id, payload
  ) values (
    'AIAnalysisRequested', p_source_type, p_source_id, (select auth.uid()),
    jsonb_build_object(
      'run_id', run_id,
      'analysis_kind', p_analysis_kind,
      'provider', lower(trim(p_provider)),
      'model', trim(p_model),
      'prompt_version', lower(trim(p_prompt_version))
    )
  );
  return run_id;
end;
$$;

