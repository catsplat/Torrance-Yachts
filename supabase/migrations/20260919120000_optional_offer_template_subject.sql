-- A reply template may omit a subject; the prepared offer still snapshots the
-- actual conversation subject before approval. Existing versions are unchanged.
alter table public.yacht_offer_templates drop constraint yacht_offer_templates_subject_template_check;
alter table public.yacht_offer_templates add constraint yacht_offer_templates_subject_template_check
  check (char_length(trim(subject_template)) <= 300);
