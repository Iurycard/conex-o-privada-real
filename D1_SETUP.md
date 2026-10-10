# D1 and R2 setup

The app uses a password/session API backed by D1. Passwords are PBKDF2-SHA-256 hashes; session tokens are random, stored as SHA-256 hashes in D1, and delivered in an HttpOnly, SameSite=Lax cookie. R2 media uses the Worker bucket binding and authenticated same-origin routes.

## Bind existing Cloudflare resources

Edit `wrangler.toml` and replace:

- `database_name` (currently set to `coexaoprivada`) and `database_id` with the exact name and ID of the D1 database already created in Cloudflare.
- `bucket_name` with the name of the R2 bucket.

Keep binding names `DB` and `MEDIA`; the Worker reads those names.

## Local development

Run `npm run dev` to build the Worker, initialize and seed local D1, and start Wrangler on port 8080. The CLI and Worker share `.wrangler/state`, so local registration and testing use the same database and do not write to Cloudflare resources. The schema and seed commands are safe to rerun.

The separate `npm run db:init` and `npm run db:seed` commands explicitly apply the schema and fixtures to the configured remote D1 database. Apply `npm run db:init` before deploying schema changes; it creates the per-conversation read state and per-user conversation deletion state, password-reset tables, email preference/digest tables, and administration/support tables. The admin additions include account suspensions, verified profiles and requests, support tickets and replies, platform settings, and the audit log. Deploy with `npm run build` followed by `npm run cf:deploy`; the Cloudflare commands use Nitro's generated Worker config so its static-assets binding is included.

## Resend email and password recovery

The Worker sends password-reset links and daily activity summaries through Resend. The sender address must belong to a domain verified in Resend. Never put the Resend API key in source control, `wrangler.toml`, or any `VITE_*` variable.

### Local development

Copy `.dev.vars.example` to `.dev.vars`, then replace `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` with local/test values. `.dev.vars` is ignored by Git. For password-reset email delivery, the Resend account must allow sending to the test recipient.

### Cloudflare Worker

Before deploying, apply the schema with `npm run db:init`, then build and deploy. Add the following in the Worker's **Settings > Variables and Secrets**:

- `RESEND_API_KEY` as an encrypted secret (or run `npx wrangler secret put RESEND_API_KEY`).
- `EMAIL_FROM` as a text variable, using the sender address verified in Resend, for example `Conexão Privada <notificacoes@seudominio.com>`.
- `APP_URL` as a text variable containing the public HTTPS origin of the deployed application, without a path.

In Cloudflare DNS, add the SPF/DKIM records Resend provides and configure DMARC for the sending domain. Confirm the domain shows as verified in Resend.

The Worker cron is configured for `0 9 * * *` (09:00 UTC daily, 06:00 in São Paulo). It summarizes notification activity from the preceding 24 hours and sends only when there is activity. Existing and new users receive daily summaries by default; users can turn them off under **Configurações > Notificações por e-mail**. Each user is sent at most one digest per UTC date.

Support replies from `/admin` also use Resend. Configure `RESEND_API_KEY` as an encrypted secret and `EMAIL_FROM` as a verified sender before using the reply action. Ticket creation itself is persisted in D1 and does not require an email client.

## VIP subscriptions with Mercado Pago

The VIP checkout accepts PIX and hosted card checkout for R$ 19,90 (30 days) and R$ 49,90 (90 days). Card details are entered only on Mercado Pago; they are never collected by this app. The Worker verifies signed Mercado Pago webhooks, fetches each payment from the Mercado Pago API, checks its order, plan, currency and value, and only then extends the account's VIP expiration. VIP API permissions are based on the future `subscription_expires_at` timestamp, not the legacy `vip` flag.

### Apply the database migration

For an existing D1 database, apply the VIP migration once before deploying the Worker:

```powershell
npm run db:migrate:vip
```

For an existing local development database, apply the local migration once:

```powershell
npm run db:migrate:vip:local
```

The migration adds subscription fields to `profiles` and creates `vip_payments` for payment tracking and duplicate-webhook protection. The same schema is included in `schema_d1.sql` for fresh databases. Do not rerun the migration after it succeeds: SQLite `ALTER TABLE ADD COLUMN` is intentionally a one-time operation.

### Configure Mercado Pago and deploy

In Cloudflare, add both values as encrypted Worker secrets (never put them in `wrangler.toml`, source code, or `VITE_*` variables):

```powershell
npx wrangler secret put MERCADOPAGO_ACCESS_TOKEN
npx wrangler secret put MERCADOPAGO_WEBHOOK_SECRET
```

Use the access token for the same Mercado Pago environment (test or production) as the account used to create the payment. Get the webhook signing secret from the Mercado Pago application/webhook settings and enter that exact secret as `MERCADOPAGO_WEBHOOK_SECRET`.

Configure Mercado Pago to send **payment** notifications to:

```text
https://www.conexaoprivada.site/api/webhooks/mercadopago
```

Enable the payment events (`payment.created` and `payment.updated`) and ensure webhook signing is enabled. The webhook URL must be publicly reachable over HTTPS. For local tests, copy `.dev.vars.example` to `.dev.vars` and use sandbox credentials and a test webhook secret; `.dev.vars` is ignored by Git.

After the one-time migration and secrets are configured, deploy:

```powershell
npm run build
npm run cf:deploy
```

Test PIX generation and hosted card checkout using Mercado Pago test accounts before enabling production credentials. The checkout is authenticated; the Worker determines the account from its session rather than trusting a client-provided user ID.

## Existing account and media migration

The repository does not contain an export of the four real profiles or production rows. The four profile inserts in `seed_d1.sql` are explicitly named demo fixtures; replace them with a sanitized export before production. Events are copied from the existing SQL seed in the Supabase migrations. Profile types, genders, and orientations are copied from the frontend option lists.

Supabase Auth password hashes cannot be exported for reuse. Existing users must create a new D1-backed account and password; there is no Supabase login fallback. Export profile/post/social/event rows separately and map their UUIDs to `TEXT` IDs. Existing Supabase Storage objects must be copied to the R2 bucket and their stored paths updated to the `owner/(public|private)/r2/file.webp` convention.

Passwords use PBKDF2-SHA-256 with 100,000 iterations to stay within the Cloudflare Workers Web Crypto limit. Users can change their password while signed in after confirming the current password, or request an email reset link from the login screen. Reset links are single-use and expire after one hour; completing a reset invalidates all existing sessions. Accounts whose password hashes were created with more than 100,000 iterations must use the password-reset flow once; Cloudflare Workers cannot verify those older hashes.

Users can permanently delete their account from **Configurações > Excluir conta** after re-entering their current password. The Worker removes their profile, authentication identity, related D1 records, and owned R2 photos; this cannot be undone.

## First administrator

After registering the first account, obtain its ID from `auth_users`, then grant admin access in D1:

```sql
INSERT INTO user_roles (id, user_id, role)
VALUES ('<new-uuid>', '<auth-user-id>', 'admin');
```

Do not grant admin to a public/demo profile. Keep D1 and R2 bindings attached to the same Worker environment.
