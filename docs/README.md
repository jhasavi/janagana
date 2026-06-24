# JanaGana documentation (top 10)

Canonical docs for the NB/TPW pilot. Older filenames were merged here to reduce drift.

| # | Doc | Use when |
|---|-----|----------|
| 1 | [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) | Operating the dashboard, sign-off, production smoke |
| 2 | [02-AUTH-TENANT.md](./02-AUTH-TENANT.md) | Clerk vs tenant vs slug; resolver contract |
| 3 | [03-NB-TPW-WEBSITES.md](./03-NB-TPW-WEBSITES.md) | Website CTAs, portal URLs, visitor paths |
| 4 | [04-PRODUCTION.md](./04-PRODUCTION.md) | Release status, pre-launch, smoke plans |
| 5 | [05-ENV-SECRETS.md](./05-ENV-SECRETS.md) | Environment variables and secrets |
| 6 | [06-DEVELOPMENT.md](./06-DEVELOPMENT.md) | Local DB, release gates, foundation scope |
| 7 | [07-ARCHITECTURE.md](./07-ARCHITECTURE.md) | System shape, boundaries, deferred work |
| 8 | [08-OPS-SCRIPTS.md](./08-OPS-SCRIPTS.md) | CLI/scripts and existing ops HTTP routes |
| 9 | [09-REFERENCE.md](./09-REFERENCE.md) | Legacy project map, inventories |
| 10 | [10-CODE-LAYOUT.md](./10-CODE-LAYOUT.md) | Where tenant/auth/pilot logic lives in code |
| 11 | [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) | TPW full integration success criteria (do TPW before NB) |
| 12 | [12-PILOT-RESET.md](./12-PILOT-RESET.md) | Three-mode pilot testing: operational reset, reseed, bootstrap |
| 13 | [13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md) | Operator vs visitor planes; tenant deployment checklist; embed levels |
| 14 | [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) | GTM, Raklet replacement pitch, demo script, showcase readiness |
| — | [JANAGANA_LITE_PRODUCT_PLAN.md](./JANAGANA_LITE_PRODUCT_PLAN.md) | Community OS positioning, MVP modules, scope |
| — | [JANAGANA_LITE_MVP_ROADMAP.md](./JANAGANA_LITE_MVP_ROADMAP.md) | Phased build plan and next slices |
| — | [PARKING-LOT.md](./PARKING-LOT.md) | Deferred features (contact roles, etc.) |

**Code contract:** `lib/tenant/contract.ts`  
**Pilot tenants:** `lib/pilot/tenants.ts` (`namaste-boston`, `purple-wings`)
