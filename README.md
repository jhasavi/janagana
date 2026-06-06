# JanaGana v3

**Documentation:** [docs/README.md](./docs/README.md) (10 canonical pilot docs)

GitHub: https://github.com/jhasavi/janagana (main)
Production target: https://janagana.namasteneedham.com
Local dev URL: http://localhost:3020
Old project archive: ~/janagana-old (local reference only, not the live GitHub repo)

## What Works

- Admin event management, ticket quantities, pending-payment tracking, check-in/no-show operations, and attendee operations.
- Admin membership tiers, member enrollment, renewal dates, statuses, and membership payment ledger.
- Admin contact profiles with memberships, event history, payments, receipts, notes, tags, and activity context.
- Transactional communication outbox for payment receipts and event registration confirmations.
- Public membership join flow with Stripe Checkout handoff, webhook activation, and receipt records.
- Explicit zero JanaGana platform fee policy for online membership checkout; card processor fees remain separate.
- Public portal for The Purple Wings (`/portal/purple-wings`) and Namaste Boston (`/portal/namaste-boston`).
- Public event registration with ticket selection, quantity-aware capacity enforcement, pending event payment ledger rows, and duplicate protection.
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

- CRM pipeline automation and duplicate merge workflows
- Donations and fundraising
- Volunteering
- Email provider delivery, scheduled reminders, and campaign automation
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
npm run test:dashboard:semantics
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

- CRM pipeline automation and duplicate merge workflows
- Donations and fundraising
- Volunteering
- Email provider delivery, scheduled reminders, and campaign automation
- Analytics and reporting

## Handoff

See [docs/README.md](./docs/README.md) for the canonical doc set (pilot runbook, auth/tenant, NB/TPW websites, production, architecture).
