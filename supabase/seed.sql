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
  );
