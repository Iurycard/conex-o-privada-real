# D1 and R2 setup

The app uses a password/session API backed by D1. Passwords are PBKDF2-SHA-256 hashes; session tokens are random, stored as SHA-256 hashes in D1, and delivered in an HttpOnly, SameSite=Lax cookie. R2 media uses the Worker bucket binding and authenticated same-origin routes.

## Bind existing Cloudflare resources

Edit `wrangler.toml` and replace:

- `database_name` (currently set to `coexaoprivada`) and `database_id` with the exact name and ID of the D1 database already created in Cloudflare.
- `bucket_name` with the name of the R2 bucket.

Keep binding names `DB` and `MEDIA`; the Worker reads those names.

## Local development

Run `npm run dev` to build the Worker, initialize and seed local D1, and start Wrangler on port 8080. The CLI and Worker share `.wrangler/state`, so local registration and testing use the same database and do not write to Cloudflare resources. The schema and seed commands are safe to rerun.

The separate `npm run db:init` and `npm run db:seed` commands explicitly apply the schema and fixtures to the configured remote D1 database. Deploy with `npm run build` followed by `npm run cf:deploy`; the Cloudflare commands use Nitro's generated Worker config so its static-assets binding is included.

## Existing account and media migration

The repository does not contain an export of the four real profiles or production rows. The four profile inserts in `seed_d1.sql` are explicitly named demo fixtures; replace them with a sanitized export before production. Events are copied from the existing SQL seed in the Supabase migrations. Profile types, genders, and orientations are copied from the frontend option lists.

Supabase Auth password hashes cannot be exported for reuse. Existing users must create a new D1-backed account and password; there is no Supabase login fallback. Export profile/post/social/event rows separately and map their UUIDs to `TEXT` IDs. Existing Supabase Storage objects must be copied to the R2 bucket and their stored paths updated to the `owner/(public|private)/r2/file.webp` convention.

The default password-recovery screen only supports an authenticated password change after confirming the current password. Email-based recovery is not enabled until a delivery provider and one-time reset-token flow are configured.

## First administrator

After registering the first account, obtain its ID from `auth_users`, then grant admin access in D1:

```sql
INSERT INTO user_roles (id, user_id, role)
VALUES ('<new-uuid>', '<auth-user-id>', 'admin');
```

Do not grant admin to a public/demo profile. Keep D1 and R2 bindings attached to the same Worker environment.
