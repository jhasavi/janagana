# V3 Foundation Inventory

Date: 2026-05-26
Project: janagana-v3

## What already exists

- Next.js App Router project layout with TypeScript and Tailwind.
- Prisma initialized with PostgreSQL datasource and an 8-model foundation schema.
- Clerk package installed and auth-facing routes present.
- Playwright configuration exists with synthetic and real-clerk split.
- Foundation docs already present: env policy, release gate, old project reference map, and integration guide.
- Dashboard and portal route tree is present, with several pages already implemented beyond placeholder level.

## What looks reusable now

- app routing structure under app/(auth), app/dashboard, app/portal, app/api.
- prisma/schema.prisma foundation shape and tenant/event/contact domain boundaries.
- scripts/check-env.ts and scripts/check-known-clerk-orgs.ts concepts.
- docs/RELEASE_GATE.md and docs/NB_TPW_INTEGRATION_GUIDE.md as baseline policy docs.

## What should be removed later (not removed in this pass)

- Non-foundation UI dependencies currently installed but not required for the milestone.
- Extra v3 pages or test files that go beyond the strict foundation smoke stage.
- Any Stripe webhook implementation details before Stripe milestone approval.

## Stack presence check

- Next.js: yes
- Prisma: yes
- Clerk: yes
- Tailwind: yes
- Playwright: yes

## Scope-violation check (broad modules)

- No CRM, fundraising, donations, volunteering, communications, analytics, plugin API, or marketplace module directories were found in janagana-v3.
- Current foundation remains aligned to minimal rebuild scope.
