# Code layout (tenant & pilot)

## Tenant module (`lib/tenant/`)

| File | Role |
|------|------|
| `contract.ts` | Documented resolution contract + cookie name |
| `tenant-resolver.ts` | `resolveTenantForDashboard`, `findMappedTenantsForUser` |
| `active-tenant-cookie.ts` | Read/write/clear `JG_ACTIVE_TENANT_ID` (+ legacy org cookies) |
| `active-tenant-context.ts` | `requireActiveTenantForActions()` for server actions |
| `index.ts` | Public exports |

Import from `@/lib/tenant` (barrel: `lib/tenant.ts`).

## Pilot config (`lib/pilot/`)

| File | Role |
|------|------|
| `tenants.ts` | **Canonical** slugs, names, portal CTA links |
| `dashboard-nav.ts` | Operator sidebar + re-exports from `tenants.ts` |
| `portal-links.ts` | Deprecated re-export → use `tenants.ts` |
| `contact-labels.ts` | Operator-facing contact/source/intent labels |

## Admin UI

- Layout: `app/dashboard/layout.tsx` — resolves tenant, redirects stale cookie
- Product setup: `app/dashboard/settings/page.tsx`
- Contacts: `app/dashboard/members/page.tsx`
- Overview: `app/dashboard/page.tsx`

## Public portal (do not couple to Clerk)

- `app/portal/[tenantSlug]/` — slug-only tenant resolution

## Ops (scripts preferred)

- `scripts/repair-production-tenant-slugs.ts`
- `scripts/import-nb-crm.ts`
- `app/api/ops/*` — existing token-gated routes only
