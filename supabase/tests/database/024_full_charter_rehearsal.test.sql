begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data)
values ('25000000-0000-4000-8000-000000000001', 'full.rehearsal.admin@example.test', '{"display_name":"Full Rehearsal Admin"}'::jsonb);
update public.profiles set role = 'administrator' where id = '25000000-0000-4000-8000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub" = '25000000-0000-4000-8000-000000000001';
select public.create_rehearsal_run('Full charter database rehearsal');
select public.configure_rehearsal_fixture_yacht((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'));

insert into public.contacts (id, full_name, email, roles)
values ('25000000-0000-4000-8000-000000000002', 'Fictional Charterer', 'full.charterer@example.test', array['charterer']::public.contact_role[]);
insert into public.enquiries (
  id, customer_contact_id, requested_yacht_id, source, summary,
  charter_start_date, charter_end_date, guest_count, embarkation_port,
  disembarkation_port, budget_amount, currency
) values (
  '25000000-0000-4000-8000-000000000003',
  '25000000-0000-4000-8000-000000000002',
  (select entity_id from public.rehearsal_run_records where entity_type = 'yacht' and rehearsal_run_id = (select id from public.rehearsal_runs where label = 'Full charter database rehearsal')),
  'manual', 'Full fictional charter database rehearsal enquiry.',
  '2027-08-14', '2027-08-21', 10, 'Athens', 'Athens', 168000, 'EUR'
);
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'contact', '25000000-0000-4000-8000-000000000002');
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'enquiry', '25000000-0000-4000-8000-000000000003');

select lives_ok(
  $$
    select public.create_offer_draft(
      '25000000-0000-4000-8000-000000000003',
      (select id from public.yacht_offer_templates where yacht_id = (select requested_yacht_id from public.enquiries where id = '25000000-0000-4000-8000-000000000003') and status = 'approved'),
      (select id from public.yacht_rate_periods where yacht_id = (select requested_yacht_id from public.enquiries where id = '25000000-0000-4000-8000-000000000003') and active),
      null, 'Fictional Charterer', 'Fictional charter rehearsal offer',
      'This is a clearly fictional local offer. No email was sent.', 168000
    )
  $$,
  'full rehearsal can create an offer through the live draft command'
);
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'offer', (select id from public.offers where enquiry_id = '25000000-0000-4000-8000-000000000003'));
select public.approve_offer((select id from public.offers where enquiry_id = '25000000-0000-4000-8000-000000000003'), 'Approved for fictional rehearsal.');
select public.mark_offer_sent((select id from public.offers where enquiry_id = '25000000-0000-4000-8000-000000000003'), 'Recorded only for fictional rehearsal.');
select public.transition_enquiry_status('25000000-0000-4000-8000-000000000003', 'contract_issued', 'Fictional contract review started.');
select public.transition_enquiry_status('25000000-0000-4000-8000-000000000003', 'awaiting_signatures', 'Fictional signatures reviewed.');
select lives_ok(
  $$ select public.approve_task_template('90000000-0000-4000-8000-000000000001') $$,
  'administrator explicitly approves the default task template before it can generate work'
);
select lives_ok(
  $$
    select public.confirm_booking(
      '25000000-0000-4000-8000-000000000003',
      (select id from public.offers where enquiry_id = '25000000-0000-4000-8000-000000000003'),
      (select requested_yacht_id from public.enquiries where id = '25000000-0000-4000-8000-000000000003'),
      date '2027-08-14', date '2027-08-21', 'Athens', 'Athens', 10::smallint,
      168000::numeric, 'EUR', 5::numeric, true,
      'All fictional signatures were reviewed for this local rehearsal.'
    )
  $$,
  'full rehearsal confirms a booking through the live command'
);
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'booking', (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003'));
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'task', task.id)
from public.tasks task where task.booking_id = (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003');

select results_eq(
  $$ select count(*) from public.tasks where booking_id = (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003') $$,
  array[16::bigint],
  'confirmed fictional booking generated the supplied task sequence 0.A through 7'
);
select results_eq(
  $$ select reserved_from::text || ':' || reserved_through::text from public.booking_reservations where booking_id = (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003') $$,
  array['2027-08-13:2027-08-22'],
  'fictional booking reserves the required one-day buffer on both sides'
);
select results_eq(
  $$ select count(*) from public.booking_document_requirements where booking_id = (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003') $$,
  array[6::bigint],
  'fictional booking generated the protected document checklist'
);
select public.register_quarantined_booking_document(
  (select id from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003'),
  'charter_agreement', 'Fictional reset agreement', 'fictional-reset-agreement.pdf',
  (select id::text from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003') || '/25000000-0000-4000-8000-000000000004/fictional-reset-agreement.pdf',
  'application/pdf', 128, 'booking_record', repeat('a', 64)
);
select public.record_document_scan_result((select id from public.documents where title = 'Fictional reset agreement'), 'clean', 'Fictional clean scanner result for reset coverage.');
select public.release_clean_booking_document(
  (select id from public.documents where title = 'Fictional reset agreement'),
  (select booking_id::text from public.documents where title = 'Fictional reset agreement') || '/25000000-0000-4000-8000-000000000004/released-fictitious-reset-agreement.pdf',
  'Fictional release evidence for reset coverage.'
);
select public.review_booking_document((select id from public.documents where title = 'Fictional reset agreement'), true, 'Fictional verified agreement for reset coverage.');
select public.register_rehearsal_record((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'document', (select id from public.documents where title = 'Fictional reset agreement'));
select results_eq(
  $$ select count(*) from public.documents where title = 'Fictional reset agreement' and verification_status = 'verified' $$,
  array[1::bigint],
  'full rehearsal can own a verified fictional document before reset'
);
select lives_ok(
  $$ select public.reset_rehearsal_run((select id from public.rehearsal_runs where label = 'Full charter database rehearsal'), 'Full fictional charter rehearsal is complete.') $$,
  'full rehearsal reset removes its booking workflow atomically'
);
select results_eq(
  $$ select count(*) from public.bookings where enquiry_id = '25000000-0000-4000-8000-000000000003' $$,
  array[0::bigint],
  'reset removes only the fictional booking'
);
select results_eq(
  $$ select count(*) from public.documents where title = 'Fictional reset agreement' $$,
  array[0::bigint],
  'reset removes a verified fictional document after detaching its requirement reference'
);
select results_eq(
  $$ select status from public.rehearsal_runs where label = 'Full charter database rehearsal' $$,
  array['reset'],
  'full rehearsal preserves reset evidence'
);

select * from finish();
rollback;
