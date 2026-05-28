# JanaGana v3

GitHub: https://github.com/jhasavi/janagana (main)
Production target: https://janagana.namasteneedham.com
Local dev URL: http://localhost:3020
Old project archive: ~/janagana-old (local reference only, not the live GitHub repo)

## What Works

- Admin event management and attendee operations (cancel, re-confirm).
- Public portal for The Purple Wings (`/portal/purple-wings`) and Namaste Boston (`/portal/namaste-boston`).
- Public event registration with capacity enforcement and duplicate protection.
- Tenant-scoped public lead capture at `/portal/[tenantSlug]/contact`.
- Interest alias routing at `/portal/[tenantSlug]/interest/[interestType]`.
- Two-tenant isolation: data is fully scoped by tenantId across events, contacts, and registrations.
- Tenant selection and multi-org switching (`/select-organization`).
- Owner onboarding for new organizations (`/onboarding/create-organization`).
- Tenant health diagnostics (`/dashboard/settings`).
- Website CTAs from TPW and NB repos now link to correct tenant portal URLs.

## Second-Tenant Hardening

- Tenant switch path is enabled with a dashboard link to /select-organization.
- Active tenant cookie is cache-only and validated against Clerk membership before use.
- Public portal and registration isolation is validated by test scripts for two-tenant scenarios.

## Intentionally Deferred

- CRM
- Stripe and payments
- Donations and fundraising
- Volunteering
- Communications and automation
- Analytics and reporting

## Local Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
npm run check:env
```

3. Align database schema:

```bash
npm run db:push
```

4. Start app on the standard local port:

```bash
./start.sh
```

5. Optional local stop helper:

```bash
./stop.sh
```

## Pre-launch readiness

See [docs/PRE_LAUNCH_CHECKLIST.md](docs/PRE_LAUNCH_CHECKLIST.md) for CRM timing, two-org integration, and go-live steps.

Verify both production tenants exist in the database:

```bash
npm run verify:tenants
npm run seed:e2e   # local/e2e only — upserts purple-wings + namaste-boston test rows
```

## Test Gates

Run the operational gate commands:

```bash
npm run build
npm run typecheck
npm run lint
npm run prisma:validate
npm run check:env
npm run check:db:test
npm run test:actions
npm run test:portal
npm run test:portal:concurrency
npm run verify:tenants
npm run test:e2e:dual-portal
npm run test:e2e:contact-interest
npm run test:registration:ops
npm run test:second-tenant
npm run test:e2e:foundation
npm run test:e2e:env
npm run test:e2e:portal
```

Run local redirect smoke checks (requires app running on localhost:3020):

```bash
npm run smoke:local-redirects
```

Run tenant-scoped lead capture checks:

```bash
npm run test:lead:capture
```

Run full release gate (all gates in correct order):

```bash
npm run gate:release
```

## Tenant Operations

Inventory tenants and Clerk orgs (sanitized):

```bash
npm run inventory:tenants
```

Attempt Namaste Boston setup (maps existing Clerk org + seeds local data):

```bash
npm run setup:namaste
```

If Namaste Clerk org does not yet exist, complete explicit owner onboarding first:

1. Sign in as owner admin.
2. Open /onboarding/create-organization.
3. Create organization name Namaste Boston, slug namaste-boston.
4. Re-run npm run setup:namaste.

## Intentionally Deferred

- CRM
- Stripe and payments
- Donations and fundraising
- Volunteering
- Communications and automation
- Analytics and reporting

## Handoff

Primary handoff document: [docs/V3_PRIMARY_HANDOFF.md](docs/V3_PRIMARY_HANDOFF.md)
Manual demo script: [docs/MANUAL_DEMO_SCRIPT.md](docs/MANUAL_DEMO_SCRIPT.md)
Website link readiness: [docs/WEBSITE_LINK_READINESS.md](docs/WEBSITE_LINK_READINESS.md)
Architecture and rebuild scope: [docs/REBUILD_PLAN.md](docs/REBUILD_PLAN.md)
