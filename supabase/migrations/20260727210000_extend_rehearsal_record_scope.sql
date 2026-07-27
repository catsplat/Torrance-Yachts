-- A complete fictional charter must have an explicit ownership boundary for
-- every derived financial, document, and manual-external-action record.
alter table public.rehearsal_run_records
  drop constraint rehearsal_run_records_entity_type_check;

alter table public.rehearsal_run_records
  add constraint rehearsal_run_records_entity_type_check check (
    entity_type in (
      'yacht', 'contact', 'email_thread', 'email_message', 'enquiry', 'offer',
      'booking', 'task', 'document', 'notification', 'contract_review',
      'payment', 'commission_calculation', 'generated_invoice',
      'yachtfolio_action'
    )
  );
