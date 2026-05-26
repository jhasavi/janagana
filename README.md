# Janagana v3

Clean rebuild of the Janagana membership, events, and portal platform.

**Status:** Skeleton — Day 1  
**Old project reference:** `~/janagana` (reference only, not active)

---

## What this is

Janagana v3 is a multi-tenant platform for community organizations to manage:
- Memberships and contacts
- Events and public registration
- A public-facing portal per organization

Built for organizations like **Namaste Boston** and **The Purple Wings**.

---

## Architecture

- **Clerk** — Authentication for admin users only. Organizations = admin tenants.
- **Tenant** (DB) — One-to-one mapping with a Clerk Organization. Created explicitly during admin onboarding.
- **Contact** — A public person (registrant, member, donor). NEVER a Clerk user. NEVER creates a Clerk org.
- **Admin dashboard** — Requires Clerk login + org membership + DB tenant.
- **Public portal** — Resolves by URL slug. No Clerk auth required.

See [docs/REBUILD_PLAN.md](docs/REBUILD_PLAN.md) for the full architecture contract.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env.local
# Edit .env.local with your actual keys

# 3. Validate env
npm run check:env

# 4. Push DB schema
npm run db:push

# 5. Start dev server
npm run dev
```

---

## Project Structure

```
janagana-v3/
├── app/
│   ├── (auth)/sign-in, sign-up     ← Clerk hosted auth pages
│   ├── dashboard/                  ← Admin dashboard (Clerk auth required)
│   │   ├── members/
│   │   ├── tiers/
│   │   ├── events/
│   │   └── settings/
│   ├── portal/[tenantSlug]/        ← Public portal (no auth required)
│   │   ├── events/[eventSlug]/
│   │   └── register/[eventSlug]/
│   ├── onboarding/create-organization/
│   ├── select-organization/
│   └── api/
│       ├── active-org/
│       ├── sign-out/
│       └── webhooks/clerk, stripe/
├── lib/
│   ├── actions.ts                  ← All server actions
│   ├── prisma.ts                   ← Prisma singleton
│   ├── tenant.ts                   ← Tenant resolver
│   └── utils.ts                    ← cn, slugify, formatCents
├── prisma/
│   └── schema.prisma               ← 8 models (Tenant, Contact, Event, etc.)
├── scripts/
│   ├── check-env.ts
│   └── check-known-clerk-orgs.ts
├── e2e/                            ← Playwright tests
│   ├── env-alignment.test.ts       ← SYNTHETIC
│   ├── auth-state-machine.test.ts  ← SYNTHETIC
│   ├── public-portal.test.ts       ← SYNTHETIC
│   ├── public-registration.test.ts ← SYNTHETIC
│   ├── tenant-isolation.test.ts    ← SYNTHETIC
│   ├── real-clerk-smoke.test.ts    ← REAL_CLERK
│   └── first-workflow.test.ts      ← REAL_CLERK
├── docs/
│   ├── REBUILD_PLAN.md
│   ├── ENV_AND_SECRETS.md
│   ├── RELEASE_GATE.md
│   ├── OLD_PROJECT_REFERENCE_MAP.md
│   └── NB_TPW_INTEGRATION_GUIDE.md
├── middleware.ts                   ← Clerk-only, no test-auth
├── playwright.config.ts            ← Synthetic tests
└── playwright.real-clerk.config.ts ← Real Clerk smoke
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema to DB (dev) |
| `npm run db:migrate` | Create migration (named) |
| `npm run db:validate` | Validate Prisma schema |
| `npm run db:studio` | Open Prisma Studio |
| `npm run check:env` | Validate env variables |
| `npm run check:clerk-orgs` | List/check Tenant ↔ Clerk org mappings |
| `npm test` | Run synthetic Playwright tests |
| `npm run test:real-clerk` | Run real Clerk smoke tests |

---

## Release Gate

See [docs/RELEASE_GATE.md](docs/RELEASE_GATE.md).

A release is demo-ready only when all gate checks pass.

---

## First Demo Scope

1. Admin: sign in → select org → dashboard
2. Admin: create membership tier
3. Admin: add member/contact
4. Admin: create event (published)
5. Public: open portal → view event → register
6. Admin: see registration in dashboard

Nothing else is in scope for the first demo.

---

## What's Deferred

Stripe payments, email notifications, SMS, CRM, fundraising, volunteering, clubs,
forum, surveys, governance, analytics.

See Section J of [docs/REBUILD_PLAN.md](docs/REBUILD_PLAN.md#j-deferred-features).
