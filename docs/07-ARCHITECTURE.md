# Architecture (pilot boundaries)

## Two paths

```
Public visitor → /portal/{slug} → getTenantBySlug → contacts/registrations
Admin operator → Clerk → mapped tenants → cookie preference → dashboard
```

Do not pass dashboard cookies into public portal resolution.

## Data ownership

- **Contact** — visitor/registrant; never a Clerk user.
- **Tenant** — 1:1 with Clerk org (`clerkOrgId`).
- **TenantAdmin** — cache only; Clerk membership is access source of truth.

## Platform surfaces

Admin-managed membership tiers, formal enrollments, renewal dates, statuses, public membership checkout, Stripe webhook activation, event ticket types, quantity-aware event registration, check-in/no-show status, receipts, transactional communication outbox, and the shared payment ledger are exposed. Donations, CRM pipelines, online event checkout, refunds, payout reporting, provider email delivery, scheduled reminders, and campaigns remain deferred.

Payment policy: JanaGana platform fee is currently 0 bps. Stripe/card processor fees are not hidden; a Zeffy-style payer contribution or verified nonprofit subsidy model would be a later business-model layer, not a silent checkout assumption.

## Product workflow principles

- Tenant-scoped queries on every admin mutation (`requireActiveTenantForActions`).
- Public flows never create Clerk organizations.
- Existing-org self-mapping disabled unless `ENABLE_EXISTING_ORG_SETUP=true`.

Historical rebuild notes: see git history (`REBUILD_PLAN.md`, `V3_PRIMARY_HANDOFF.md`).
