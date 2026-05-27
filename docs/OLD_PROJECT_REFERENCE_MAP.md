# Old Project Reference Map

**Old project (archived):** `~/janagana-old`  
**New primary project:** `~/janagana`

This document records what was inspected in the old project and the decision made for each
module: reuse, adapt, or discard.

---

## Decision Key

- **REUSE** — Copied or closely adapted into v3
- **ADAPT** — Concept kept, implementation rewritten cleanly
- **DISCARD** — Do not carry forward for reason stated

---

## Core Infrastructure

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| `lib/prisma.ts` (singleton) | ADAPT | Identical pattern, safe | `lib/prisma.ts` | None |
| `prisma/schema.prisma` (50+ models, 1899 lines) | DISCARD | Schema was spec without workflow. 50+ models before first real demo. | `prisma/schema.prisma` (8 models, clean) | None |
| `middleware.ts` (Clerk + test-auth) | DISCARD | `isAppTestAuthEnabled()` bleeds test into prod path | `middleware.ts` (Clerk only) | Fixed |
| `middleware.ts` (route matching concepts) | ADAPT | Public vs protected route distinction is correct | `middleware.ts` | None |
| `lib/actions.ts` | ADAPT | Concept (server actions, Zod, tenantId filter) is correct | `lib/actions.ts` | None |
| `lib/feature-flags.ts` | DISCARD | Feature flags for unimplemented features add confusion | Removed | None |
| `lib/auth-org-redirect-log.ts` | DISCARD | Debug logging in production path creates noise | Removed | None |
| `lib/utils.ts` (cn helper) | REUSE | Standard clsx + tailwind-merge pattern | `lib/utils.ts` | None |

---

## Authentication

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | ADAPT | Structure correct, cleaned up | Same structure | None |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | ADAPT | Structure correct | Same structure | None |
| `app/select-organization/page.tsx` | ADAPT | Clerk `OrganizationList` component correct | Same | None |
| `app/onboarding/create-organization/page.tsx` | DISCARD + REWRITE | Old version had ambiguous org creation path | New clean version | Fixed |
| Test auth cookie `JG_TEST_AUTH` | DISCARD | Mixed real/synthetic auth — fundamental flaw | Not present in v3 | Fixed |
| `JG_ACTIVE_ORG` cookie as truth source | DISCARD | Cookie is not validated against Clerk session | Not used in v3 | Fixed |
| `E2E_TEST_MODE` / `PLAYWRIGHT_TEST` env flags in middleware | DISCARD | Test env bleeds into production code path | Removed from middleware | Fixed |

---

## Dashboard

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| Dashboard layout structure | ADAPT | Sidebar + main layout concept is fine | `app/dashboard/layout.tsx` | None |
| Dashboard overview page | DISCARD + REWRITE | Had fake feature cards for unimplemented features | `app/dashboard/page.tsx` (setup checklist + real stats) | Fixed |
| Dashboard members CRUD | ADAPT | Basic list + form pattern is correct | `app/dashboard/members/` | None |
| Dashboard events CRUD | ADAPT | Basic list + form pattern is correct | `app/dashboard/events/` | None |
| CRM module (deals, pipelines, activities) | DISCARD | Out of scope for v3 first demo | Deferred | None |
| Clubs module | DISCARD | Out of scope | Deferred | None |
| Fundraising module | DISCARD | Out of scope | Deferred | None |
| Volunteering module | DISCARD | Out of scope | Deferred | None |
| Forum / content pages | DISCARD | Out of scope | Deferred | None |
| Surveys / custom forms | DISCARD | Out of scope | Deferred | None |
| Governance / officer terms | DISCARD | Out of scope | Deferred | None |

---

## Public Portal

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| `app/portal/[tenantSlug]/` structure | ADAPT | Route structure is correct | Same structure | None |
| Tenant resolver by URL slug | ADAPT | Concept is correct; old version also tried dashboard cookies | `lib/tenant.ts` (slug-only) | None |
| Public registration form | DISCARD + REWRITE | Old version unclear on whether it could create Clerk orgs | `app/portal/.../register/` (explicit no-Clerk-org invariant) | Fixed |

---

## Scripts

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| `scripts/check-known-clerk-orgs.ts` | ADAPT | Concept is useful; cleaned up | `scripts/check-known-clerk-orgs.ts` | None |
| `check-events.ts` | DISCARD | Debug-only script | Removed | None |
| `debug-*.js` scripts | DISCARD | Ad-hoc debug scripts | Removed | None |
| `repair-results.json` | DISCARD | Old repair artifact | Removed | None |

---

## Tests

| Old file/module | Decision | Reason | New location | Risk |
|---|---|---|---|---|
| Playwright config structure | ADAPT | Separating real-clerk and synthetic configs is the right pattern | `playwright.config.ts` + `playwright.real-clerk.config.ts` | None |
| Tests using `E2E_TEST_MODE=true` | DISCARD | These tests never proved real Clerk behavior | New tests explicitly labeled SYNTHETIC | Fixed |
| `playwright.real-clerk.config.ts` (concept) | REUSE | Separate real-clerk config is the right approach | Same | None |

---

## Documentation

| Old file/module | Decision | Reason |
|---|---|---|
| `docs/ARCHITECTURE.md` | DISCARD | Describes architecture that was aspirational, not actual |
| `docs/CLERK_TENANT_MAPPING_REPAIR_PLAN.md` | DISCARD | Recovery doc for debt that doesn't exist in v3 |
| `docs/RECOVERY_AUDIT.md`, `REALITY_BUG_LEDGER.md`, `REPAIR_*` | DISCARD | Recovery docs for v2 — not relevant to v3 |
| `docs/ENV_AND_SECRETS.md` | ADAPT | Secret policy concept is correct; rewritten cleanly | `docs/ENV_AND_SECRETS.md` |
| `docs/STRIPE_MEMBERSHIP_SETUP.md` | DEFER | Deferred to v3.1 | — |
| `docs/USER_TYPES_GUIDE.md` | ADAPT | Contact/Member/Admin distinction captured in v3 architecture | `docs/REBUILD_PLAN.md` |
