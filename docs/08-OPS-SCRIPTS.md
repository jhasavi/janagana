# Ops — scripts and existing HTTP routes

**Policy:** Prefer CLI scripts for repair/import. Do **not** add new ops HTTP routes for the pilot.

## Scripts (common)

| Script | Purpose |
|--------|---------|
| `npm run smoke:production` | HTTP smoke against production |
| `npm run import:nb-crm` | NB CRM CSV import (sets import provenance on contacts) |
| `tsx scripts/repair-production-tenant-slugs.ts` | Slug repair dry-run / confirm |
| `tsx scripts/inventory-tenants.ts` | Tenant inventory |
| `npm run verify:tenants` | Integration verification |

## Existing ops API routes (token-gated, off by default)

| Route | Env flag | Purpose |
|-------|----------|---------|
| `/api/ops/tenant-slug-repair` | `ENABLE_TENANT_SLUG_REPAIR` + token | Slug merge/repair |
| `/api/ops/clerk-tenant-reconciliation` | `ENABLE_CLERK_TENANT_RECONCILIATION` + token | Suspend tenants whose Clerk org is gone |
| `/api/ops/qa-contacts-cleanup` | ops token | QA contact deletion |

These are **not** linked from the operator dashboard.

## Admin diagnostics

Operators use **Portal & setup** → *Advanced diagnostics (engineering)* — not ops repair UIs.
