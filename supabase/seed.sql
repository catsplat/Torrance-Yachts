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
