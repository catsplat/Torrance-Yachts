begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

select has_table('public', 'yacht_commercial_profiles', 'commercial profiles table exists');
select has_table('public', 'yacht_rate_periods', 'rate periods table exists');
select has_table('public', 'yacht_sales_materials', 'sales materials table exists');
select has_table('public', 'yacht_offer_templates', 'offer templates table exists');
select has_table('public', 'offers', 'offers table exists');
select has_table('public', 'offer_status_history', 'offer status history table exists');

select ok((select relrowsecurity from pg_class where oid = 'public.yacht_commercial_profiles'::regclass), 'commercial profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.yacht_rate_periods'::regclass), 'rate periods has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.yacht_sales_materials'::regclass), 'sales materials has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.yacht_offer_templates'::regclass), 'offer templates has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.offers'::regclass), 'offers has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.offer_status_history'::regclass), 'offer history has RLS');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('13000000-0000-0000-0000-000000000001', 'offers.staff@example.test', '{"display_name":"Offer Staff"}'::jsonb),
  ('13000000-0000-0000-0000-000000000002', 'offers.inactive@example.test', '{"display_name":"Inactive Offer User"}'::jsonb);

update public.profiles set active = false
where id = '13000000-0000-0000-0000-000000000002';

set local role anon;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000000';

select throws_ok(
  $$ select count(*) from public.offers $$,
  '42501', 'permission denied for table offers',
  'anonymous requests have no offer privilege'
);
select throws_ok(
  $$ select count(*) from public.yacht_offer_templates $$,
  '42501', 'permission denied for table yacht_offer_templates',
  'anonymous requests have no template privilege'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000001';

insert into public.yachts (
  id, name, builder, year_built, length_metres, guest_capacity, status
) values (
  '23000000-0000-4000-8000-000000000001',
  'M/Y Offer Test', 'Synthetic Yard', 2024, 40, 12, 'active'
);

insert into public.contacts (id, full_name, email, roles)
values (
  '43000000-0000-4000-8000-000000000001',
  'Offer Test Customer', 'offer.customer@example.test',
  array['customer']::public.contact_role[]
);

insert into public.enquiries (
  id, customer_contact_id, requested_yacht_id, owner_user_id, summary,
  charter_start_date, charter_end_date, guest_count, embarkation_port, disembarkation_port
) values (
  '73000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'Synthetic enquiry for offer database tests.',
  '2026-10-01', '2026-10-08', 10, 'Athens', 'Athens'
);

select lives_ok(
  $$
    insert into public.yacht_commercial_profiles (
      id, yacht_id, overview, short_charter_divisor, default_currency,
      default_tax_rate, key_features
    ) values (
      '83000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001',
      'Synthetic commercial profile for offer tests.', 6, 'eur', 5,
      array[' Feature one ', '', 'Feature two']
    )
  $$,
  'active staff can create a commercial profile'
);

select results_eq(
  $$ select default_currency || ':' || array_to_string(key_features, '|')
     from public.yacht_commercial_profiles
     where id = '83000000-0000-4000-8000-000000000001' $$,
  array['EUR:Feature one|Feature two'],
  'commercial profile values are normalised'
);

insert into public.yacht_rate_periods (
  id, yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate
) values (
  '84000000-0000-4000-8000-000000000001',
  '23000000-0000-4000-8000-000000000001',
  'Autumn test rate', '2026-09-01', '2026-10-31', 150000, 'eur', 5
);

select throws_ok(
  $$
    insert into public.yacht_rate_periods (
      yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate
    ) values (
      '23000000-0000-4000-8000-000000000001',
      'Overlapping rate', '2026-10-15', '2026-11-15', 160000, 'EUR', 5
    )
  $$,
  '23P01',
  'conflicting key value violates exclusion constraint "yacht_rate_periods_no_active_overlap"',
  'active rate periods cannot overlap for one yacht'
);

select lives_ok(
  $$
    insert into public.yacht_sales_materials (
      id, yacht_id, material_type, label, public_url, approved_for_offers
    ) values (
      '85000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001',
      'brochure', 'Synthetic brochure', 'https://materials.example.test/test', true
    )
  $$,
  'active staff can create an approved public sales-material link'
);

select lives_ok(
  $$
    insert into public.yacht_offer_templates (
      id, yacht_id, name, subject_template, body_template
    ) values (
      '86000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001',
      'Initial test response',
      '{{yacht_name}} offer',
      'Dear {{customer_name}}, this is a synthetic offer for {{charter_start_date}}.'
    )
  $$,
  'active staff can create a draft template'
);

select results_eq(
  $$ select version_number from public.yacht_offer_templates
     where id = '86000000-0000-4000-8000-000000000001' $$,
  array[1],
  'the database assigns the first template version'
);

select throws_ok(
  $$
    insert into public.yacht_offer_templates (
      yacht_id, name, subject_template, body_template
    ) values (
      '23000000-0000-4000-8000-000000000001',
      'Unsafe placeholder', '{{unsafe}}',
      'This body is long enough but contains {{unsafe}}.'
    )
  $$,
  '22023', 'Unknown offer template placeholder: unsafe',
  'unknown template placeholders are rejected in PostgreSQL'
);

select throws_ok(
  $$ update public.yacht_offer_templates set status = 'approved'
     where id = '86000000-0000-4000-8000-000000000001' $$,
  '42501', 'Template status must be changed through the approval command',
  'direct template approval is blocked'
);

select lives_ok(
  $$ select public.approve_yacht_offer_template('86000000-0000-4000-8000-000000000001') $$,
  'the explicit template command approves a draft'
);

select ok(
  (select status = 'approved' and approved_by = '13000000-0000-0000-0000-000000000001'
     and approved_at is not null
   from public.yacht_offer_templates
   where id = '86000000-0000-4000-8000-000000000001'),
  'template approval records state, actor, and time'
);

select throws_ok(
  $$ select public.transition_enquiry_status(
       '73000000-0000-4000-8000-000000000001', 'offer_sent', 'Manual bypass attempt'
     ) $$,
  '42501', 'Offer sent state requires a human-recorded sent offer',
  'generic enquiry transitions cannot bypass the reviewed sent-offer command'
);

select throws_ok(
  $$
    insert into public.offers (
      enquiry_id, yacht_id, template_version_id, rate_period_id, version_number,
      recipient_name, subject_snapshot, body_snapshot, charter_start_date,
      charter_end_date, charter_days, weekly_rate_snapshot, proposed_charter_fee,
      currency, tax_rate_snapshot, short_charter_divisor_snapshot
    ) values (
      '73000000-0000-4000-8000-000000000001',
      '23000000-0000-4000-8000-000000000001',
      '86000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000001', 1, 'Customer', 'Subject',
      'This direct offer body is deliberately long enough.',
      '2026-10-01', '2026-10-08', 7, 150000, 150000, 'EUR', 5, 6
    )
  $$,
  '42501', 'Offers must be created through the draft command',
  'direct offer creation is blocked'
);

select lives_ok(
  $$
    select public.create_offer_draft(
      '73000000-0000-4000-8000-000000000001',
      '86000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000001',
      null::uuid, 'Offer Test Customer', 'Synthetic subject',
      'This is the complete synthetic draft body used for the database test.',
      null::numeric
    )
  $$,
  'the draft command creates a reviewed snapshot candidate'
);

select ok(
  (select reference ~ '^OFF-[0-9]{4}-[0-9]{4,}$'
     and version_number = 1 and status = 'draft' and charter_days = 7
     and proposed_charter_fee = 150000 and pricing_basis = 'seasonal_rate'
   from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001'),
  'draft creation snapshots version, dates, rate, and deterministic fee'
);

select is(public.calculate_charter_fee(150000, 3, 6), 75000::numeric, 'short charters use weekly rate divided by six');
select is(public.calculate_charter_fee(150000, 14, 6), 300000::numeric, 'multi-week charters use seven-day pro-rating');

select results_eq(
  $$ select count(*) from public.offer_status_history h join public.offers o on o.id = h.offer_id
     where o.enquiry_id = '73000000-0000-4000-8000-000000000001'
       and h.from_status is null and h.to_status = 'draft' $$,
  array[1::bigint],
  'draft creation records append-only lifecycle history'
);

select results_eq(
  $$ select count(*) from public.workflow_events e join public.offers o on o.id = e.aggregate_id
     where o.enquiry_id = '73000000-0000-4000-8000-000000000001'
       and e.event_type = 'OfferDraftCreated' $$,
  array[1::bigint],
  'draft creation emits a durable workflow event'
);

select throws_ok(
  $$ update public.offers set proposed_charter_fee = 155000
     where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  '42501', 'Only draft offer content can be changed through the draft command',
  'direct draft edits are blocked'
);

select lives_ok(
  $$ select public.update_offer_draft(
       id, 'Offer Test Customer', 'Synthetic subject revised',
       'This revised synthetic body remains long enough for validation.', 155000
     ) from public.offers
     where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  'the draft command can revise unlocked offer content'
);

select ok(
  (select proposed_charter_fee = 155000 and pricing_basis = 'manually_adjusted'
   from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001'),
  'manual fee changes are visibly classified'
);

select lives_ok(
  $$ select public.approve_offer(id, 'Reviewed wording and commercial terms')
     from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  'the latest draft can be explicitly approved'
);

select ok(
  (select status = 'approved' and approved_by = '13000000-0000-0000-0000-000000000001'
     and approved_at is not null
   from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001'),
  'offer approval records actor and time'
);

select results_eq(
  $$ select count(*) from public.offer_status_history h join public.offers o on o.id = h.offer_id
     where o.enquiry_id = '73000000-0000-4000-8000-000000000001'
       and h.to_status = 'approved' and h.reason = 'Reviewed wording and commercial terms' $$,
  array[1::bigint],
  'offer approval records the human reason'
);

select results_eq(
  $$ select count(*) from public.workflow_events e join public.offers o on o.id = e.aggregate_id
     where o.enquiry_id = '73000000-0000-4000-8000-000000000001'
       and e.event_type = 'OfferApproved' $$,
  array[1::bigint],
  'offer approval emits a durable event'
);

select throws_ok(
  $$ update public.offers set subject_snapshot = 'Changed after approval'
     where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  '42501', 'Only draft offer content can be changed through the draft command',
  'approved snapshot content is immutable'
);

select lives_ok(
  $$ select public.mark_offer_sent(id, 'Sent manually after final review')
     from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  'a human can record an approved offer as sent'
);

select ok(
  (select status = 'sent' and sent_by = '13000000-0000-0000-0000-000000000001'
     and sent_at is not null
   from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001'),
  'sent recording stores actor and time without sending email'
);

select results_eq(
  $$ select status::text from public.enquiries where id = '73000000-0000-4000-8000-000000000001' $$,
  array['offer_sent'::text],
  'recording the first sent offer moves the enquiry atomically'
);

select results_eq(
  $$ select count(*) from public.enquiry_status_history
     where enquiry_id = '73000000-0000-4000-8000-000000000001'
       and from_status = 'new' and to_status = 'offer_sent' $$,
  array[1::bigint],
  'the enquiry transition remains fully audited'
);

select results_eq(
  $$ select count(*) from public.workflow_events e join public.offers o on o.id = e.aggregate_id
     where o.enquiry_id = '73000000-0000-4000-8000-000000000001'
       and e.event_type = 'OfferMarkedSent' $$,
  array[1::bigint],
  'sent recording emits a durable offer event'
);

select lives_ok(
  $$
    select public.create_offer_draft(
      '73000000-0000-4000-8000-000000000001',
      '86000000-0000-4000-8000-000000000001',
      '84000000-0000-4000-8000-000000000001',
      id, 'Offer Test Customer', 'Second synthetic subject',
      'This second synthetic draft represents a revised proposal snapshot.',
      152000
    ) from public.offers
    where enquiry_id = '73000000-0000-4000-8000-000000000001' and status = 'sent'
  $$,
  'a sent offer can be followed by a new revision snapshot'
);

select ok(
  (select count(*) = 2 and count(*) filter (where status = 'sent') = 1
     and max(version_number) = 2
   from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001'),
  'revision preserves sent history and creates the next version'
);

select lives_ok(
  $$
    insert into public.yacht_offer_templates (
      id, yacht_id, name, subject_template, body_template
    ) values (
      '86000000-0000-4000-8000-000000000002',
      '23000000-0000-4000-8000-000000000001',
      'Second test response', '{{yacht_name}} revised offer',
      'Dear {{customer_name}}, this is the second synthetic version for review.'
    )
  $$,
  'a new template draft creates a second version'
);

select lives_ok(
  $$ select public.approve_yacht_offer_template('86000000-0000-4000-8000-000000000002') $$,
  'approving a new template version retires the previous one'
);

select ok(
  (select count(*) filter (where status = 'approved') = 1
     and count(*) filter (where status = 'retired') = 1
     and max(version_number) = 2
   from public.yacht_offer_templates
   where yacht_id = '23000000-0000-4000-8000-000000000001'),
  'one current approved template and immutable history are retained'
);

select results_eq(
  $$ select count(*) from public.audit_events
     where entity_type in ('yacht_commercial_profile', 'yacht_rate_period',
       'yacht_sales_material', 'yacht_offer_template', 'offer')
       and actor_user_id = '13000000-0000-0000-0000-000000000001' $$,
  array[13::bigint],
  'commercial and offer mutations are attributed in the audit log'
);

select throws_ok(
  $$ insert into public.offer_status_history (offer_id, to_status, reason)
     select id, 'withdrawn', 'Direct history write'
     from public.offers limit 1 $$,
  '42501', 'permission denied for table offer_status_history',
  'offer history is application read-only'
);

select throws_ok(
  $$ delete from public.offers where enquiry_id = '73000000-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table offers',
  'offers cannot be deleted by application users'
);

set local "request.jwt.claim.sub" = '13000000-0000-0000-0000-000000000002';

select results_eq(
  $$ select count(*) from public.offers $$,
  array[0::bigint],
  'inactive users cannot view offers'
);

select throws_ok(
  $$ select public.approve_offer(
       '00000000-0000-0000-0000-000000000000', 'Should be rejected'
     ) $$,
  '42501', 'An active internal account is required',
  'inactive users cannot invoke offer commands'
);

select * from finish();
rollback;
