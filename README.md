# JanaGana v3 Clean Rebuild

This repository is the primary local JanaGana v3 clean rebuild at ~/janagana.

Old project location: ~/janagana-old (archive/reference only).

Current local demo URL: http://localhost:3020

Current tenant status:
- Purple Wings is active and mapped.
- Namaste Boston onboarding is supported and safe, but requires explicit owner creation in Clerk before local mapping.

## First Working Product Loop

1. Admin creates an event.
2. Public user registers from the portal.
3. Admin sees attendee registration in the dashboard.

## Second-Tenant Hardening (Current)

- Tenant switch path is enabled with a dashboard link to /select-organization.
- Active tenant cookie is cache-only and validated against Clerk membership before use.
- Public portal and registration isolation is validated by test scripts for two-tenant scenarios.
- No website integration with ~/nb or ~/tpw yet.
- Stripe remains deferred.

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
npm run test:registration:ops
npm run test:second-tenant
npm run test:e2e:foundation
npm run test:e2e:env
npm run test:e2e:portal
```

Run local redirect smoke checks (requires app running on localhost:3020):

```bash
npm run smoke:redirects
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
- NB/TPW integration
- Deploy and push automation

## Handoff

Primary handoff document: [docs/V3_PRIMARY_HANDOFF.md](docs/V3_PRIMARY_HANDOFF.md)

Architecture and rebuild scope: [docs/REBUILD_PLAN.md](docs/REBUILD_PLAN.md)
