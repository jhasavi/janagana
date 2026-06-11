# Ops — scripts and existing HTTP routes

**Policy:** Prefer CLI scripts for repair/import. Do **not** add new ops HTTP routes for the pilot.

## Scripts (common)

| Script | Purpose |
|--------|---------|
| `npm run smoke:production` | HTTP smoke against production |
| `npm run import:nb-crm` | NB CRM CSV import (sets import provenance on contacts) |
| `npm run import:tpw-class` | TPW class roster CSV → `purple-wings` contacts (`~/tpw/class1.csv`) |
| `npm run verify:tpw` | TPW integration readiness (tenant, URLs, embed API) |
| `npm run env:inventory` | Masked env file inventory + dev/prod profile check |
| `npm run env:setup -- --dry-run` | Preview merge into `.env.local` + `.env.pilot.prod.local` |
| `npm run pilot:preflight -- --production --all` | Read-only env + Clerk + tenant mapping check (run first) |
| `npm run pilot:reset -- --tenant=purple-wings --dry-run` | Mode 1: preview operational data wipe ([12-PILOT-RESET.md](./12-PILOT-RESET.md)) |
| `npm run pilot:seed -- --dry-run` | Mode 2: preview NB/TPW tenant row seed (requires Clerk org IDs) |
| `npm run pilot:bootstrap -- --name=… --slug=… --clerk-org-id=… --dry-run` | Mode 3: preview admin-approved tenant bootstrap |
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
