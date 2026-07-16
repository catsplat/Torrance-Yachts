-- Release 0.13: internal staff alerts use distinct delivery operations so they
-- cannot be confused with external Gmail drafts.

alter type public.integration_operation add value if not exists 'gmail_send_internal';
alter type public.notification_channel add value if not exists 'email_alert';
