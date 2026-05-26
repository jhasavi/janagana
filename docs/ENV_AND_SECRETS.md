# Environment Variables and Secrets Policy — Janagana v3

## Rules

1. **`.env.example`** — committed to git — contains only placeholder values, never real secrets.
2. **`.env.local`** — NOT committed — contains real local dev secrets. Overrides `.env`.
3. **`.env`** — NOT committed if it contains real secrets. Only use for non-secret defaults.
4. **No secrets in git** — enforced by `.gitignore` and pre-commit check.
5. **Clerk dev keys ≠ Clerk prod keys** — dev keys map to dev DB tenants, prod keys map to prod DB tenants. They must never be swapped.
6. **No test-auth flags in real Clerk smoke** — `E2E_TEST_MODE`, `PLAYWRIGHT_TEST`, `NODE_ENV=test` are not permitted in the production middleware code path.

---

## Required Variables

### App

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Full URL of the app | `https://janagana.namasteneedham.com` |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |

### Clerk

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | `pk_live_...` or `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_live_...` or `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-sign-in redirect | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-sign-up redirect | `/onboarding/create-organization` |
| `CLERK_WEBHOOK_SECRET` | Svix webhook signing secret from Clerk dashboard | `whsec_...` |

### Stripe (deferred to v3.1)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe backend key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe frontend key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

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
const orgId = request.cookies.get('JG_ACTIVE_ORG')?.value;
// ^ This must always be re-validated against Clerk session

// FORBIDDEN: creating Clerk orgs in public registration
await clerkClient.organizations.createOrganization({ ... }); // in public path
```
