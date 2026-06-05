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

## Deferred platform surfaces

Membership tiers, Stripe, donations, CRM pipelines, communications — schema may exist; operator UI does not expose them in pilot.

## Product workflow principles

- Tenant-scoped queries on every admin mutation (`requireActiveTenantForActions`).
- Public flows never create Clerk organizations.
- Existing-org self-mapping disabled unless `ENABLE_EXISTING_ORG_SETUP=true`.

Historical rebuild notes: see git history (`REBUILD_PLAN.md`, `V3_PRIMARY_HANDOFF.md`).
