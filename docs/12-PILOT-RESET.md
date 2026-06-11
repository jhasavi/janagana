# Pilot testing & reset (three modes)

Use when QA data, wrong Clerk mappings, or cross-community confusion block end-to-end testing.

**Approved pilot tenants:** `namaste-boston`, `purple-wings` (`lib/pilot/tenants.ts`).

**Sequence:** Reset **The Purple Wings** first → validate onboarding + weekly ops → repeat for Namaste Boston later.

**Production safety:** Self-serve onboarding stays **disabled** unless `ENABLE_SELF_SERVE_ONBOARDING=true`. Existing-org UI mapping stays **disabled** unless `ENABLE_EXISTING_ORG_SETUP=true`. Scripts never weaken those defaults.

---

## Preflight before reset

**Always run read-only preflight** before `pilot:reset`, `pilot:seed`, or `pilot:bootstrap`. The script never modifies data.

### What it checks

- Masked env vars (no full secrets printed)
- Which database you are targeting (host, name, local/dev/prod classification)
- JanaGana `Tenant` rows + operational data counts
- Clerk organizations (when `CLERK_SECRET_KEY` is set) and mapping status
- Environment alignment (e.g. dev Clerk + prod DB = stop)
- Highlighted orgs: Namaste Boston, The Purple Wings, ICON, Julia's Organization, Vidya

### Env files first

```bash
cd ~/janagana
npm run env:inventory                    # read-only: what exists, what's missing
vercel env pull .env.vercel.production.pull --environment=production --yes
npm run env:setup -- --dry-run           # preview merge
npm run env:setup -- --apply             # writes .env.local + .env.pilot.prod.local
```

### Local (development Clerk + dev DB)

```bash
npm run pilot:preflight -- --development --all
```

### Production database from laptop

Use **production Clerk keys** (`sk_live_`) and explicit production DB URL — never mix dev Clerk with prod DB.

```bash
cd ~/janagana
# PRODUCTION_DATABASE_URL in .env.local or inline; CLERK_SECRET_KEY must be sk_live_
npm run pilot:preflight -- --production --all
```

Optional JSON for tooling:

```bash
npm run pilot:preflight -- --production --all --json
```

Filter one tenant:

```bash
npm run pilot:preflight -- --production --tenant=purple-wings
```

### How to interpret output

| Signal | Meaning |
|--------|---------|
| `ERROR Development Clerk keys with production-like database` | **Stop** — wrong env pairing |
| `ERROR Tenant … Clerk org not found` | DB points at org IDs from a different Clerk instance |
| `OK Mapped: The Purple Wings …` | NB/TPW mapping looks correct |
| `INFO Clerk org "ICON" … no Tenant row` | **Expected** until `pilot:bootstrap` |
| `WARN PILOT_TPW_CLERK_ORG_ID ≠ DB tenant` | Update env or run `pilot:seed --force-update` after review |
| `Safe to run pilot:reset dry-run? yes` | Proceed to dry-run only |

### What not to do

- Do not run `--confirm-pilot-reset` until preflight shows the **correct DB host** and **no ERROR lines**
- Do not use `sk_test_` Clerk keys while pointing at production Neon
- Do not bootstrap ICON in production until TPW/NB pilot is signed off
- Do not set `ENABLE_SELF_SERVE_ONBOARDING` or `ENABLE_EXISTING_ORG_SETUP` to work around mapping issues

---

## Why a new Clerk org (e.g. ICON) shows “not mapped”

When a user creates a Clerk organization that is not linked to a `Tenant` row, JanaGana correctly blocks dashboard access:

| Control | Location | Default |
|---------|----------|---------|
| Pilot scope messaging | `app/onboarding/create-organization/page.tsx` | Lists NB + TPW only |
| Self-serve create new Clerk org | `ENABLE_SELF_SERVE_ONBOARDING` | off (`lib/pilot/dashboard-nav.ts`) |
| Map existing Clerk org in UI | `ENABLE_EXISTING_ORG_SETUP` | off (`lib/actions/onboarding.ts`) |
| Dashboard access | Clerk org membership ∩ `Tenant.clerkOrgId` | user must be in mapped org |

Unmapped orgs (including ICON) appear under **“Clerk organizations in your account that are not mapped here”** — expected until an admin bootstraps the tenant (Mode 3).

---

## What a user needs to access an existing pilot tenant

1. **Clerk:** User is a member of the organization whose ID matches `Tenant.clerkOrgId`.
2. **Database:** `Tenant` row exists with `status = ACTIVE`, correct `slug`, and `clerkOrgId`.
3. **Sign-in:** User completes Clerk sign-in to JanaGana.
4. **Resolution:** `findMappedTenantsForUser()` returns the tenant; single-tenant users go straight to `/dashboard`.

`TenantAdmin` rows are a **read-cache** only — access does not depend on them, but Mode 1 preserves them.

---

## Mode 1 — Clean operational data only

**Script:** `npm run pilot:reset`

Deletes per-tenant **activity** so operators can re-test portal flows without losing bootstrap:

| Deleted | Preserved (default) |
|---------|---------------------|
| Contacts | `Tenant` row |
| Events, ticket types, registrations | `clerkOrgId` mapping |
| Memberships | `slug` |
| Payments, receipts | `TenantAdmin` cache |
| Communication messages | Membership **tiers** (plan definitions) |
| Audit logs | Clerk orgs/users (never touched by script) |
| Stripe webhook markers for tenant | |

### Commands

Dry-run:

```bash
cd ~/janagana
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --tenant=purple-wings --dry-run
```

Apply:

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset
```

Both pilot tenants:

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --all-pilot --confirm-pilot-reset
```

### Optional flags

| Flag | Effect |
|------|--------|
| `--wipe-tiers` | Also delete `MembershipTier` rows |
| `--drop-tenant` | Delete `Tenant` + `TenantAdmin` after wipe (full DB re-onboarding) |
| `--allow-any-tenant` | Allow slugs outside NB/TPW (e.g. after ICON bootstrap) |

`vercel env run` does not expose `DATABASE_URL` locally — pass `PRODUCTION_DATABASE_URL` explicitly or use `vercel env pull` into `.env.local`.

---

## Mode 2 — Reseed pilot tenants

**Script:** `npm run pilot:seed`

Ensures NB and TPW `Tenant` rows exist with correct slugs and **explicit** Clerk org IDs. Will **not** invent Clerk IDs in production.

### Required Clerk org IDs

Set env vars (recommended):

```bash
export PILOT_TPW_CLERK_ORG_ID=org_xxxxxxxx
export PILOT_NB_CLERK_ORG_ID=org_yyyyyyyy
```

Or per-tenant CLI flags:

```bash
npm run pilot:seed -- --tenant=purple-wings --clerk-org-id=org_… --dry-run
npm run pilot:seed -- --clerk-org-id-purple-wings=org_… --clerk-org-id-namaste-boston=org_… --confirm-pilot-seed
```

Find IDs: Clerk Dashboard → Organizations, or `npm run inventory:tenants` (with `CLERK_SECRET_KEY`).

### Commands

```bash
PILOT_TPW_CLERK_ORG_ID=org_… PILOT_NB_CLERK_ORG_ID=org_… \
  PRODUCTION_DATABASE_URL='postgresql://…' \
  npm run pilot:seed -- --confirm-pilot-seed
```

Update an existing row (name/slug/clerkOrgId drift):

```bash
… npm run pilot:seed -- --confirm-pilot-seed --force-update
```

---

## Mode 3 — Admin-approved new tenant bootstrap

**Script:** `npm run pilot:bootstrap`

For approved communities **outside** the NB/TPW pilot list (e.g. ICON). Does **not** enable self-serve onboarding for random users.

### Prerequisites

1. Create the organization in **Clerk** (or use an existing org).
2. Add bootstrap admin(s) as owner/admin in Clerk.
3. Copy the Clerk org ID (`org_…`).

### Commands

Dry-run:

```bash
npm run pilot:bootstrap -- \
  --name="ICON" \
  --slug=icon-needham \
  --clerk-org-id=org_xxxxxxxx \
  --dry-run
```

Apply:

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:bootstrap -- \
  --name="ICON" \
  --slug=icon-needham \
  --clerk-org-id=org_xxxxxxxx \
  --admin-clerk-user-id=user_xxxxxxxx \
  --confirm-bootstrap-tenant
```

After bootstrap, the admin signs in — `findMappedTenantsForUser()` picks up the new tenant via Clerk membership. No UI flag changes required.

---

## Test NB onboarding from scratch

1. **Clerk (manual):** Ensure Namaste Boston org exists; note `org_…` ID. Add your test user as admin.
2. **Mode 2:** `npm run pilot:seed -- --tenant=namaste-boston --clerk-org-id=org_… --confirm-pilot-seed`
3. **Mode 1 (optional):** `npm run pilot:reset -- --tenant=namaste-boston --confirm-pilot-reset` to clear contacts/events only.
4. **Or full re-onboard:** add `--drop-tenant` to reset, then re-run Mode 2.
5. Sign in → should land on `/dashboard` with **Namaste Boston** banner.
6. Publish an event, run portal checks per [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md).

Do **not** enable `ENABLE_SELF_SERVE_ONBOARDING` for this — mapping is via seed/bootstrap scripts.

---

## Test TPW onboarding from scratch

1. **Clerk (manual):** Purple Wings org with slug `purple-wings` (or note org ID).
2. **Mode 2:** seed `purple-wings` with `PILOT_TPW_CLERK_ORG_ID`.
3. **Mode 1:** `npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset`.
4. Sign in → dashboard for TPW.
5. Import class roster: `npm run import:tpw-class` (after tenant exists).
6. Validate per [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md).

For a **true** first-time owner flow (no pre-existing tenant row), use `--drop-tenant` then Mode 2 seed after Clerk org exists.

---

## Bootstrap ICON later (admin approval)

1. Create **ICON** org in Clerk; add approved operators.
2. Run Mode 3 with `--slug=icon-needham` (or agreed slug) and real `org_…` ID.
3. Do **not** set `ENABLE_SELF_SERVE_ONBOARDING=true` in production.
4. ICON users with Clerk membership see the tenant in dashboard; others still see the pilot access page for unmapped orgs only.
5. Use Mode 1 with `--allow-any-tenant` to wipe ICON operational data without dropping the tenant row.

---

## What we do not reset

- Stripe products/prices — reconcile manually
- TPW/NB website repos — no change required
- Public portal URL paths — unchanged after re-seed (`/portal/{slug}`)
- Clerk users/organizations — always manual in Clerk Dashboard

---

## Quick reference

| Mode | Command | Preserves tenant bootstrap |
|------|---------|----------------------------|
| 1 Operational wipe | `npm run pilot:reset -- --tenant=… --confirm-pilot-reset` | Yes (default) |
| 2 Reseed NB/TPW | `npm run pilot:seed -- --confirm-pilot-seed` | Creates/updates `Tenant` only |
| 3 Bootstrap new org | `npm run pilot:bootstrap -- --confirm-bootstrap-tenant` | Creates new `Tenant` |
