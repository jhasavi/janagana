# JanaGana documentation

Canonical docs for the NB/TPW pilot. Product improvement backlog: [../Todos.md](../Todos.md).

## Operations & engineering

| # | Doc | Use when |
|---|-----|----------|
| 1 | [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) | Operating the dashboard, sign-off, production smoke |
| 2 | [02-AUTH-TENANT.md](./02-AUTH-TENANT.md) | Clerk vs tenant vs slug; resolver contract |
| 3 | [03-NB-TPW-WEBSITES.md](./03-NB-TPW-WEBSITES.md) | Website CTAs, portal URLs, visitor paths |
| 4 | [04-PRODUCTION.md](./04-PRODUCTION.md) | Release status, pre-launch, redesign launch checklist |
| 5 | [05-ENV-SECRETS.md](./05-ENV-SECRETS.md) | Environment variables and secrets |
| 6 | [06-DEVELOPMENT.md](./06-DEVELOPMENT.md) | Local DB, release gates, foundation scope |
| 7 | [07-ARCHITECTURE.md](./07-ARCHITECTURE.md) | System shape, live vs deferred scope |
| 8 | [08-OPS-SCRIPTS.md](./08-OPS-SCRIPTS.md) | CLI/scripts and ops HTTP routes |
| 10 | [10-CODE-LAYOUT.md](./10-CODE-LAYOUT.md) | Where tenant/auth/pilot logic lives in code |
| 11 | [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) | TPW integration success criteria |
| 12 | [12-PILOT-RESET.md](./12-PILOT-RESET.md) | Pilot testing: reset, reseed, bootstrap |
| 13 | [13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md) | Tenant deployment checklist; embed levels |

## Product & GTM

| Doc | Use when |
|-----|----------|
| [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) | Positioning, 15-min demo script, go/no-go |
| [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md) | Beat Join It + Zeffy — competitive backlog |

**Code contract:** `lib/tenant/contract.ts`  
**Pilot tenants:** `lib/pilot/tenants.ts` (`namaste-boston`, `purple-wings`)

Superseded docs (merged July 2026): `JANAGANA_LITE_*`, `PARKING-LOT.md`, `09-REFERENCE.md`, `15-REDESIGN-LAUNCH.md`, `17-CRM-25-CHANGES.md` — see git history.
