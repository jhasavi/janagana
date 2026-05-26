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
| 4 | Prisma validate | `npm run db:validate` | Schema is valid |
| 5 | Env alignment | `npm run check:env` | All required vars present, Clerk env matches |
| 6 | Auth state machine | `npm test -- env-alignment.test.ts auth-state-machine.test.ts` | All pass |

---

## Integration Checks (must pass before first demo)

| # | Check | Test file | Pass Condition |
|---|---|---|---|
| 7 | Public portal loads without admin auth | `e2e/public-portal.test.ts` | All pass |
| 8 | Public registration does NOT create Clerk org | `e2e/public-registration.test.ts` | All pass |
| 9 | First complete workflow | `e2e/first-workflow.test.ts` | All pass |
| 10 | Tenant isolation | `e2e/tenant-isolation.test.ts` | All pass |

---

## Real Clerk Smoke (must pass or be explicitly marked pending)

| # | Check | Command | Status |
|---|---|---|---|
| 11 | Real Clerk sign-in → dashboard | `npm run test:real-clerk` | PASS or PENDING (with reason) |

If PENDING, this must be documented in the release notes with a date for resolution.
A pending real Clerk smoke test means the release is a **preview only**, not a production release.

---

## Manual Verification (before any production deploy)

| # | Check | Verified by |
|---|---|---|
| 12 | No secrets in git | `git log --all --full-history -- .env*` returns nothing; `git grep "pk_live_\|sk_live_\|whsec_"` returns nothing |
| 13 | No fake dashboard CTAs | Every dashboard button either works or shows a disabled state with explanation |
| 14 | Portal link from dashboard works | Admin clicks "Public portal ↗" and sees the correct portal |
| 15 | Public registration shows confirmation | Visitor registers and sees success message (not an error) |
| 16 | Admin sees the registration | Admin views Events → registration count increases |
| 17 | Sign out clears session | After sign out, `/dashboard` redirects to `/sign-in` |

---

## Blocked Release Conditions

A release is **BLOCKED** if any of the following are true:

- `npm run build` fails
- TypeScript errors exist
- `.env.example` contains a real secret (`pk_live_`, `sk_live_`, `whsec_` with real value)
- A dashboard button links to a route that returns 404 or 500
- Public registration creates a Clerk organization (tested by `e2e/public-registration.test.ts`)
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
- [ ] npm run db:validate — PASS/FAIL
- [ ] npm run check:env — PASS/FAIL
- [ ] env-alignment.test.ts — PASS/FAIL
- [ ] auth-state-machine.test.ts — PASS/FAIL
- [ ] public-portal.test.ts — PASS/FAIL
- [ ] public-registration.test.ts — PASS/FAIL
- [ ] first-workflow.test.ts — PASS/FAIL
- [ ] tenant-isolation.test.ts — PASS/FAIL
- [ ] Real Clerk smoke — PASS/FAIL/PENDING (reason: ___)
- [ ] No secrets in git — YES/NO
- [ ] No fake CTAs — YES/NO
- [ ] Manual walkthrough complete — YES/NO

RELEASE STATUS: READY / PREVIEW / BLOCKED
```
