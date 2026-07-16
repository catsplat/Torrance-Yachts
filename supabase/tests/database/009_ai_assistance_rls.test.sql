begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

select has_table('public', 'communication_templates', 'communication templates table exists');
select has_table('public', 'ai_runs', 'AI run provenance table exists');
select has_table('public', 'ai_suggestions', 'AI suggestions table exists');
select has_table('public', 'ai_suggestion_evidence', 'AI evidence table exists');
select has_table('public', 'ai_suggestion_revisions', 'AI correction history exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.ai_runs'::regclass),
  'AI runs have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.communication_templates'::regclass),
  'communication templates have RLS'
);
select results_eq(
  $$ select count(*) from public.communication_templates $$,
  array[3::bigint],
  'three synthetic editable communication templates are seeded'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '18000000-0000-0000-0000-000000000001',
    'ai.admin@example.test',
    '{"display_name":"AI Administrator"}'::jsonb
  ),
  (
    '18000000-0000-0000-0000-000000000002',
    'ai.staff@example.test',
    '{"display_name":"AI Staff"}'::jsonb
  ),
  (
    '18000000-0000-0000-0000-000000000003',
    'ai.inactive@example.test',
    '{"display_name":"Inactive AI User"}'::jsonb
  );
update public.profiles set role = 'administrator'
where id = '18000000-0000-0000-0000-000000000001';
update public.profiles set active = false
where id = '18000000-0000-0000-0000-000000000003';

select set_config('app.offer_create_authorised', 'yes', true);
insert into public.offers (
  id, enquiry_id, yacht_id, template_version_id, rate_period_id, version_number,
  status, recipient_name, subject_snapshot, body_snapshot, charter_start_date,
  charter_end_date, charter_days, weekly_rate_snapshot, proposed_charter_fee,
  currency, tax_rate_snapshot, short_charter_divisor_snapshot, pricing_basis,
  approved_by, approved_at, sent_by, sent_at
)
select
  'a3000000-0000-4000-8000-000000000001',
  enquiries.id,
  enquiries.requested_yacht_id,
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  1,
  'draft',
  'Synthetic Recipient',
  'Synthetic sent offer',
  'Synthetic sent offer body for Phase 10 database testing.',
  enquiries.charter_start_date,
  enquiries.charter_end_date,
  enquiries.charter_end_date - enquiries.charter_start_date,
  168000,
  168000,
  'EUR',
  5,
  6,
  'seasonal_rate',
  null,
  null,
  null,
  null
from public.enquiries
where id = '70000000-0000-4000-8000-000000000001';
select set_config('app.offer_create_authorised', '', true);
select set_config('app.offer_transition_authorised', 'yes', true);
select set_config('app.offer_transition_reason', 'Synthetic Phase 10 fixture approval', true);
update public.offers set
  status = 'approved',
  approved_by = '18000000-0000-0000-0000-000000000001',
  approved_at = now()
where id = 'a3000000-0000-4000-8000-000000000001';
select set_config('app.offer_transition_reason', 'Synthetic Phase 10 fixture sent record', true);
update public.offers set
  status = 'sent',
  sent_by = '18000000-0000-0000-0000-000000000001',
  sent_at = now()
where id = 'a3000000-0000-4000-8000-000000000001';
select set_config('app.offer_transition_authorised', '', true);
select set_config('app.offer_transition_reason', '', true);

select set_config('app.booking_create_authorised', 'yes', true);
insert into public.bookings (
  id, enquiry_id, source_offer_id, yacht_id, customer_contact_id,
  broker_contact_id, broker_company_id, charter_start_date, charter_end_date,
  embarkation_port, disembarkation_port, guest_count, charter_fee, currency,
  tax_rate, signed_agreement_confirmed_by, confirmation_reason
)
select
  'a4000000-0000-4000-8000-000000000001',
  enquiries.id,
  'a3000000-0000-4000-8000-000000000001',
  enquiries.requested_yacht_id,
  enquiries.customer_contact_id,
  enquiries.broker_contact_id,
  enquiries.broker_company_id,
  enquiries.charter_start_date,
  enquiries.charter_end_date,
  enquiries.embarkation_port,
  enquiries.disembarkation_port,
  enquiries.guest_count,
  168000,
  'EUR',
  5,
  '18000000-0000-0000-0000-000000000001',
  'Synthetic signed agreement setup for AI extraction tests'
from public.enquiries
where id = '70000000-0000-4000-8000-000000000001';
select set_config('app.booking_create_authorised', '', true);

select set_config('app.phase8_command', 'yes', true);
insert into public.documents (
  id, booking_id, document_type, title, original_filename, storage_path,
  mime_type, size_bytes, verification_status, verification_notes,
  verified_by, verified_at, retention_class, created_by
) values (
  'a5000000-0000-4000-8000-000000000001',
  'a4000000-0000-4000-8000-000000000001',
  'charter_agreement',
  'Synthetic verified charter agreement',
  'synthetic-charter.pdf',
  'a4000000-0000-4000-8000-000000000001/a5000000-0000-4000-8000-000000000001/agreement.pdf',
  'application/pdf',
  1000,
  'verified',
  'Synthetic document reviewed for database testing',
  '18000000-0000-0000-0000-000000000001',
  now(),
  'booking_record',
  '18000000-0000-0000-0000-000000000001'
);
select set_config('app.phase8_command', '', true);

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok(
  $$ select count(*) from public.ai_runs $$,
  '42501', 'permission denied for table ai_runs',
  'anonymous users cannot read AI provenance'
);
select throws_ok(
  $$ select count(*) from public.communication_templates $$,
  '42501', 'permission denied for table communication_templates',
  'anonymous users cannot read communication templates'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*) from public.communication_templates $$,
  array[3::bigint],
  'active staff can read communication templates'
);
select throws_ok(
  $$ select public.create_communication_template_draft(
    'kyc_request', 'Staff bypass', 'KYC for {{client_name}}',
    'This template should not be created by a non-administrator.'
  ) $$,
  '42501', 'Administrator access is required',
  'staff cannot create communication templates'
);

set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000001';
select throws_ok(
  $$ select public.create_communication_template_draft(
    'kyc_request', 'Invalid placeholder', 'KYC for {{client_name}}',
    'This includes an invalid {{bank_account}} placeholder and must be rejected.'
  ) $$,
  '23514', 'Unknown communication template placeholder: bank_account',
  'unknown template placeholders are rejected'
);
select lives_ok(
  $$ select public.create_communication_template_draft(
    'kyc_request', 'Reviewed KYC request', 'KYC for {{client_name}}',
    'Dear {{broker_company_name}}, please provide the reviewed KYC statement for {{client_name}} in {{year}}.'
  ) $$,
  'administrator can create a valid template draft'
);
select results_eq(
  $$ select version_number from public.communication_templates
     where name = 'Reviewed KYC request' $$,
  array[2],
  'template versions increment per communication kind'
);
select throws_ok(
  $$ update public.communication_templates set name = 'Direct bypass' $$,
  '42501', 'permission denied for table communication_templates',
  'direct template mutation is blocked'
);
select lives_ok(
  $$ select public.update_communication_template_draft(
    (select id from public.communication_templates where name = 'Reviewed KYC request'),
    'Reviewed KYC request updated',
    'KYC verification for {{client_name}}',
    'Dear {{broker_company_name}}, please provide the KYC statement for {{client_name}} for {{year}}.'
  ) $$,
  'administrator can update a draft through the command'
);
select lives_ok(
  $$ select public.approve_communication_template(
    (select id from public.communication_templates where name = 'Reviewed KYC request updated')
  ) $$,
  'administrator can approve a reviewed template'
);
select results_eq(
  $$ select count(*) from public.communication_templates
     where kind = 'kyc_request' and status = 'approved' $$,
  array[1::bigint],
  'one approved template exists per kind'
);
select lives_ok(
  $$ select public.clone_communication_template(
    (select id from public.communication_templates
      where kind = 'kyc_request' and status = 'approved'),
    'Replacement KYC request'
  ) $$,
  'approved template can be cloned into a new draft'
);
select results_eq(
  $$ select version_number from public.communication_templates
     where name = 'Replacement KYC request' $$,
  array[3],
  'cloned template receives the next version'
);
select lives_ok(
  $$ select public.approve_communication_template(
    (select id from public.communication_templates where name = 'Replacement KYC request')
  ) $$,
  'replacement communication template can be approved'
);
select results_eq(
  $$ select count(*) from public.communication_templates
     where kind = 'kyc_request' and status = 'retired' $$,
  array[1::bigint],
  'the former approved version is retired'
);
select throws_ok(
  $$ select public.update_communication_template_draft(
    (select id from public.communication_templates
      where kind = 'kyc_request' and status = 'approved'),
    'Tampered', 'Tampered subject', 'Tampered approved body content that must not save.'
  ) $$,
  'P0002', 'Editable communication template not found',
  'approved template versions are immutable'
);

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';
select lives_ok(
  $$ select public.ingest_gmail_message(
    'phase10-event-1', 'phase10-message-1', 'phase10-thread-1',
    '<phase10-message-1@example.test>', '2026-07-16T12:00:00Z',
    'Synthetic Charterer', 'charterer@example.test',
    array['charterdesk@example.test'], '{}'::text[],
    'M/Y Asteria August availability',
    'Ten guests from Athens with a EUR 180,000 budget.',
    'Please advise M/Y Asteria availability for 10 guests from 14 August 2026 to 21 August 2026, Athens to Athens, budget EUR 180,000.',
    array['INBOX','UNREAD'], false, false, false, false, '[]'::jsonb
  ) $$,
  'representative email source can be ingested'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.request_ai_analysis(
    'email:phase10-message-1:email-triage-v1:local',
    'email_triage',
    'email_message',
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'local',
    'deterministic-v1',
    'email-triage-v1',
    repeat('a', 64)
  ) $$,
  'active staff can request email analysis'
);
select results_eq(
  $$ select count(*) from public.ai_runs where request_key =
    'email:phase10-message-1:email-triage-v1:local' $$,
  array[1::bigint],
  'one AI run is recorded'
);
select lives_ok(
  $$ select public.request_ai_analysis(
    'email:phase10-message-1:email-triage-v1:local',
    'email_triage',
    'email_message',
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'local',
    'deterministic-v1',
    'email-triage-v1',
    repeat('a', 64)
  ) $$,
  'repeating the same analysis request is idempotent'
);
select results_eq(
  $$ select count(*) from public.ai_runs where request_key =
    'email:phase10-message-1:email-triage-v1:local' $$,
  array[1::bigint],
  'idempotent request does not duplicate provenance'
);
select throws_ok(
  $$ select public.request_ai_analysis(
    'invalid-source-request-key-0001',
    'contract_extraction',
    'email_message',
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'local',
    'deterministic-v1',
    'contract-extraction-v1',
    repeat('b', 64)
  ) $$,
  '23514', 'Contract extraction requires a verified charter agreement',
  'analysis kind cannot be paired with the wrong source type'
);
select throws_ok(
  $$ insert into public.ai_runs (
    request_key, analysis_kind, source_type, source_id, provider, model,
    prompt_version, input_sha256, requested_by
  ) values (
    'direct-bypass-request-key-0001', 'email_triage', 'email_message',
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'local', 'deterministic-v1', 'email-triage-v1', repeat('c', 64),
    '18000000-0000-0000-0000-000000000001'
  ) $$,
  '42501', 'permission denied for table ai_runs',
  'staff cannot forge AI provenance records'
);
select throws_ok(
  $$ select public.start_ai_analysis(
    (select id from public.ai_runs where request_key =
      'email:phase10-message-1:email-triage-v1:local')
  ) $$,
  '42501', 'permission denied for function start_ai_analysis',
  'authenticated callers cannot invoke the trusted completion boundary'
);

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';
select lives_ok(
  $$ select public.start_ai_analysis(
    (select id from public.ai_runs where request_key =
      'email:phase10-message-1:email-triage-v1:local')
  ) $$,
  'trusted service can start a queued analysis'
);
select results_eq(
  $$ select status::text from public.ai_runs where request_key =
    'email:phase10-message-1:email-triage-v1:local' $$,
  array['processing'],
  'started analysis records processing state'
);
select lives_ok(
  $$ select public.complete_ai_analysis(
    (select id from public.ai_runs where request_key =
      'email:phase10-message-1:email-triage-v1:local'),
    'local-response-1',
    '{
      "classification":"new_enquiry",
      "summary":"Synthetic August charter enquiry",
      "extracted":{"guest_count":10,"requested_yacht_name":"M/Y Asteria"},
      "draft":{"subject":"Re: M/Y Asteria","body":"Many thanks for the enquiry."}
    }'::jsonb,
    'Synthetic August charter enquiry',
    0.91,
    jsonb_build_array(jsonb_build_object(
      'field_path', 'extracted.guest_count',
      'source_type', 'email_message',
      'source_id', (select id from public.email_messages
        where provider_message_id = 'phase10-message-1'),
      'excerpt', '10 guests',
      'start_offset', 41,
      'end_offset', 50,
      'confidence', 0.95
    )),
    120,
    80
  ) $$,
  'trusted service can record a validated suggestion'
);
select results_eq(
  $$ select status::text || ':' || input_tokens::text || ':' || output_tokens::text
     from public.ai_runs where request_key =
       'email:phase10-message-1:email-triage-v1:local' $$,
  array['completed:120:80'],
  'completed run retains bounded usage provenance'
);
select results_eq(
  $$ select status::text || ':' || confidence::text
     from public.ai_suggestions where source_id = (
       select id from public.email_messages where provider_message_id = 'phase10-message-1'
     ) $$,
  array['pending_review:0.9100'],
  'suggestion remains pending for human review'
);
select results_eq(
  $$ select field_path || ':' || excerpt from public.ai_suggestion_evidence $$,
  array['extracted.guest_count:10 guests'],
  'field-level source evidence is retained'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'AISuggestionCreated' $$,
  array[1::bigint],
  'suggestion creation emits a durable event'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.revise_ai_suggestion(
    (select id from public.ai_suggestions where status = 'pending_review'),
    '{
      "classification":"new_enquiry",
      "summary":"Corrected synthetic charter enquiry",
      "extracted":{"guest_count":10,"requested_yacht_name":"M/Y Asteria"},
      "draft":{"subject":"Reviewed reply","body":"Reviewed draft reply body."}
    }'::jsonb,
    'Compared the suggestion with the original email'
  ) $$,
  'staff can correct a pending suggestion'
);
select results_eq(
  $$ select summary from public.ai_suggestions where status = 'pending_review' $$,
  array['Corrected synthetic charter enquiry'],
  'corrected summary becomes the reviewed value'
);
select results_eq(
  $$ select count(*) from public.ai_suggestion_revisions $$,
  array[1::bigint],
  'correction creates immutable revision history'
);
select lives_ok(
  $$ select public.review_ai_suggestion(
    (select id from public.ai_suggestions where status = 'pending_review'),
    true,
    'Original email and evidence were checked'
  ) $$,
  'staff can approve a reviewed suggestion'
);
select results_eq(
  $$ select status::text || ':' || (reviewed_by is not null)::text
     from public.ai_suggestions where status = 'approved' $$,
  array['approved:true'],
  'approval records the human reviewer'
);
select throws_ok(
  $$ select public.revise_ai_suggestion(
    (select id from public.ai_suggestions where status = 'approved'),
    '{"summary":"Late tamper"}'::jsonb,
    'Attempted late change'
  ) $$,
  'P0002', 'Pending AI suggestion not found',
  'approved suggestions cannot be revised'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'AISuggestionApproved' $$,
  array[1::bigint],
  'human approval emits a durable event'
);
select lives_ok(
  $$ select public.request_ai_analysis(
    'document:a5000000:contract-extraction-v1:local',
    'contract_extraction',
    'document',
    'a5000000-0000-4000-8000-000000000001',
    'local',
    'deterministic-v1',
    'contract-extraction-v1',
    repeat('d', 64)
  ) $$,
  'verified charter agreement can receive an extraction request'
);

set local role service_role;
set local "request.jwt.claim.role" = 'service_role';
select lives_ok(
  $$ select public.start_ai_analysis(
    (select id from public.ai_runs where request_key =
      'document:a5000000:contract-extraction-v1:local')
  ) $$,
  'trusted service can start contract extraction'
);
select throws_ok(
  $$ select public.complete_ai_analysis(
    (select id from public.ai_runs where request_key =
      'document:a5000000:contract-extraction-v1:local'),
    'bad-response',
    '[]'::jsonb,
    'Invalid response',
    0.5,
    '[]'::jsonb,
    null,
    null
  ) $$,
  '22023', 'Validated AI payload and evidence are required',
  'malformed provider payloads are rejected'
);
select lives_ok(
  $$ select public.fail_ai_analysis(
    (select id from public.ai_runs where request_key =
      'document:a5000000:contract-extraction-v1:local'),
    'provider_validation_failed',
    'Provider output did not match the required schema'
  ) $$,
  'trusted service can safely fail an invalid provider run'
);
select results_eq(
  $$ select status::text || ':' || error_code from public.ai_runs where request_key =
    'document:a5000000:contract-extraction-v1:local' $$,
  array['failed:provider_validation_failed'],
  'failed run retains a safe operational error code'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'AIAnalysisFailed' $$,
  array[1::bigint],
  'failed analysis emits a durable operational event'
);

set local role authenticated;
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000003';
select results_eq(
  $$ select count(*) from public.ai_runs $$,
  array[0::bigint],
  'inactive users cannot read AI provenance'
);
select results_eq(
  $$ select count(*) from public.communication_templates $$,
  array[0::bigint],
  'inactive users cannot read communication templates'
);
select throws_ok(
  $$ select public.request_ai_analysis(
    'inactive-request-key-0000001',
    'email_triage',
    'email_message',
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'local',
    'deterministic-v1',
    'email-triage-v1',
    repeat('e', 64)
  ) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot request model processing'
);

set local "request.jwt.claim.sub" = '18000000-0000-0000-0000-000000000001';
select throws_ok(
  $$ delete from public.ai_suggestion_evidence $$,
  '42501', 'permission denied for table ai_suggestion_evidence',
  'AI evidence cannot be deleted by staff'
);
select throws_ok(
  $$ update public.ai_suggestion_revisions set reason = 'tampered' $$,
  '42501', 'permission denied for table ai_suggestion_revisions',
  'AI correction history is immutable'
);
select throws_ok(
  $$ update public.ai_suggestions set confidence = 1 $$,
  '42501', 'permission denied for table ai_suggestions',
  'provider confidence cannot be directly overwritten'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'AIAnalysisRequested' $$,
  array[2::bigint],
  'each unique accepted analysis request emits one request event'
);
select results_eq(
  $$ select count(*) from public.ai_runs $$,
  array[2::bigint],
  'two unique AI runs remain fully auditable'
);
select lives_ok(
  $$ select public.classify_email_message_with_details(
    (select id from public.email_messages where provider_message_id = 'phase10-message-1'),
    'new_enquiry'::public.email_classification,
    'Reviewed the email and approved the structured extraction',
    null::uuid,
    null::uuid,
    'Reviewed synthetic email enquiry',
    (select id from public.yachts where name = 'M/Y Asteria'),
    '2026-08-14'::date,
    '2026-08-21'::date,
    10::smallint,
    'Athens',
    'Athens',
    180000::numeric,
    'EUR'
  ) $$,
  'human classification can apply reviewed extracted enquiry details'
);
select results_eq(
  $$ select charter_start_date::text || ':' || charter_end_date::text || ':' ||
            guest_count::text || ':' || budget_amount::text || ':' || currency
     from public.enquiries where summary = 'Reviewed synthetic email enquiry' $$,
  array['2026-08-14:2026-08-21:10:180000.00:EUR'],
  'reviewed extraction populates the authoritative enquiry without autonomous action'
);

select * from finish();
rollback;
