-- Synthetic local-development records only. Never replace these with live business data.

insert into public.yachts (
  name,
  builder,
  year_built,
  length_metres,
  beam_metres,
  guest_capacity,
  cabin_count,
  crew_count,
  cruise_speed_knots,
  max_speed_knots,
  home_port,
  preferred_ports,
  notification_phone,
  status,
  notes
)
values
  (
    'M/Y Asteria',
    'Example Shipyard',
    2022,
    43.00,
    9.00,
    12,
    5,
    9,
    12.00,
    16.00,
    'Athens',
    array['Athens', 'Mykonos'],
    null,
    'active',
    'Synthetic demonstration yacht. No live contacts or commercial terms.'
  ),
  (
    'S/Y Meridian',
    'Demo Marine',
    2019,
    31.50,
    7.20,
    8,
    4,
    5,
    9.00,
    12.50,
    'Palma',
    array['Palma', 'Ibiza'],
    null,
    'maintenance',
    'Synthetic record used to exercise operational-status filtering.'
  )
on conflict do nothing;

insert into public.companies (id, name, email, phone, website, notes)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'Aegean Charter Partners (Synthetic)',
    'operations@aegean-charter.example.test',
    '+44 1632 960001',
    'https://aegean-charter.example.test',
    'Synthetic broker company used only for local demonstrations.'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'Meridian Marine Services (Synthetic)',
    'office@meridian-marine.example.test',
    '+44 1632 960002',
    'https://meridian-marine.example.test',
    'Synthetic yacht-operations company.'
  )
on conflict do nothing;

insert into public.contacts (id, full_name, email, phone, roles, notes)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'Sofia Mercer (Synthetic)',
    'sofia.mercer@example.test',
    '+44 1632 960011',
    array['broker']::public.contact_role[],
    'Synthetic charter-broker contact.'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'Elias North (Synthetic)',
    'elias.north@example.test',
    '+44 1632 960012',
    array['captain', 'operations']::public.contact_role[],
    'Synthetic captain and yacht-operations contact.'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'Mira Vale (Synthetic)',
    'mira.vale@example.test',
    '+44 1632 960013',
    array['customer', 'charterer']::public.contact_role[],
    'Synthetic prospective-charterer contact.'
  )
on conflict do nothing;

insert into public.company_contacts (
  id,
  company_id,
  contact_id,
  job_title,
  is_primary
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Charter broker',
    true
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000002',
    'Captain and operations lead',
    true
  )
on conflict do nothing;

insert into public.yacht_contacts (
  id,
  yacht_id,
  contact_id,
  responsibility,
  is_primary,
  notifications_enabled,
  notes
)
select
  '60000000-0000-4000-8000-000000000001',
  yachts.id,
  '40000000-0000-4000-8000-000000000002',
  'captain'::public.yacht_contact_responsibility,
  true,
  true,
  'Synthetic primary captain assignment.'
from public.yachts
where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.enquiries (
  id,
  customer_contact_id,
  broker_contact_id,
  broker_company_id,
  requested_yacht_id,
  priority,
  summary,
  charter_start_date,
  charter_end_date,
  guest_count,
  embarkation_port,
  disembarkation_port,
  budget_amount,
  currency
)
select
  '70000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  yachts.id,
  'high'::public.enquiry_priority,
  'Synthetic family charter enquiry for a one-week Athens itinerary.',
  '2026-08-14',
  '2026-08-21',
  10,
  'Athens',
  'Athens',
  180000.00,
  'EUR'
from public.yachts
where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.enquiries (
  id,
  broker_contact_id,
  broker_company_id,
  requested_yacht_id,
  priority,
  summary,
  charter_start_date,
  charter_end_date,
  guest_count,
  embarkation_port,
  disembarkation_port
)
select
  '70000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  yachts.id,
  'normal'::public.enquiry_priority,
  'Synthetic broker enquiry for a flexible September itinerary.',
  '2026-09-05',
  '2026-09-12',
  8,
  'Athens',
  'Mykonos'
from public.yachts
where yachts.name = 'M/Y Asteria'
on conflict do nothing;

select set_config('app.enquiry_transition_authorised', 'yes', false);
select set_config(
  'app.enquiry_transition_reason',
  'Synthetic offer recorded for pipeline demonstration',
  false
);

update public.enquiries
set status = 'offer_sent'
where id = '70000000-0000-4000-8000-000000000002'
  and status = 'new';

select set_config('app.enquiry_transition_authorised', '', false);
select set_config('app.enquiry_transition_reason', '', false);

insert into public.yacht_commercial_profiles (
  id,
  yacht_id,
  overview,
  port_guidance,
  fuel_consumption_lph,
  fuel_consumption_speed_knots,
  short_charter_divisor,
  default_currency,
  default_tax_rate,
  key_features,
  reference_notes
)
select
  '80000000-0000-4000-8000-000000000001',
  yachts.id,
  'A contemporary synthetic motor yacht configured solely for local workflow demonstrations.',
  'Athens round trips are preferred for the synthetic demonstration, with alternatives subject to review.',
  210.00,
  12.00,
  6.00,
  'EUR',
  5.00,
  array[
    'Expansive beam and bright interior',
    'Experienced synthetic demonstration crew',
    'Flexible outdoor dining areas'
  ],
  'Synthetic references are available for local demonstrations. No real broker or guest is represented.'
from public.yachts
where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.yacht_rate_periods (
  id, yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate
)
select
  '81000000-0000-4000-8000-000000000001',
  yachts.id,
  'Synthetic high season 2026',
  '2026-07-01',
  '2026-08-31',
  168000.00,
  'EUR',
  5.00
from public.yachts where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.yacht_rate_periods (
  id, yacht_id, name, valid_from, valid_to, weekly_rate, currency, tax_rate
)
select
  '81000000-0000-4000-8000-000000000002',
  yachts.id,
  'Synthetic autumn 2026',
  '2026-09-01',
  '2026-10-31',
  142000.00,
  'EUR',
  5.00
from public.yachts where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.yacht_sales_materials (
  id, yacht_id, material_type, label, public_url, approved_for_offers, sort_order
)
select
  '82000000-0000-4000-8000-000000000001',
  yachts.id,
  'brochure'::public.sales_material_type,
  'M/Y Asteria synthetic brochure',
  'https://materials.example.test/asteria-brochure',
  true,
  10
from public.yachts where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.yacht_sales_materials (
  id, yacht_id, material_type, label, public_url, approved_for_offers, sort_order
)
select
  '82000000-0000-4000-8000-000000000002',
  yachts.id,
  'sample_menu'::public.sales_material_type,
  'M/Y Asteria synthetic sample menu',
  'https://materials.example.test/asteria-menu',
  true,
  20
from public.yachts where yachts.name = 'M/Y Asteria'
on conflict do nothing;

insert into public.yacht_offer_templates (
  id, yacht_id, name, subject_template, body_template
)
select
  '83000000-0000-4000-8000-000000000001',
  yachts.id,
  'Synthetic charter response',
  '{{yacht_name}} charter proposal — {{charter_start_date}}',
  E'Dear {{customer_name}},\n\nMany thanks for the enquiry. Please find our reviewed proposal for {{yacht_name}} below.\n\nCharter dates: {{charter_start_date}} to {{charter_end_date}}\nRoute: {{embarkation_port}} to {{disembarkation_port}}\nGuests: {{guest_count}}\nWeekly rate: {{weekly_rate}} {{currency}} plus {{tax_rate}}% tax\nProposed charter fee: {{proposed_charter_fee}} {{currency}}\n\n{{port_guidance}}\n\n{{yacht_overview}}\n\nKEY specifications:\n{{yacht_specifications}}\n\nKEY features:\n{{key_features}}\n\nApproved materials:\n{{sales_materials}}\n\nReferences:\n{{references}}\n\nPlease let me know if you have any questions.'
from public.yachts where yachts.name = 'M/Y Asteria'
on conflict do nothing;

select set_config('app.task_template_create_authorised', 'yes', false);
insert into public.task_templates (
  id, version_number, name, description
) values (
  '90000000-0000-4000-8000-000000000001',
  1,
  'Standard charter booking workflow',
  'Synthetic configurable workflow representing the supplied Torrance Yachts booking sequence.'
)
on conflict do nothing;
select set_config('app.task_template_create_authorised', '', false);

select set_config('app.task_template_step_authorised', 'yes', false);
insert into public.task_template_steps (
  id, template_id, step_code, title, description, priority, required,
  due_anchor, due_offset_days, due_date_required, reminder_lead_days,
  escalation_after_days, external_action, auto_complete_on_generation, sort_order
)
values
  ('91000000-0000-4000-8000-000000000000','90000000-0000-4000-8000-000000000001','0.0','Start booking task sequence','System milestone created by human-confirmed booking.','normal',true,'booking_confirmed',0,true,null,null,'none',true,0),
  ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','0.A','Request broker KYC statement and client passport','Prepare the approved request wording and follow up until received.','urgent',true,'booking_confirmed',0,true,0,2,'none',false,10),
  ('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000001','0.B','Record KYC, passport, and CDD check','Private document handling is delivered in Phase 8.','high',true,'none',0,false,null,null,'none',false,20),
  ('91000000-0000-4000-8000-000000000003','90000000-0000-4000-8000-000000000001','1.A','Record fully signed charter agreement','Private contract upload is delivered in Phase 8.','high',true,'none',0,false,null,null,'none',false,30),
  ('91000000-0000-4000-8000-000000000004','90000000-0000-4000-8000-000000000001','1.B','Review signed-contract operational data','Review dates, ports, commercial terms, instalments, and commission fields.','high',true,'none',0,false,null,null,'none',false,40),
  ('91000000-0000-4000-8000-000000000005','90000000-0000-4000-8000-000000000001','1.C','Prepare commission invoice draft','Invoice generation and protected business templates arrive in Phase 8.','high',true,'none',0,false,null,null,'none',false,50),
  ('91000000-0000-4000-8000-000000000006','90000000-0000-4000-8000-000000000001','1.D','Record commission invoice','Private invoice upload is delivered in Phase 8.','normal',true,'none',0,false,null,null,'none',false,60),
  ('91000000-0000-4000-8000-000000000007','90000000-0000-4000-8000-000000000001','1.E','Add booked dates and status to Yachtfolio','Complete the linked Yachtfolio action before completing this task.','urgent',true,'none',0,false,null,null,'yachtfolio_booking',false,70),
  ('91000000-0000-4000-8000-000000000008','90000000-0000-4000-8000-000000000001','2.A','Send captain contact details to broker','Prepare and externally send the reviewed captain-contact message.','normal',true,'none',0,false,null,null,'none',false,80),
  ('91000000-0000-4000-8000-000000000009','90000000-0000-4000-8000-000000000001','2.B','Notify captain of booking','Notification delivery is connected in Phase 11.','high',true,'none',0,false,null,null,'none',false,90),
  ('91000000-0000-4000-8000-000000000010','90000000-0000-4000-8000-000000000001','3','First instalment due','Due date remains blocked until reviewed contract data exists in Phase 8.','urgent',true,'contract_payment_1',0,true,5,1,'none',false,100),
  ('91000000-0000-4000-8000-000000000011','90000000-0000-4000-8000-000000000001','4.A','Second instalment due','Due date remains blocked until reviewed contract data exists in Phase 8.','urgent',true,'contract_payment_2',0,true,5,1,'none',false,110),
  ('91000000-0000-4000-8000-000000000012','90000000-0000-4000-8000-000000000001','4.B','Optional third instalment due','Use only when the reviewed contract contains a third instalment.','high',false,'contract_payment_3',0,true,5,1,'none',false,120),
  ('91000000-0000-4000-8000-000000000013','90000000-0000-4000-8000-000000000001','5','Start of charter','Operational start checkpoint based on the reviewed charter start date.','urgent',true,'charter_start',0,true,1,0,'none',false,130),
  ('91000000-0000-4000-8000-000000000014','90000000-0000-4000-8000-000000000001','6','End of charter','Operational end checkpoint based on the reviewed charter end date.','urgent',true,'charter_end',0,true,1,0,'none',false,140),
  ('91000000-0000-4000-8000-000000000015','90000000-0000-4000-8000-000000000001','7','Broker follow-up and commission invoice','Follow up for a reference and record the broker commission invoice.','normal',true,'charter_end',2,true,1,2,'none',false,150)
on conflict do nothing;

insert into public.task_template_step_dependencies (step_id, depends_on_step_id)
values
  ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000000'),
  ('91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001'),
  ('91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000002'),
  ('91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000003'),
  ('91000000-0000-4000-8000-000000000005','91000000-0000-4000-8000-000000000003'),
  ('91000000-0000-4000-8000-000000000006','91000000-0000-4000-8000-000000000005'),
  ('91000000-0000-4000-8000-000000000007','91000000-0000-4000-8000-000000000003'),
  ('91000000-0000-4000-8000-000000000008','91000000-0000-4000-8000-000000000003'),
  ('91000000-0000-4000-8000-000000000009','91000000-0000-4000-8000-000000000008'),
  ('91000000-0000-4000-8000-000000000010','91000000-0000-4000-8000-000000000004'),
  ('91000000-0000-4000-8000-000000000011','91000000-0000-4000-8000-000000000004'),
  ('91000000-0000-4000-8000-000000000012','91000000-0000-4000-8000-000000000004'),
  ('91000000-0000-4000-8000-000000000015','91000000-0000-4000-8000-000000000014')
on conflict do nothing;
select set_config('app.task_template_step_authorised', '', false);
