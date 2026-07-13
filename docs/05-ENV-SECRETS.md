# Environment Variables and Secrets Policy — Janagana v3

## Rules

1. **`.env.example`** — committed to git — contains only placeholder values, never real secrets.
2. **`.env.local`** — NOT committed — **development** Clerk test keys + dev `DATABASE_URL`.
3. **`.env.pilot.prod.local`** — NOT committed — production maintenance only: `PRODUCTION_DATABASE_URL` + live Clerk keys for `pilot:preflight --production`.
4. **`.env.legacy.archive`** — optional archive if you migrated from an old monolith `.env`; not loaded by pilot scripts.
5. **Do not use a bloated root `.env`** for JanaGana v3 — run `npm run env:setup -- --apply` to consolidate.
4. **No secrets in git** — enforced by `.gitignore` and pre-commit check.
5. **Clerk dev keys ≠ Clerk prod keys** — dev keys map to dev DB tenants, prod keys map to prod DB tenants. They must never be swapped.
6. **No test-auth flags in real Clerk smoke** — `E2E_TEST_MODE`, `PLAYWRIGHT_TEST`, `NODE_ENV=test` are not permitted in the production middleware code path.

---

## Required Variables

### App

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Full URL of the app (local dev uses localhost:3020) | `http://localhost:3020` |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |

### Clerk

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | `pk_live_...` or `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-sign-in redirect | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-sign-up redirect | `/dashboard` |
| `CLERK_WEBHOOK_SECRET` | Svix webhook signing secret from Clerk dashboard | `whsec_...` |

### Stripe (optional for paid public membership checkout)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe backend key used to create Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret used by `/api/webhooks/stripe` |

### Email (production receipts + renewal reminders)

| Variable | Description |
|---|---|
| `ZEPTOMAIL_TOKEN` | ZeptoMail API token for outbox delivery (shared with the `namasteneedham.com` ZeptoMail account used by the NB/TPW sites) |
| `ZEPTOMAIL_FROM` | From address, must be a verified sender on the ZeptoMail account (e.g. `noreply@namasteneedham.com`) |
| `ZEPTOMAIL_FROM_NAME` | Optional From display name (defaults to `JanaGana`) |

### Production ops

| Variable | Description |
|---|---|
| `CRON_SECRET` | Bearer token Vercel sends to `/api/cron/renewal-reminders` |
| `OPS_ALERT_WEBHOOK_URL` | Slack-compatible webhook for Stripe/email/cron failures |

### Ops (optional)

| Variable | Description |
|---|---|
| `ENABLE_CLERK_TENANT_RECONCILIATION` | Set to `true` only when running the Clerk/JanaGana reconciliation endpoint. |
| `CLERK_TENANT_RECONCILIATION_TOKEN` | Bearer token for `/api/ops/clerk-tenant-reconciliation`. |
| `PRODUCTION_DATABASE_URL` | Local-only override when running pilot scripts against prod Neon (not exposed by `vercel env run`). |
| `PILOT_TPW_CLERK_ORG_ID` | Clerk org ID for `npm run pilot:seed` (purple-wings). |
| `PILOT_NB_CLERK_ORG_ID` | Clerk org ID for `npm run pilot:seed` (namaste-boston). |
| `ENABLE_SELF_SERVE_ONBOARDING` | Recommended `true` for public launch — lets a new Clerk sign-up create their own org/tenant from `/onboarding/create-organization`. Set `false` to restrict onboarding to admin-invited orgs only. |
| `ENABLE_EXISTING_ORG_SETUP` | Default off. When `true`, UI allows mapping an existing Clerk org to a tenant. |

### Apple / Google Wallet (optional)

Both are gated by `lib/wallet/config.ts`; "Add to Wallet" buttons on the digital membership card stay hidden unless every required variable below is set. JanaGana never generates or holds these credentials — they come from the tenant owner's own Apple Developer / Google Cloud accounts.

| Variable | Description |
|---|---|
| `APPLE_WALLET_CERT_BASE64` | Base64-encoded Apple pass-type certificate (PEM) |
| `APPLE_WALLET_KEY_BASE64` | Base64-encoded signing key (PEM) |
| `APPLE_WALLET_KEY_PASSPHRASE` | Passphrase for the signing key, if any |
| `APPLE_WALLET_WWDR_BASE64` | Base64-encoded Apple WWDR intermediate certificate |
| `APPLE_WALLET_PASS_TYPE_ID` | Apple pass type identifier (e.g. `pass.com.yourdomain.membership`) |
| `APPLE_WALLET_TEAM_ID` | Apple Developer team id |
| `APPLE_WALLET_ICON_BASE64` | Optional base64 PNG for the pass icon; falls back to a generated placeholder |
| `GOOGLE_WALLET_ISSUER_ID` | Google Wallet issuer id |
| `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` | Full Google Cloud service account JSON (stringified) with Wallet API access |

### JanaGana API keys

JanaGana v3 does not generate API keys. Partner sites should use portal links and the read-only embed endpoints until the API-key feature is built.

---

## Dev/Prod Key Mapping

The Clerk publishable key prefix identifies the environment:

| Prefix | Environment | DB |
|---|---|---|
| `pk_test_` | Development | Dev Neon DB |
| `pk_live_` | Production | Prod Neon DB |

**If `pk_live_` keys are used with a dev DB, tenant mappings will break.**
Run `npm run check:env` to validate alignment before every deploy.

---

## `.gitignore` Requirements

The following must be in `.gitignore`:
```
.env
.env.local
.env.*.local
*.local
```

---

## Real Clerk Smoke Test Env

The real Clerk smoke test (`playwright.real-clerk.config.ts`) requires:

```
CLERK_E2E_USER_EMAIL=<real test user email>
CLERK_E2E_USER_PASSWORD=<real test user password>
```

These must NEVER be committed. Store them in CI secrets only.

---

## Forbidden Patterns

```typescript
// FORBIDDEN: test-auth in production middleware
if (process.env.E2E_TEST_MODE === 'true') { ... }
if (process.env.PLAYWRIGHT_TEST === 'true') { ... }
if (process.env.NODE_ENV === 'test') { ... }

// FORBIDDEN: reading cookies as auth source of truth
const tenantId = request.cookies.get('JG_ACTIVE_TENANT_ID')?.value;
// ^ This must always be re-validated against Clerk memberships

// FORBIDDEN: creating Clerk orgs in public registration
await clerkClient.organizations.createOrganization({ ... }); // in public path
```
