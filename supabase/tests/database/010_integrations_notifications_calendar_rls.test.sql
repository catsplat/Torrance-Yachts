begin;
create extension if not exists pgtap with schema extensions;
select plan(62);

select has_table('public', 'integration_connections', 'integration connections table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'integration_deliveries', 'delivery outbox exists');
select has_table('public', 'calendar_events', 'operational calendar exists');
select has_table('public', 'integration_snapshots', 'sheet snapshots exist');
select has_table('public', 'invoice_profiles', 'invoice profiles exist');
select has_table('public', 'generated_invoices', 'generated invoice audit exists');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass), 'notifications have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.integration_deliveries'::regclass), 'deliveries have RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.invoice_profiles'::regclass), 'invoice profiles have RLS');
select results_eq(
  $$ select count(*) from public.integration_connections $$,
  array[5::bigint],
  'five provider metadata records are seeded'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('19000000-0000-0000-0000-000000000001', 'integration.admin@example.test', '{"display_name":"Integration Administrator"}'),
  ('19000000-0000-0000-0000-000000000002', 'integration.staff@example.test', '{"display_name":"Integration Staff"}'),
  ('19000000-0000-0000-0000-000000000003', 'integration.inactive@example.test', '{"display_name":"Inactive Integration User"}');
update public.profiles
set role = 'administrator', telegram_chat_id = '190000001'
where id = '19000000-0000-0000-0000-000000000001';
update public.profiles
set telegram_chat_id = '190000002'
where id = '19000000-0000-0000-0000-000000000002';
update public.profiles
set active = false
where id = '19000000-0000-0000-0000-000000000003';

select set_config('app.offer_create_authorised', 'yes', true);
insert into public.offers (
  id, enquiry_id, yacht_id, template_version_id, rate_period_id, version_number,
  status, recipient_name, subject_snapshot, body_snapshot, charter_start_date,
  charter_end_date, charter_days, weekly_rate_snapshot, proposed_charter_fee,
  currency, tax_rate_snapshot, short_charter_divisor_snapshot, pricing_basis
)
select
  'b3000000-0000-4000-8000-000000000001',
  enquiry.id, enquiry.requested_yacht_id,
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  1, 'draft', 'Synthetic Recipient', 'Synthetic integration offer',
  'Synthetic integration offer body.', enquiry.charter_start_date,
  enquiry.charter_end_date, enquiry.charter_end_date - enquiry.charter_start_date,
  168000, 168000, 'EUR', 5, 6, 'seasonal_rate'
from public.enquiries enquiry where id = '70000000-0000-4000-8000-000000000001';
select set_config('app.offer_create_authorised', '', true);
select set_config('app.offer_transition_authorised', 'yes', true);
select set_config('app.offer_transition_reason', 'Synthetic Phase 11 offer approval', true);
update public.offers
set status = 'approved',
    approved_by = '19000000-0000-0000-0000-000000000001',
    approved_at = now()
where id = 'b3000000-0000-4000-8000-000000000001';
select set_config('app.offer_transition_reason', 'Synthetic Phase 11 sent record', true);
update public.offers
set status = 'sent',
    sent_by = '19000000-0000-0000-0000-000000000001',
    sent_at = now()
where id = 'b3000000-0000-4000-8000-000000000001';
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
  'b4000000-0000-4000-8000-000000000001',
  enquiry.id, 'b3000000-0000-4000-8000-000000000001',
  enquiry.requested_yacht_id, enquiry.customer_contact_id, enquiry.broker_contact_id,
  enquiry.broker_company_id, enquiry.charter_start_date, enquiry.charter_end_date,
  enquiry.embarkation_port, enquiry.disembarkation_port, enquiry.guest_count,
  168000, 'EUR', 5, '19000000-0000-0000-0000-000000000001',
  'Synthetic signed agreement for Phase 11 testing'
from public.enquiries enquiry where id = '70000000-0000-4000-8000-000000000001';
select set_config('app.booking_create_authorised', '', true);

select set_config('app.task_create_authorised', 'yes', true);
insert into public.tasks (
  id, booking_id, source, title, status, priority, required, due_date,
  due_anchor, reminder_lead_days, assigned_user_id, created_by
) values (
  'b6000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'ad_hoc', 'Synthetic due task', 'ready', 'high', true, current_date,
  'none', 2, '19000000-0000-0000-0000-000000000002',
  '19000000-0000-0000-0000-000000000001'
);
select set_config('app.task_create_authorised', '', true);

select set_config('app.phase8_command', 'yes', true);
insert into public.documents (
  id, booking_id, document_type, title, original_filename, storage_path,
  mime_type, size_bytes, verification_status, verification_notes,
  verified_by, verified_at, retention_class, created_by
) values (
  'bb000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'charter_agreement', 'Synthetic signed agreement',
  'synthetic-agreement.pdf',
  'b4000000-0000-4000-8000-000000000001/bb000000-0000-4000-8000-000000000001/agreement.pdf',
  'application/pdf', 1000, 'verified', 'Synthetic verification',
  '19000000-0000-0000-0000-000000000001', now(), 'booking_record',
  '19000000-0000-0000-0000-000000000001'
);
insert into public.contract_reviews (
  id, booking_id, source_document_id, charter_start_date, charter_end_date,
  charter_fee, currency, tax_rate, commission_rate, review_notes, status,
  created_by, approved_by, approved_at
) values (
  'b7000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'bb000000-0000-4000-8000-000000000001',
  '2026-08-14', '2026-08-21', 168000, 'EUR', 5, 2,
  'Synthetic approved review', 'approved',
  '19000000-0000-0000-0000-000000000001',
  '19000000-0000-0000-0000-000000000001', now()
);
insert into public.payment_schedules (
  id, booking_id, contract_review_id, instalment_number, due_date,
  amount, currency, created_by, updated_by
) values (
  'b8000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'b7000000-0000-4000-8000-000000000001',
  1, current_date, 168000, 'EUR',
  '19000000-0000-0000-0000-000000000001',
  '19000000-0000-0000-0000-000000000001'
);
insert into public.commission_calculations (
  id, booking_id, contract_review_id, basis_amount, rate, amount,
  currency, created_by
) values (
  'b9000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'b7000000-0000-4000-8000-000000000001',
  168000, 2, 3360, 'EUR',
  '19000000-0000-0000-0000-000000000001'
);
insert into public.documents (
  id, booking_id, document_type, title, original_filename, storage_path,
  mime_type, size_bytes, verification_status, verification_notes,
  verified_by, verified_at, retention_class, created_by
) values (
  'ba000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'kylian_commission_invoice', 'Synthetic commission invoice',
  'synthetic-invoice.pdf',
  'b4000000-0000-4000-8000-000000000001/ba000000-0000-4000-8000-000000000001/invoice.pdf',
  'application/pdf', 1000, 'verified', 'Synthetic verification',
  '19000000-0000-0000-0000-000000000001', now(), 'financial_record',
  '19000000-0000-0000-0000-000000000001'
);
select set_config('app.phase8_command', '', true);

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';
select throws_ok(
  $$ select count(*) from public.notifications $$,
  '42501', 'permission denied for table notifications',
  'anonymous users cannot read notifications'
);
select throws_ok(
  $$ select count(*) from public.integration_deliveries $$,
  '42501', 'permission denied for table integration_deliveries',
  'anonymous users cannot read deliveries'
);
select throws_ok(
  $$ select count(*) from public.invoice_profiles $$,
  '42501', 'permission denied for table invoice_profiles',
  'anonymous users cannot read invoice configuration'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000002';
select results_eq(
  $$ select count(*) from public.integration_connections $$,
  array[5::bigint],
  'active staff can read provider status'
);
select throws_ok(
  $$ select public.update_integration_connection('telegram', true, 'test', 'staff bypass') $$,
  '42501', 'Administrator access is required',
  'staff cannot enable providers'
);
select throws_ok(
  $$ insert into public.notifications (
    idempotency_key, notification_type, source_type, source_id,
    recipient_user_id, channel, title, body
  ) values (
    'direct:notification', 'test', 'task',
    'b6000000-0000-4000-8000-000000000001',
    '19000000-0000-0000-0000-000000000002',
    'in_app', 'Direct', 'Direct mutation'
  ) $$,
  '42501', 'permission denied for table notifications',
  'staff cannot insert notifications directly'
);
select lives_ok(
  $$ select public.create_notification(
    'test:review:notification', 'manual_review', 'task',
    'b6000000-0000-4000-8000-000000000001',
    '19000000-0000-0000-0000-000000000002', null,
    'telegram', 'high', 'Review this notification',
    'Synthetic body for review', '/tasks/b6000000-0000-4000-8000-000000000001',
    true
  ) $$,
  'active staff can create a reviewable notification'
);
select results_eq(
  $$ select status::text from public.notifications
     where idempotency_key = 'test:review:notification' $$,
  array['pending_approval'],
  'reviewable notification is held'
);
select throws_ok(
  $$ select public.review_notification(
    (select id from public.notifications where idempotency_key = 'test:review:notification'),
    true, 'Checked'
  ) $$,
  '23514', 'The selected integration is not enabled',
  'approval cannot queue through a disabled provider'
);

set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.update_integration_connection(
    'telegram', true, 'synthetic-chat', 'Synthetic test target'
  ) $$,
  'administrator can enable Telegram metadata'
);
select lives_ok(
  $$ select public.review_notification(
    (select id from public.notifications where idempotency_key = 'test:review:notification'),
    true, 'Recipient and wording checked'
  ) $$,
  'approved notification is queued'
);
select results_eq(
  $$ select status::text from public.notifications
     where idempotency_key = 'test:review:notification' $$,
  array['queued'],
  'notification status advances to queued'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where idempotency_key like 'notification:%' $$,
  array[1::bigint],
  'one idempotent Telegram delivery is created'
);

set local role service_role;
select lives_ok(
  $$ select * from public.claim_integration_deliveries('test-worker', 20) $$,
  'trusted worker claims available deliveries'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where idempotency_key = (
       select 'notification:' || id::text from public.notifications
     where idempotency_key = 'test:review:notification'
     )
       and claimed_by = 'test-worker' and status = 'claimed' $$,
  array[1::bigint],
  'trusted worker claims the intended notification delivery'
);
select results_eq(
  $$ select count(*) from public.claim_integration_deliveries('other-worker', 20) $$,
  array[0::bigint],
  'active lease prevents a duplicate claim'
);
select lives_ok(
  $$ select public.complete_integration_delivery(
    (select id from public.integration_deliveries where idempotency_key = (
      select 'notification:' || id::text from public.notifications
      where idempotency_key = 'test:review:notification'
    )),
    'test-worker', 'telegram-message-1', 'https://example.test/message/1'
  ) $$,
  'trusted worker records provider success'
);
select results_eq(
  $$ select status::text from public.notifications
     where idempotency_key = 'test:review:notification' $$,
  array['delivered'],
  'delivery completion updates notification'
);
select results_eq(
  $$ select external_id from public.integration_deliveries
     where idempotency_key = (
       select 'notification:' || id::text from public.notifications
       where idempotency_key = 'test:review:notification'
     ) $$,
  array['telegram-message-1'],
  'provider identifier is retained'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.create_notification(
    'test:failure:notification', 'manual_review', 'task',
    'b6000000-0000-4000-8000-000000000001',
    '19000000-0000-0000-0000-000000000002', null,
    'telegram', 'normal', 'Failure test', 'Synthetic retry test',
    '/tasks/b6000000-0000-4000-8000-000000000001', false
  ) $$,
  'safe internal notification can queue without review'
);
set local role service_role;
select lives_ok(
  $$ select * from public.claim_integration_deliveries('failure-worker', 20) $$,
  'worker claims retry fixture'
);
select lives_ok(
  $$ select public.fail_integration_delivery(
    (select id from public.integration_deliveries
      where source_id = (select id from public.notifications
        where idempotency_key = 'test:failure:notification')),
    'failure-worker', 'timeout', 'Synthetic transient failure', true
  ) $$,
  'worker records retryable failure'
);
select results_eq(
  $$ select status::text from public.notifications
     where idempotency_key = 'test:failure:notification' $$,
  array['failed'],
  'failure propagates to notification'
);
set local role authenticated;
set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.retry_integration_delivery(
    (select id from public.integration_deliveries
      where source_id = (select id from public.notifications
        where idempotency_key = 'test:failure:notification')),
    'Operator reviewed transient provider failure'
  ) $$,
  'administrator can retry failed delivery'
);
select results_eq(
  $$ select status::text from public.integration_deliveries
     where source_id = (select id from public.notifications
       where idempotency_key = 'test:failure:notification') $$,
  array['pending'],
  'manual retry resets delivery to pending'
);

select lives_ok(
  $$ select public.update_integration_connection(
    'google_calendar', true, 'synthetic-calendar', 'Private calendar test'
  ) $$,
  'administrator can enable calendar metadata'
);
set local role service_role;
select results_eq(
  $$ select public.refresh_operational_calendar() $$,
  array[3],
  'booking, payment, and task calendar records are refreshed'
);
select results_eq(
  $$ select count(*) from public.calendar_events $$,
  array[3::bigint],
  'three authoritative calendar records exist'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where operation = 'calendar_upsert' $$,
  array[3::bigint],
  'calendar sync creates one delivery per source'
);
select results_eq(
  $$ select count(distinct idempotency_key) from public.integration_deliveries
     where operation = 'calendar_upsert' $$,
  array[3::bigint],
  'calendar delivery keys are unique'
);
select results_eq(
  $$ select public.refresh_operational_calendar() $$,
  array[3],
  'calendar refresh is repeatable'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where operation = 'calendar_upsert' $$,
  array[3::bigint],
  'unchanged calendar refresh creates no duplicates'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.update_integration_connection(
    'google_sheets', true, 'synthetic-workbook', 'One-way test workbook'
  ) $$,
  'administrator can enable Sheets metadata'
);
select lives_ok(
  $$ select public.queue_operations_sheet_snapshot() $$,
  'administrator can queue a one-way workbook snapshot'
);
select lives_ok(
  $$ select public.queue_operations_sheet_snapshot() $$,
  'unchanged workbook snapshot can be queued again safely'
);
select results_eq(
  $$ select count(*) from public.integration_snapshots
     where requested_by = '19000000-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'one workbook snapshot is recorded for the unchanged request'
);
select ok(
  (select row_count > 0 from public.integration_snapshots
   where requested_by = '19000000-0000-0000-0000-000000000001' limit 1),
  'workbook snapshot contains operational rows'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where operation = 'sheets_snapshot'
       and source_id = (
         select id from public.integration_snapshots
         where requested_by = '19000000-0000-0000-0000-000000000001'
       ) $$,
  array[1::bigint],
  'workbook snapshot has one delivery'
);

select lives_ok(
  $$ select public.update_integration_connection(
    'google_drive', true, 'synthetic-folder', 'Protected test folder'
  ) $$,
  'administrator can enable Drive metadata'
);
select lives_ok(
  $$ select public.queue_document_drive_sync(
    'ba000000-0000-4000-8000-000000000001',
    'Verified financial document selected for controlled copy'
  ) $$,
  'verified document can be queued for Drive'
);
select results_eq(
  $$ select count(*) from public.integration_deliveries
     where operation = 'drive_upload' $$,
  array[1::bigint],
  'Drive copy creates one delivery'
);

set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000002';
select throws_ok(
  $$ select public.create_invoice_profile_draft(
    'Synthetic commission', 'Synthetic Issuer', '1 Test Street',
    'Synthetic Recipient', '2 Test Street', 'recipient@example.test',
    'Commission for {{yacht_name}}', 'Synthetic payment instructions'
  ) $$,
  '42501', 'Administrator access is required',
  'staff cannot create invoice profiles'
);
set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.create_invoice_profile_draft(
    'Synthetic commission', 'Synthetic Issuer', '1 Test Street',
    'Synthetic Recipient', '2 Test Street', 'recipient@example.test',
    'Commission for synthetic charter', 'Synthetic payment instructions'
  ) $$,
  'administrator creates a private invoice profile draft'
);
select lives_ok(
  $$ select public.approve_invoice_profile(
    (select id from public.invoice_profiles where profile_name = 'Synthetic commission'),
    'Private recipient and payment details checked'
  ) $$,
  'administrator approves invoice profile'
);
select results_eq(
  $$ select status::text from public.invoice_profiles
     where profile_name = 'Synthetic commission' $$,
  array['approved'],
  'invoice profile becomes approved'
);
select lives_ok(
  $$ select public.register_generated_invoice(
    'b4000000-0000-4000-8000-000000000001',
    'b9000000-0000-4000-8000-000000000001',
    (select id from public.invoice_profiles where status = 'approved'),
    'ba000000-0000-4000-8000-000000000001',
    'SYNTHETIC-2026-1', current_date,
    'Synthetic commission service'
  ) $$,
  'generated invoice is registered against deterministic commission'
);
select results_eq(
  $$ select amount from public.generated_invoices $$,
  array[3360::numeric],
  'generated invoice amount comes from commission calculation'
);
select results_eq(
  $$ select count(*) from public.workflow_events where event_type = 'InvoiceGenerated' $$,
  array[1::bigint],
  'invoice generation emits an audit event'
);

set local "request.jwt.claim.sub" = '19000000-0000-0000-0000-000000000003';
select results_eq(
  $$ select count(*) from public.notifications $$,
  array[0::bigint],
  'inactive users cannot read notifications'
);
select throws_ok(
  $$ select public.create_notification(
    'inactive:test:notification', 'test', 'task',
    'b6000000-0000-4000-8000-000000000001',
    '19000000-0000-0000-0000-000000000003', null,
    'in_app', 'normal', 'Inactive', 'Inactive attempt', null, true
  ) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot create notifications'
);
select throws_ok(
  $$ delete from public.integration_deliveries $$,
  '42501', 'permission denied for table integration_deliveries',
  'delivery history cannot be deleted by staff'
);

select * from finish();
rollback;
