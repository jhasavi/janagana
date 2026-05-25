# Release Gate

> **Purpose**: Explicit checklist of what must pass before claiming the product is ready to show to real users. Passing automated tests is necessary but NOT sufficient.

---

## A. Gate 1 — "Mechanically Not Broken" (automated test suite must pass)

All of the following must pass with 0 failures, 0 retries:

| Command | What it proves |
|---------|---------------|
| `npm run build` | TypeScript compiles, no missing imports, no build-time errors |
| `npx tsc --noEmit` | Type safety across the full codebase |
| `npm run lint` | No ESLint rule violations |
| `npm run prisma:validate:e2e` | Prisma schema is valid, E2E DB migration is up to date |
| `npx playwright test 12-auth-state-machine.spec.ts` | Auth state machine handles all transitions correctly |
| `npx playwright test 14-dashboard-actionability.spec.ts` | Dashboard CTAs exist and are linked to correct routes |
| `npx playwright test 15-portal-regression.spec.ts` | Portal renders without crash; isolation and auth work |
| `npx playwright test 16-first-complete-workflow.spec.ts` | Full tier/member/event/portal workflow completes end-to-end |
| `npx playwright test 17-real-browser-first-step-regression.spec.ts` | First-step behaviors match real user expectations |

**Gate 1 verdict**: ✅ / ❌ — all 9 commands pass, 0 failures

---

## B. Gate 2 — "First Step Works in Real Browser" (manual smoke test)

These cannot be verified by automated tests because they require real Clerk credentials and a real browser session with no test-auth bypass.

### B.1 Sign-out (BUG-001 real Clerk verification)
1. Open `/select-organization` in a real browser (real Clerk session, no `NEXT_PUBLIC_E2E_TEST_MODE`)
2. Click "Sign Out"
3. **Pass criteria**: browser navigates to `/sign-in` within 3 seconds. Button does NOT stay frozen at "Signing out…"
4. **How to test**: Deploy to a preview Vercel URL with real `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

### B.2 Dashboard card clickability (BUG-002)
1. Sign in and go to `/dashboard`
2. Find the Launch Center section
3. Click on the text label or icon of any card row (NOT the right-side CTA text)
4. **Pass criteria**: browser navigates to the corresponding route

### B.3 Stripe warning accuracy (BUG-003)
1. If no paid tier with Stripe Price ID exists → warning banner is visible (correct)
2. Create a paid tier at `/dashboard/tiers/new` with a real Stripe Price ID
3. Reload dashboard
4. **Pass criteria**: warning banner disappears after a valid paid tier is saved

---

## C. What test-auth mode proves vs. what it does NOT prove

| Claim | Test-auth mode proves? | Real Clerk mode needed? |
|-------|----------------------|------------------------|
| Navigation routes work (correct hrefs) | ✅ Yes | No |
| DB reads/writes succeed for tenant operations | ✅ Yes (same DB) | No |
| Portal renders without crash | ✅ Yes | No |
| Stripe warning accurately reflects DB state | ✅ Yes | No |
| Card body click navigates (BUG-002 fix) | ✅ Yes | No |
| Sign-out completes (navigation happens) | ✅ Mechanism only | ✅ Real Clerk signOut path |
| Clerk JWT claims are correct | ❌ No (bypassed) | ✅ Yes |
| MFA / session expiry / account switching | ❌ No | ✅ Yes |
| Webhook events from Stripe in live mode | ❌ No | ✅ Yes |

---

## D. Known open issues (must be actioned before real-user launch)

| ID | Issue | Action required | Owner |
|----|-------|----------------|-------|
| BUG-003 | Stripe warning — no paid tier in DB | Create paid tier at `/dashboard/tiers/new`, link Stripe Price ID | Operator |
| BUG-001 (real Clerk) | Sign-out fix needs real Clerk smoke test | Deploy to preview, test manually | Developer |

---

## E. Disabled / stub features (do not claim working)

| Feature | State | Evidence |
|---------|-------|---------|
| Stripe live payments | Not set up — no paid tier in DB | BUG-003; `getStripeSetupReadiness()` returns warning |
| SMS (lib/sms.ts) | Configured with Twilio env vars; not tested end-to-end | |

---

## F. Manual smoke test script (5-minute check)

Run this before any demo or real-user invite:

```
1. Open / in a real browser
   ✓ Home page loads, no JS errors in console

2. Sign in with a real Clerk account
   ✓ Redirected to /select-organization or /dashboard
   ✓ If /select-organization: click sign-out → lands at /sign-in within 3s

3. Select an organization → /dashboard
   ✓ Dashboard loads, no "Dashboard failed to load" banner
   ✓ Launch Center visible
   ✓ Click a card row label → navigates (not just the right-side CTA)

4. Go to /dashboard/tiers/new
   ✓ Page loads, form is interactive

5. Go to /dashboard/members/new
   ✓ Page loads, form is interactive

6. Go to /portal/{slug}/events
   ✓ Events list renders, no crash

7. Check Launch Center stripe warning
   ✓ If warning visible → expected (no paid tier set up yet)
   ✓ If no warning → paid tier with Stripe Price ID is configured
```

---

*This document must be updated whenever a gate item changes status or a new known issue is identified.*
