# Release Gate — Janagana v3

A version of Janagana v3 is **demo-ready** only when ALL of the following checks pass.
No exceptions. No partial releases.

---

## Automated Checks (must pass in CI or local)

| # | Check | Command | Pass Condition |
|---|---|---|---|
| 1 | Build | `npm run build` | Exits 0, no errors |
| 2 | Typecheck | `npm run typecheck` | Exits 0, zero TS errors |
| 3 | Lint | `npm run lint` | Exits 0, no errors or warnings |
| 4 | Prisma validate | `npm run prisma:validate` | Schema is valid |
| 5 | Env alignment | `npm run check:env` | All required vars present, Clerk env matches |
| 6 | Foundation e2e smoke | `npm run test:e2e:foundation` | All pass |
| 7 | Env contract e2e | `npm run test:e2e:env` | All pass |
| 8 | Tenant isolation script | `npm run test:actions` | All pass |
| 9 | Registration operations script | `npm run test:registration:ops` | All pass |
| 10 | Second-tenant isolation script | `npm run test:second-tenant` | All pass |

---

## Integration Checks (for this milestone)

| # | Check | Test file | Pass Condition |
|---|---|---|---|
| 11 | Members CRUD page | `app/dashboard/members/page.tsx` | Form creates and list reflects tenant data |
| 12 | Tiers CRUD page | `app/dashboard/tiers/page.tsx` | Form creates and list reflects tenant data |
| 13 | Events CRUD page | `app/dashboard/events/page.tsx` | Form creates and list reflects tenant data |
| 14 | Tenant switch link present | `app/dashboard/layout.tsx` | Header includes link to `/select-organization` |
| 15 | Select organization behavior | `app/select-organization/page.tsx` | Multi-tenant shows choices; single-tenant redirects to dashboard |
| 16 | Portal isolation (purple vs namaste) | `scripts/test-second-tenant-hardening.ts` | Events/registrations do not cross tenant boundaries |

---

## Real Clerk Smoke (must pass or be explicitly marked pending)

| # | Check | Command | Status |
|---|---|---|---|
| 17 | Real Clerk sign-in → dashboard | `npm run test:real-clerk` | PASS or PENDING (with reason) |

If PENDING, this must be documented in the release notes with a date for resolution.
A pending real Clerk smoke test means the release is a **preview only**, not a production release.

---

## Manual Verification (before any production deploy)

| # | Check | Verified by |
|---|---|---|
| 18 | No secrets in git | `git log --all --full-history -- .env*` returns nothing; `git grep "pk_live_\|sk_live_\|whsec_"` returns nothing |
| 19 | No fake dashboard CTAs | Members, tiers, and events links land on functioning pages |
| 20 | Sign out clears session | After sign out, `/dashboard` redirects to `/sign-in` |
| 21 | Deferred scope explicitly documented | Public portal/registration and Stripe are marked deferred |
| 22 | Second tenant onboarding state documented | Handoff/README state whether Namaste Clerk org is mapped or pending owner onboarding |

---

## Blocked Release Conditions

A release is **BLOCKED** if any of the following are true:

- `npm run build` fails
- TypeScript errors exist
- `.env.example` contains a real secret (`pk_live_`, `sk_live_`, `whsec_` with real value)
- A dashboard button links to a route that returns 404 or 500
- A test is labeled as "real Clerk proof" but uses `E2E_TEST_MODE=true`
- `prisma validate` fails

---

## Release Checklist Template

Copy this into your PR/release notes:

```
## v3.x Release Gate

- [ ] npm run build — PASS/FAIL
- [ ] npm run typecheck — PASS/FAIL
- [ ] npm run lint — PASS/FAIL
- [ ] npm run prisma:validate — PASS/FAIL
- [ ] npm run check:env — PASS/FAIL
- [ ] npm run test:e2e:foundation — PASS/FAIL
- [ ] npm run test:e2e:env — PASS/FAIL
- [ ] npm run test:actions — PASS/FAIL
- [ ] Real Clerk smoke — PASS/FAIL/PENDING (reason: ___)
- [ ] No secrets in git — YES/NO
- [ ] No fake CTAs — YES/NO
- [ ] Deferred scope documented (portal/registration/Stripe) — YES/NO

RELEASE STATUS: READY / PREVIEW / BLOCKED
```
