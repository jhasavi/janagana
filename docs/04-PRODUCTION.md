# Production & release

## Quick checks

```bash
npm run smoke:production
npm run check:env
```

## Pre-launch (owner)

- [ ] Part A/B in [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md)
- [ ] Both tenants: portal URL uses short slug (`/portal/purple-wings`, `/portal/namaste-boston`)
- [ ] Contacts and event registrations verified per tenant
- [ ] Memberships tab loads; any formal memberships are tenant-scoped and expected by the operator
- [ ] Public Join page loads; paid checkout requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

## Status log

Maintain release notes in git / Vercel deploy history. Historical detail from 2026-05-28:

- Slug repair: canonical `purple-wings` / `namaste-boston`
- Website CTAs verified on NB + TPW
- Automated smoke: `npm run smoke:production`

See git history and Vercel dashboard for current commit SHAs.

## Smoke plans

- HTTP: `scripts/production-smoke-http.ts` (`npm run smoke:production`)
- Playwright production config for submit flows (when credentials available)
- Admin manual steps: [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md)

## UI redesign launch checklist

Run before calling the redesign shipped:

```bash
npm run typecheck
npm run lint
npm run test:community-os:nav
npm run test:dashboard:semantics
npm run test:e2e:foundation
npm run test:e2e:portal
npm run test:e2e:dual-portal
npm run build
```

Pilot demo gate (production): `npm run verify:pilot-demo`

### Manual smoke (~5 min)

- [ ] Sign in → dashboard shows priority queue and quick actions
- [ ] Copy portal link → open incognito → mobile nav works
- [ ] Register for an event → appears on dashboard
- [ ] Import spreadsheet still works from quick action

Post-launch deferrals: see [07-ARCHITECTURE.md](./07-ARCHITECTURE.md#parking-lot-explicit-deferrals).

## Production readiness (automated)

Run before owner sign-off:

```bash
npm run verify:production-ready
# Or step by step:
npm run verify:production-env -- --strict
npm run verify:pilot-signoff -- --base-url=https://janagana.namasteneedham.com
npm run verify:tpw -- --base-url=https://janagana.namasteneedham.com
npm run verify:nb -- --base-url=https://janagana.namasteneedham.com
npm run gate:release
```

Health check (DB + integration flags): `GET /api/health/ready`

Renewal reminders cron: daily `GET /api/cron/renewal-reminders` (requires `CRON_SECRET` on Vercel).

## Owner sign-off record

When Part A/B in [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) are complete for **both** orgs:

```
Pilot sign-off: YYYY-MM-DD by <name> — admin + dual-tenant validated (verify:production-ready PASS).
```
