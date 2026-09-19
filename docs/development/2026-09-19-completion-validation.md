# Completion validation

The combined email ownership, private Telegram receiver, local-AI transport,
configuration and payment-task changes pass lint, TypeScript, 180 unit tests
(three intentional skips), 1,041 database assertions and the production build.
Older fixtures now declare mailbox ownership explicitly and prepare their own
draft templates inside rolled-back transactions. No operational records were reset.

Backup export now includes Vault, ACLs, encrypted deployment configuration and
the database configuration volume. Offsite copy uses separate `copyto` operations
and downloaded checksum verification; failure never advances success evidence.
Restore retains neighbouring containers and restores ACLs. A fresh-host disaster
restore must recover the database encryption-key volume before starting Postgres;
the staging script deliberately does not overwrite host secrets or key volumes.
Secrets in the encrypted archive must not be imported into a synthetic environment.

Live backup activation remains blocked by the absent recipient and offsite remote.
Fresh-host credential decryption/restore and real Mac/provider acceptance remain
unverified. Source changes are not evidence of deployment.

The local disposable database restore also passed with ownership and ACLs
preserved; it checks mailbox RLS, authenticated read grants and anonymous denial.
This is not an offsite or fresh-host encryption-key recovery acceptance.
