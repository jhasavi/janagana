# Auth & tenant contract

See also `lib/tenant/contract.ts` (source of truth in code).

## Pilot v1 rule (NB + TPW)

| Layer | Proves | Source of truth |
|-------|--------|-----------------|
| **Clerk** | Who the admin is | Session + org memberships from Clerk API |
| **DB Tenant** | Which community data they manage | `Tenant` row (`clerkOrgId` unique, `status`) |
| **Tenant slug** | Which public portal visitors use | `/portal/{slug}` only — no Clerk |

## Admin resolution

1. Clerk memberships ∩ **ACTIVE** `Tenant` on `clerkOrgId` → mapped tenants.
2. Cookie `JG_ACTIVE_TENANT_ID` = preference only; re-validated every request.
3. Stale cookie → `GET /api/select-tenant?reason=stale-cookie`.
4. Single tenant → `GET /api/select-tenant?reason=auto-single`.
5. Server actions → `requireActiveTenantForActions()` in `lib/tenant/active-tenant-context.ts`.
6. Pages/layouts → `resolveTenantForDashboard()` in `lib/tenant/tenant-resolver.ts`.

## Public portal

- `getTenantBySlug(slug)` only — no cookie, no Clerk.
- Never creates a Clerk organization from public flows.

## APIs

- **`GET /api/active-tenant`** — canonical selected tenant JSON.
- **`GET /api/active-org`** — deprecated alias (same payload + `Deprecation` header).

## Pilot flags (default off)

- `ENABLE_EXISTING_ORG_SETUP` — existing Clerk org mapping UI
- `ENABLE_SELF_SERVE_ONBOARDING` — create new Clerk org in UI

## Drift / deletion

- Clerk `organization.deleted` webhooks suspend tenants.
- Ops: `scripts/` + existing `/api/ops/*` routes (token-gated). No new ops routes for pilot.

## Environment alignment

Dev Clerk keys → dev DB tenants. Prod Clerk keys → prod DB tenants. Never mix.
