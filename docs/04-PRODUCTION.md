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
