# Janagana v3 — Controlled Rebuild Plan

**Date:** 2026-05-26  
**Author:** Architecture review based on janagana (old project) post-mortem  
**Status:** APPROVED — begin implementation

---

## A. Why Rebuild

The v2/patch-cycle project accumulated critical architectural debt that cannot be
patched incrementally:

1. **Mixed auth layers**: Real Clerk and test-auth were interleaved in middleware.
   A single `isAppTestAuthEnabled()` flag bled into real-auth paths, making it
   impossible to trust whether any test result proved real-Clerk behavior.

2. **Clerk org vs DB tenant desync**: `clerkOrgId` on the Tenant table was set
   inconsistently. A public registrant path accidentally triggered Clerk org
   creation in some code paths, polluting the admin identity space.

3. **Schema bloat before workflows existed**: 1,899 lines of Prisma schema (50+
   models) were written before a single end-to-end user workflow was proven
   working. CRM, deals, forum, surveys, governance, and more were scaffolded
   before the first event registration was stable.

4. **Dashboard showed feature cards for unimplemented features**: Buttons that
   went nowhere or hit 404s degraded credibility and confused real users.

5. **Tests proved synthetic behavior only**: Playwright tests ran in `E2E_TEST_MODE=true`
   which bypassed Clerk entirely. No test ever proved real Clerk login → real
   dashboard → real event creation end-to-end.

6. **Recovery documents outnumbered working features**: 20+ recovery/repair docs
   existed; the first complete demo workflow was never achieved.

7. **No stop condition**: Features were added continuously without a release gate
   that enforced "this workflow must work before adding the next."

---

## B. What to Keep from Old Project

| Asset | Reason |
|---|---|
| Tailwind + shadcn/ui token setup | Established design language, reuse selectively |
| Prisma datasource/generator config | Boilerplate pattern, not logic |
| Clerk middleware structure (real-auth only, stripped of test-auth) | Base pattern only |
| `lib/prisma.ts` singleton pattern | Standard safe pattern |
| `components/ui/` button, input, card primitives | Tested UI atoms |
| Portal page UI layout concepts | Visual structure was reasonable |
| `scripts/check-env.ts` concept | Env validation script idea |
| Enum names: `EventStatus`, `RegistrationStatus`, etc. | Sensible domain vocabulary |
| `.env.example` structure | Reference for required keys |
| Playwright config structure (real-clerk config separated) | Pattern worth preserving |

---

## C. What to Avoid from Old Project

| Anti-Pattern | Reason |
|---|---|
| `isAppTestAuthEnabled()` in middleware | Bleeds test into prod path |
| `JG_TEST_AUTH` cookie in shared middleware | Cannot distinguish real from synthetic |
| `clerkMiddleware` with test-auth fallthrough | Causes trust collapse |
| Accidental `createOrganization()` calls in public registration | Pollutes Clerk admin space |
| `logAuthOrgRedirectDecision()` debug logging at runtime | Noise in production |
| Tenant cookie as auth source | Selected tenant cookies must always be validated against Clerk membership |
| 50+ schema models before first workflow | Schema should follow proven workflows |
| Dashboard CTAs for unimplemented features | Never show a button that doesn't work |
| `E2E_TEST_MODE` / `PLAYWRIGHT_TEST` env flags | Test mode must be structurally separated |
| Recovery docs: `CLERK_TENANT_MAPPING_REPAIR_PLAN.md`, `RECOVERY_AUDIT.md`, etc. | Do not carry forward |
| Broad CRM/fundraising/volunteering/clubs/forum/survey/governance models | Deferred |
| `Household`, `DuplicateSuggestion`, `ApiKey`, `WebhookEndpoint` models | Deferred |
| `TanStack React Query` for initial build | Adds complexity; use Server Components |

---

## D. v3 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Clerk (Auth)                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  ClerkUser  ←→  ClerkOrganization            │   │
│  │  (login)        (admin org: NB, TPW, etc.)   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         │ clerkOrgId (1:1)
         ▼
┌─────────────────────────────────────────────────────┐
│  Database (Neon PostgreSQL via Prisma)               │
│  ┌──────────────────────────────────────────────┐   │
│  │  Tenant  (app record for org)                │   │
│  │    ├─ Contact  (public people)               │   │
│  │    ├─ MembershipTier + Membership            │   │
│  │    ├─ Event + EventRegistration              │   │
│  │    └─ AuditLog                               │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

Admin Dashboard:
  Requires: Clerk login + Clerk org membership + DB Tenant record
  Path: /dashboard → validates all three, hard fails on any missing

Public Portal:
  Requires: URL slug only
  Path: /portal/[tenantSlug] → resolves Tenant by slug
  No Clerk session required
  Visitor registration → creates Contact + EventRegistration ONLY
  NEVER creates Clerk Organization

Test Auth:
  Completely separate Playwright config (playwright.real-clerk.config.ts)
  No shared env flags with production middleware
  Synthetic tests labeled as SYNTHETIC, real-Clerk tests labeled as REAL
```

### Key Invariants

1. A `Tenant` record exists if and only if a `ClerkOrganization` exists — created in explicit onboarding only.
2. A `Contact` is a public person. It is NOT a Clerk user. It NEVER has `clerkOrgId`.
3. The `JG_ACTIVE_TENANT_ID` cookie is a selected-tenant preference only. It is always re-validated against Clerk membership before any write.
4. Test auth is a completely separate code path, activated by a separate Playwright config — never by a runtime env flag shared with the production middleware.

---

## E. v3 Database Model

### Enums
```
TenantStatus:    ACTIVE | SUSPENDED | PENDING
ContactType:     MEMBER | REGISTRANT | VOLUNTEER | DONOR | OTHER
MembershipStatus: ACTIVE | INACTIVE | EXPIRED | CANCELED
EventStatus:     DRAFT | PUBLISHED | CANCELED | COMPLETED
RegistrationStatus: CONFIRMED | CANCELED | ATTENDED | NO_SHOW | WAITLISTED
AuditAction:     CREATE | UPDATE | DELETE | LOGIN | LOGOUT | REGISTER
MembershipInterval: MONTHLY | ANNUAL | ONE_TIME
```

### Models

**Tenant**
```
id           String   @id @default(cuid())
name         String
slug         String   @unique
clerkOrgId   String   @unique
status       TenantStatus @default(ACTIVE)
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
```

**TenantAdminRole** (Clerk user → Tenant mapping cache)
```
id           String   @id @default(cuid())
tenantId     String
clerkUserId  String
role         String   @default("admin")
createdAt    DateTime @default(now())
@@unique([tenantId, clerkUserId])
```

**Contact** (public-facing person, never a Clerk user)
```
id           String   @id @default(cuid())
tenantId     String
firstName    String
lastName     String
email        String
phone        String?
type         ContactType @default(REGISTRANT)
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
@@unique([tenantId, email])
```

**MembershipTier**
```
id           String   @id @default(cuid())
tenantId     String
name         String
amountCents  Int
interval     MembershipInterval
stripePriceId String?
active       Boolean  @default(true)
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
```

**Membership**
```
id           String   @id @default(cuid())
tenantId     String
contactId    String
tierId       String
status       MembershipStatus @default(ACTIVE)
startsAt     DateTime @default(now())
expiresAt    DateTime?
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
```

**Event**
```
id           String   @id @default(cuid())
tenantId     String
title        String
slug         String
description  String?
startsAt     DateTime
location     String?
status       EventStatus @default(DRAFT)
priceCents   Int      @default(0)
capacity     Int?
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
@@unique([tenantId, slug])
```

**EventRegistration**
```
id           String   @id @default(cuid())
tenantId     String
eventId      String
contactId    String
status       RegistrationStatus @default(CONFIRMED)
createdAt    DateTime @default(now())
updatedAt    DateTime @updatedAt
@@unique([eventId, contactId])
```

**AuditLog**
```
id           String   @id @default(cuid())
tenantId     String?
actorUserId  String?
action       AuditAction
metadata     Json?
createdAt    DateTime @default(now())
```

---

## F. v3 Route Map

### Auth Routes
| Route | Purpose |
|---|---|
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/select-organization` | Choose org when user has multiple Clerk orgs |
| `/onboarding/create-organization` | New admin creates their first Clerk org + Tenant |

### Admin Dashboard Routes
| Route | Purpose |
|---|---|
| `/dashboard` | Overview: tenant name, user, setup status |
| `/dashboard/members` | List contacts/members |
| `/dashboard/members/new` | Add contact |
| `/dashboard/tiers` | List membership tiers |
| `/dashboard/tiers/new` | Add tier |
| `/dashboard/events` | List events |
| `/dashboard/events/new` | Create event |
| `/dashboard/settings` | Tenant settings |

### Public Portal Routes
| Route | Purpose |
|---|---|
| `/portal/[tenantSlug]` | Public portal home |
| `/portal/[tenantSlug]/events` | Public event list |
| `/portal/[tenantSlug]/events/[eventSlug]` | Event detail page |
| `/portal/[tenantSlug]/register/[eventSlug]` | Public registration form |

### API Routes
| Route | Purpose |
|---|---|
| `/api/active-tenant` | GET active JanaGana tenant selection, validated against Clerk membership |
| `/api/active-org` | Legacy alias for `/api/active-tenant` |
| `/api/sign-out` | POST: clear app cookies + Clerk session |
| `/api/webhooks/clerk` | Clerk org events → DB sync |
| `/api/webhooks/stripe` | Stripe payment events |

---

## G. v3 Test Strategy

### Test Layers

| Layer | Config | Auth Mode | Proves |
|---|---|---|---|
| Unit | vitest or jest | None | Individual functions |
| Auth state machine | playwright.config.ts | SYNTHETIC | All auth redirect states |
| Integration | playwright.config.ts | SYNTHETIC | Full workflows with fake identity |
| Real Clerk smoke | playwright.real-clerk.config.ts | REAL CLERK | Actual login, real session |

### Test Labeling Rule
Every test file must have a header comment:
```typescript
// AUTH_MODE: SYNTHETIC | REAL_CLERK
// PROVES: [what this test actually proves]
// DOES_NOT_PROVE: [what this test does NOT prove]
```

### Required Tests (v3 baseline)
1. `e2e/env-alignment.test.ts` — all required env vars present
2. `e2e/auth-state-machine.test.ts` — SYNTHETIC — zero/one/multi org redirects
3. `e2e/real-clerk-smoke.test.ts` — REAL_CLERK — actual sign-in → dashboard
4. `e2e/public-portal.test.ts` — SYNTHETIC — portal loads without admin auth
5. `e2e/public-registration.test.ts` — SYNTHETIC — visitor registration creates Contact, NOT Clerk org
6. `e2e/first-workflow.test.ts` — SYNTHETIC — full admin+portal workflow
7. `e2e/tenant-isolation.test.ts` — SYNTHETIC — tenant A cannot see tenant B data

### Anti-patterns Never Permitted
- Tests that pass `E2E_TEST_MODE=true` but are labeled as "real Clerk proof"
- Tests that call `createOrganization()` on behalf of a public registrant
- Tests that share cookies between admin and public portal sessions

---

## H. 7-Day Implementation Plan

### Day 1 (Today)
- [x] Create this REBUILD_PLAN.md
- [ ] Scaffold Next.js project with TypeScript, Tailwind, Clerk
- [ ] Initialize Prisma schema (minimal)
- [ ] Create `.env.example`
- [ ] Initialize git

### Day 2
- [ ] Implement middleware (real Clerk only, no test-auth)
- [ ] Implement `/sign-in`, `/sign-up` (Clerk hosted)
- [ ] Implement `/select-organization`
- [ ] Implement `/onboarding/create-organization` (creates Clerk org + Tenant)
- [ ] Implement `/dashboard` (stub: show tenant name + user)
- [ ] Implement `/api/active-tenant`
- [ ] Implement `/api/sign-out`

### Day 3
- [ ] Dashboard: Members list + add member form
- [ ] Dashboard: Membership Tiers list + add tier form
- [ ] Dashboard: Events list + create event form
- [ ] All forms validated with Zod

### Day 4
- [ ] Public portal: `/portal/[tenantSlug]`
- [ ] Public portal: `/portal/[tenantSlug]/events`
- [ ] Public portal: `/portal/[tenantSlug]/events/[eventSlug]`
- [ ] Public registration: `/portal/[tenantSlug]/register/[eventSlug]`
- [ ] Verify: no Clerk org created during public registration

### Day 5
- [ ] Auth state machine tests (synthetic)
- [ ] Public portal tests (synthetic)
- [ ] Public registration test (synthetic — proves no Clerk org created)
- [ ] First workflow test (synthetic — full admin+portal workflow)

### Day 6
- [ ] Env alignment script
- [ ] Real Clerk smoke (separate config, manual run)
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Prisma validate passes

### Day 7
- [ ] Release gate document passes
- [ ] First demo walkthrough (live)
- [ ] Deploy to Vercel preview URL
- [ ] NB/TPW integration guide written

---

## I. First Demo Scope

The v3 first demo proves exactly this workflow and nothing else:

**Admin:**
1. Sign in with Clerk
2. Select org (Namaste Boston)
3. View dashboard
4. Create a membership tier (e.g., "Monthly — $19.99")
5. Add a member/contact
6. Create an event (e.g., "Spring Yoga Class — June 1")

**Public:**
7. Open portal: `/portal/namaste-boston`
8. View events list
9. Click on "Spring Yoga Class"
10. Fill out registration form (name, email)
11. Submit — get confirmation

**Admin:**
12. Return to dashboard → Events → see the registration

That is the complete first demo. Nothing more is needed for v3 day-one proof.

---

## J. Deferred Features

These features are intentionally NOT in v3 skeleton. They will be added after the
first demo workflow is proven stable:

| Feature | Reason Deferred |
|---|---|
| Stripe payment processing | First demo uses free events only |
| Email notifications (Resend) | Add after workflow is proven |
| SMS (Twilio) | Deferred to v3.2 |
| File uploads (Cloudinary) | Deferred |
| Membership card / QR codes | Deferred |
| CRM (deals, pipelines, activities) | Out of scope for v3 |
| Fundraising / donations | Out of scope for v3 |
| Volunteering module | Out of scope for v3 |
| Clubs / chapters | Out of scope for v3 |
| Forum / content pages | Out of scope for v3 |
| Surveys / custom forms | Out of scope for v3 |
| Governance / officer terms | Out of scope for v3 |
| Email campaigns | Out of scope for v3 |
| Webhooks management UI | Out of scope for v3 |
| Analytics / charts | Out of scope for v3 |
| Multi-language support | Out of scope for v3 |
| Shopify / Squarespace integration | Out of scope for v3 |

---

*This plan is the single source of truth for v3 build scope. Any deviation requires explicit update to this document before implementation proceeds.*
