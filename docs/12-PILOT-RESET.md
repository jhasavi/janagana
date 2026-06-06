# Pilot clean slate (TPW-first)

Use when old QA data, wrong Clerk mappings, or cross-community confusion block end-to-end testing.

**Sequence:** Reset **The Purple Wings** first → validate onboarding + weekly ops → repeat for Namaste Boston later.

---

## What gets cleared

| Layer | Script (`pilot-data-reset`) | Manual (Clerk Dashboard) |
|-------|----------------------------|---------------------------|
| Contacts, events, registrations | Yes — per tenant slug | — |
| Memberships, tiers, payments, receipts | Yes | — |
| Audit logs for tenant | Yes | — |
| `Tenant` row + slug | Optional `--drop-tenant` | — |
| Clerk organizations / users | No | **You** delete or recreate in Clerk |

The script **never** calls Clerk. Clerk cleanup is intentional and manual so you control who keeps admin access.

---

## TPW clean slate (recommended first)

### 1. Clerk (manual)

1. Sign in to [Clerk Dashboard](https://dashboard.clerk.com) (production instance).
2. **Organizations:** Note existing orgs. For a true fresh onboarding test, delete the Purple Wings Clerk org (or create a new one with slug `purple-wings` after delete).
3. **Users:** Remove test accounts you no longer need. Keep **one** admin user you will use for TPW onboarding (your email).
4. Do **not** touch Namaste Boston Clerk org yet if you want NB data isolated for later.

### 2. Database (script)

Dry-run (no deletes):

```bash
cd ~/janagana
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --tenant=purple-wings --dry-run
```

Apply:

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset
```

To remove the tenant row as well (full re-onboarding):

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npm run pilot:reset -- --tenant=purple-wings --confirm-pilot-reset --drop-tenant
```

Requires `vercel env run` if `DATABASE_URL` is not in local env:

```bash
vercel env run --environment=production -- npm run pilot:reset -- --tenant=purple-wings --dry-run
```

### 3. Browser

- Sign out of JanaGana.
- Clear site cookies for `janagana.namasteneedham.com` (or use a fresh browser profile).

### 4. End-to-end TPW test

1. Sign in with your admin Clerk user.
2. Complete owner onboarding for **The Purple Wings** (`purple-wings` slug) — or map existing Clerk org if `ENABLE_EXISTING_ORG_SETUP=true`.
3. Import class roster: `npm run import:tpw-class` (after tenant exists).
4. Publish one event, run portal + TPW website checks per [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md).

---

## Full reset (both communities)

Only when you intentionally wipe NB and TPW:

```bash
PRODUCTION_DATABASE_URL='…' npm run pilot:reset -- --all-pilot --confirm-pilot-reset --drop-tenant
```

Then delete/recreate **both** Clerk orgs manually and onboard TPW first, NB second.

---

## What we do not reset

- Stripe products/prices (if any) — reconcile manually
- TPW/NB website repos — no change required
- Public portal URLs (`/portal/purple-wings`) — same paths after re-onboarding
