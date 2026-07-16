begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

select has_table('public', 'booking_document_requirements', 'document requirements table exists');
select has_table('public', 'documents', 'documents table exists');
select has_table('public', 'document_history', 'document history table exists');
select has_table('public', 'contract_reviews', 'contract reviews table exists');
select has_table('public', 'payment_schedules', 'payment schedules table exists');
select has_table('public', 'commission_calculations', 'commission calculations table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.documents'::regclass), 'documents have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.contract_reviews'::regclass), 'contract reviews have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.payment_schedules'::regclass), 'payments have RLS');
select results_eq(
  $$ select public::text from storage.buckets where id = 'booking-private' $$,
  array['false'],
  'booking storage bucket is private'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('16000000-0000-0000-0000-000000000001', 'documents.admin@example.test', '{"display_name":"Document Administrator"}'::jsonb),
  ('16000000-0000-0000-0000-000000000002', 'documents.inactive@example.test', '{"display_name":"Inactive Document User"}'::jsonb);
update public.profiles set role = 'administrator'
where id = '16000000-0000-0000-0000-000000000001';
update public.profiles set active = false
where id = '16000000-0000-0000-0000-000000000002';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok(
  $$ select count(*) from public.documents $$,
  '42501', 'permission denied for table documents',
  'anonymous users cannot read document metadata'
);
select throws_ok(
  $$ select count(*) from public.payment_schedules $$,
  '42501', 'permission denied for table payment_schedules',
  'anonymous users cannot read payment schedules'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '16000000-0000-0000-0000-000000000001';

select lives_ok(
  $$ select public.approve_task_template('90000000-0000-4000-8000-000000000001') $$,
  'task template can be approved for booking setup'
);
select lives_ok(
  $$ select public.approve_yacht_offer_template('83000000-0000-4000-8000-000000000001') $$,
  'offer template can be approved for booking setup'
);
select lives_ok(
  $$ select public.create_offer_draft(
    '70000000-0000-4000-8000-000000000001',
    '83000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000001', null,
    'Synthetic Broker', 'Synthetic Phase 8 offer',
    'Synthetic reviewed offer for private document and payment tests.', 168000
  ) $$,
  'source offer can be prepared'
);
select lives_ok(
  $$ select public.approve_offer(id, 'Reviewed synthetic terms')
     from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001' $$,
  'source offer can be approved'
);
select lives_ok(
  $$ select public.mark_offer_sent(id, 'Recorded synthetic external send')
     from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001' $$,
  'source offer can be recorded sent'
);
select lives_ok(
  $$ select public.transition_enquiry_status(
    '70000000-0000-4000-8000-000000000001', 'contract_issued', 'Synthetic contract issued'
  ) $$,
  'enquiry enters contract issued'
);
select lives_ok(
  $$ select public.transition_enquiry_status(
    '70000000-0000-4000-8000-000000000001', 'awaiting_signatures', 'Synthetic signatures requested'
  ) $$,
  'enquiry enters awaiting signatures'
);
select lives_ok(
  $$ select public.confirm_booking(
    '70000000-0000-4000-8000-000000000001'::uuid,
    (select id from public.offers where enquiry_id = '70000000-0000-4000-8000-000000000001'),
    (select id from public.yachts where name = 'M/Y Asteria'),
    '2026-08-14'::date, '2026-08-21'::date,
    'Athens'::text, 'Athens'::text, 10::smallint,
    168000::numeric, 'EUR'::text, 5::numeric, true,
    'Reviewed fully signed synthetic agreement'::text
  ) $$,
  'booking is confirmed for Phase 8 tests'
);
select results_eq(
  $$ select count(*) from public.booking_document_requirements $$,
  array[6::bigint],
  'booking confirmation creates all six document requirements'
);
select results_eq(
  $$ select count(*) from public.booking_document_requirements where required $$,
  array[5::bigint],
  'five booking documents are required'
);
select throws_ok(
  $$ insert into public.documents (
       booking_id, document_type, title, original_filename, storage_path,
       mime_type, size_bytes, retention_class, created_by
     ) values (
       (select id from public.bookings), 'other', 'Bypass', 'bypass.pdf', 'bypass',
       'application/pdf', 1, 'booking_record', '16000000-0000-0000-0000-000000000001'
     ) $$,
  '42501', 'permission denied for table documents',
  'direct document metadata insertion is blocked'
);
select throws_ok(
  $$ select public.register_booking_document(
       (select id from public.bookings), 'charter_agreement', 'Signed agreement',
       'agreement.exe', (select id::text from public.bookings) || '/00000000-0000-4000-8000-000000000001/agreement.exe',
       'application/octet-stream', 100, 'booking_record'
     ) $$,
  '23514', null,
  'unsupported document types are rejected by database constraints'
);
select lives_ok(
  $$ select public.register_booking_document(
       (select id from public.bookings), 'charter_agreement', 'Signed charter agreement',
       'signed-charter.pdf', (select id::text from public.bookings) || '/00000000-0000-4000-8000-000000000001/signed-charter.pdf',
       'application/pdf', 4096, 'booking_record'
     ) $$,
  'private charter agreement metadata can be registered'
);
select results_eq(
  $$ select version_number::text || ':' || verification_status::text from public.documents $$,
  array['1:pending_review'],
  'new document starts at version one pending review'
);
select results_eq(
  $$ select status::text from public.booking_document_requirements
     where document_type = 'charter_agreement' $$,
  array['uploaded'],
  'requirement records the pending upload'
);
select results_eq(
  $$ select action from public.document_history $$,
  array['uploaded'],
  'upload has append-only history'
);
select throws_ok(
  $$ select public.save_contract_review(
       (select id from public.bookings), (select id from public.documents),
       '2026-08-14', '2026-08-21', 'Athens', 'Athens', 168000, 'EUR', 5, 2,
       'Reviewed against synthetic contract'
     ) $$,
  '23514', 'A verified charter agreement is required',
  'contract data cannot be approved from an unverified document'
);
select lives_ok(
  $$ select public.review_booking_document(
       (select id from public.documents), true, 'Compared with the complete synthetic agreement'
     ) $$,
  'charter agreement can be verified'
);
select results_eq(
  $$ select status::text from public.booking_document_requirements
     where document_type = 'charter_agreement' $$,
  array['verified'],
  'verified upload satisfies its document requirement'
);
select lives_ok(
  $$ select public.save_contract_review(
       (select id from public.bookings), (select id from public.documents),
       '2026-08-15', '2026-08-22', 'Piraeus', 'Mykonos', 168000, 'EUR', 5.2, 2,
       'Every material field was compared with the signed synthetic agreement'
     ) $$,
  'reviewed contract fields can be saved as a draft'
);
select results_eq(
  $$ select status::text from public.contract_reviews $$,
  array['draft'],
  'contract review remains draft until explicit approval'
);
select throws_ok(
  $$ select public.approve_contract_review(
       (select id from public.contract_reviews),
       array['2026-07-01'::date, '2026-08-01'::date],
       array[84000::numeric, 83000::numeric]
     ) $$,
  '23514', 'Payment instalments must equal the reviewed charter fee',
  'payment schedule must reconcile exactly to the reviewed charter fee'
);
select lives_ok(
  $$ select public.approve_contract_review(
       (select id from public.contract_reviews),
       array['2026-07-01'::date, '2026-08-01'::date],
       array[84000::numeric, 84000::numeric]
     ) $$,
  'human approval creates the reviewed contract schedule'
);
select results_eq(
  $$ select status::text from public.contract_reviews $$,
  array['approved'],
  'review becomes approved'
);
select results_eq(
  $$ select count(*) from public.payment_schedules $$,
  array[2::bigint],
  'two payment instalments are generated'
);
select results_eq(
  $$ select sum(amount)::text from public.payment_schedules $$,
  array['168000.00'],
  'payment schedule totals the charter fee'
);
select results_eq(
  $$ select basis_amount::text || ':' || rate::text || ':' || amount::text
     from public.commission_calculations $$,
  array['168000.00:2.00:3360.00'],
  'commission is calculated deterministically at two percent'
);
select results_eq(
  $$ select charter_start_date::text || ':' || charter_end_date::text || ':' ||
            embarkation_port || ':' || disembarkation_port
     from public.bookings $$,
  array['2026-08-15:2026-08-22:Piraeus:Mykonos'],
  'approved reviewed fields update the booking source of truth'
);
select results_eq(
  $$ select due_date::text from public.tasks where due_anchor = 'contract_payment_1' $$,
  array['2026-07-01'],
  'first payment task receives the reviewed due date'
);
select results_eq(
  $$ select status::text from public.tasks where due_anchor = 'contract_payment_1' $$,
  array['blocked'],
  'payment task remains blocked by its workflow dependency'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'ContractDataApproved' $$,
  array[1::bigint],
  'contract approval emits a durable workflow event'
);
select lives_ok(
  $$ select public.mark_payment_paid(
       (select id from public.payment_schedules where instalment_number = 1),
       'Synthetic bank receipt reviewed'
     ) $$,
  'scheduled payment can be recorded paid'
);
select results_eq(
  $$ select status::text from public.payment_schedules where instalment_number = 1 $$,
  array['paid'],
  'paid state is recorded'
);
select lives_ok(
  $$ select public.waive_booking_document_requirement(
       (select id from public.booking_document_requirements where document_type = 'broker_commission_invoice'),
       'Not applicable to this synthetic booking'
     ) $$,
  'administrator can waive an optional requirement'
);
select results_eq(
  $$ select status::text from public.booking_document_requirements
     where document_type = 'broker_commission_invoice' $$,
  array['waived'],
  'optional document waiver is explicit'
);
select throws_ok(
  $$ select public.waive_booking_document_requirement(
       (select id from public.booking_document_requirements where document_type = 'client_passport'),
       'Attempt to waive a required identity document'
     ) $$,
  '23514', 'Only an optional requirement can be waived',
  'required documents cannot be waived'
);
select throws_ok(
  $$ update public.payment_schedules set amount = 1 $$,
  '42501', 'permission denied for table payment_schedules',
  'direct payment mutation is blocked'
);
select throws_ok(
  $$ delete from public.document_history $$,
  '42501', 'permission denied for table document_history',
  'document history cannot be deleted'
);

set local "request.jwt.claim.sub" = '16000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*) from public.documents $$,
  array[0::bigint],
  'inactive users cannot see document metadata'
);
select throws_ok(
  $$ select public.mark_payment_paid(
       (select id from public.payment_schedules limit 1), 'Inactive attempt'
     ) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot run payment commands'
);

select * from finish();
rollback;
