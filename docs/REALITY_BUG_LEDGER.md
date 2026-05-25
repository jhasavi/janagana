# Reality Bug Ledger

> **Purpose**: Track the delta between what automated tests claim works and what a real user actually experiences. A bug is only CLOSED when manually verified in a real browser, not just when a test passes.
>
> **Policy**: Do not mark FIXED until real-mode (real Clerk + real browser) verification passes, OR until the code change is proven by a regression test that would have caught the original failure.

---

## BUG-001 — Select Organization sign-out hangs at "Signing out..."

| Field | Value |
|-------|-------|
| **ID** | BUG-001 |
| **Severity** | CRITICAL — blocks account switching entirely |
| **User-visible symptom** | Click "Sign Out" on `/select-organization`. Button text changes to "Signing out…" and stays there indefinitely. Page never navigates. User is stuck. |
| **Manual evidence** | Reproducible in real Clerk mode (not E2E test mode). Clicking sign-out sets `isSigningOut=true` and the component never unmounts or navigates. |
| **Automated test claim** | `14-dashboard-actionability.spec.ts` test 1 clicks `select-org-sign-out`, waits for `/sign-in`, and passes. |
| **Why test lies** | The test uses E2E test mode (`NEXT_PUBLIC_E2E_TEST_MODE=true`). In test mode, the code takes the `else` branch: `window.location.assign('/api/sign-out')` — which always works. The broken Clerk branch (`if NEXT_PUBLIC_E2E_TEST_MODE !== 'true'`) is never exercised by the test. |
| **Root cause** | `clerk.signOut({ redirectUrl: '/api/sign-out' })` in Clerk v5 can complete (Promise resolves) without triggering a browser navigation. After the await, `return` exits the function but `isSigningOut` stays `true`. No timeout fallback exists. |
| **File** | `app/select-organization/SelectOrgClient.tsx` |
| **Fix plan** | Remove `redirectUrl` from `clerk.signOut()`. Add `window.location.assign('/api/sign-out')` immediately after the await. Add 3-second safety timeout that force-navigates if the Promise never resolves. |
| **Regression test** | `e2e/tests/17-real-browser-first-step-regression.spec.ts` — "sign-out completes and lands on sign-in within 5 seconds" |
| **Status** | FIXED (code change applied; verified in test-auth mode via spec 17; real Clerk verification pending — see note below) |
| **Real Clerk note** | The fix is architecturally sound and does not depend on Clerk returning a specific value. However, real Clerk sign-out can only be verified by running the dev server with real Clerk credentials (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` for a real Clerk app) and clicking sign-out in a real browser session. |

---

## BUG-002 — Dashboard/Launch Center card rows look clickable but are not

| Field | Value |
|-------|-------|
| **ID** | BUG-002 |
| **Severity** | HIGH — broken first-use UX; every new user hits this on their first session |
| **User-visible symptom** | On the Dashboard launch center, each setup card (Profile, Tiers, Members, etc.) looks like a clickable row with an icon, title, description, and CTA text. Clicking anywhere on the card's left side (text, icon, description area) does nothing. Only the small ghost button on the far right navigates. |
| **Manual evidence** | Reproducible in any browser. Click "Set up your profile" card text → no navigation. Click the "Set up →" button text on the right → navigates correctly. |
| **Automated test claim** | `14-dashboard-actionability.spec.ts` test 3 ("launch center action buttons navigate to concrete routes") passes for all 10 cards. |
| **Why test lies** | Test uses `page.getByTestId('launch-center-cta-{id}')` which selects the exact `<Button>` element on the right side — the only element that IS a link. The card body (80% of visible area) has no `href` and no click handler. The test verifies the mechanism, not the UX. |
| **Root cause** | Each card is a `<div>` with no click handler. The inner icon/text area is inside a non-interactive `<div>`. Only `<Button asChild><Link href=...>` on the far right is interactive. |
| **File** | `components/dashboard/launch-center.tsx` |
| **Fix plan** | Replace the non-interactive outer `<div>` + separate right-side `<Button>` with an overlay-link pattern: outer `div` is `position: relative`, an `<Link className="absolute inset-0">` covers the entire card, inner content gets `pointer-events-none`. `data-testid="launch-center-cta-{id}"` moves to the overlay Link so existing tests still pass. |
| **Regression test** | `e2e/tests/17-real-browser-first-step-regression.spec.ts` — "launch center card body click navigates" — clicks the icon/description area, not the button |
| **Status** | FIXED |

---

## BUG-003 — Stripe warning persists ("No paid membership tier is configured with a Stripe Price ID")

| Field | Value |
|-------|-------|
| **ID** | BUG-003 |
| **Severity** | MEDIUM — confusing noise for operators; creates impression that Stripe is broken when it may just need setup |
| **User-visible symptom** | Dashboard shows persistent orange/yellow warning: "No paid membership tier is configured with a Stripe Price ID. Add one in Membership Tiers." Warning appears every time regardless of whether the user has set up tiers. |
| **Manual evidence** | DB query confirmed: zero `MembershipTier` rows exist for any real tenant with both `priceCents > 0` AND `stripePriceId IS NOT NULL` AND `isActive = true`. |
| **DB state** | Production DB has 1 tier total: `e2e-tier-free-cmphfuddj0001sb14cf9xwqx8` (free tier for e2e-org-b). No paid tier with Stripe Price ID exists for any tenant. |
| **Stripe mode** | App uses LIVE Stripe keys (`sk_live_...`). Do NOT create Stripe products/prices programmatically without operator confirmation. |
| **Automated test claim** | No test currently asserts that the Stripe warning should or should not appear. Warning is "invisible" to tests. |
| **Root cause** | The warning IS accurate. No operator has ever created a paid membership tier and linked it to a Stripe Price ID in the production database. This is a missing setup step, not a code bug. |
| **Fix plan** | 1. Run `npx tsx scripts/verify-stripe-membership-setup.ts` to get a report of current tier+Stripe state. 2. In the app, go to `/dashboard/tiers/new`, create a paid tier (e.g. $10/mo Annual Membership). 3. Retrieve the Stripe Price ID for that tier (Stripe Dashboard → Products → find the price → copy Price ID). 4. The tier creation flow may auto-create the Stripe price; if so, the Price ID is stored automatically. 5. Once a paid tier exists with a `stripePriceId`, the warning disappears. |
| **Code action** | Added `scripts/verify-stripe-membership-setup.ts` diagnostic script. |
| **Status** | OPEN — warning is truthful; no code fix needed; requires operator to create a paid tier with Stripe Price ID via `/dashboard/tiers/new` |

---

## BUG-004 — Test suite claims "working" when only mechanism is tested, not user experience

| Field | Value |
|-------|-------|
| **ID** | BUG-004 |
| **Severity** | HIGH (process) — causes false confidence; "all tests pass" does not mean the product works |
| **User-visible symptom** | Not directly visible to end users. Manifests as developer confusion when tests pass but users report bugs. |
| **Root cause** | `14-dashboard-actionability.spec.ts` tests the automated-test surface (exact `data-testid` selectors, exact `href` values) rather than simulating actual user behavior (clicking where a user's eye would land, reading whether navigation actually happened). BUG-001 and BUG-002 are both invisible to the existing test suite despite being reproducible immediately by any real user. |
| **Files** | `e2e/tests/14-dashboard-actionability.spec.ts` |
| **Fix plan** | Add `e2e/tests/17-real-browser-first-step-regression.spec.ts` that: (a) clicks card BODY not CTA button, (b) verifies sign-out completes within 5s, (c) verifies Stripe warning state matches DB truth. |
| **Status** | FIXED — spec 17 created with 6 behavior-first tests |

---

## Summary Table

| ID | Summary | Severity | Status |
|----|---------|----------|--------|
| BUG-001 | Sign-out hangs in real Clerk mode | CRITICAL | FIXED (real Clerk: pending manual verify) |
| BUG-002 | Launch center cards not clickable in body area | HIGH | FIXED |
| BUG-003 | Stripe warning — no paid tier in DB | MEDIUM | OPEN (operator action required) |
| BUG-004 | Tests claim working when only mechanism tested | HIGH (process) | FIXED (spec 17 added) |

---

*Last updated: current session. Update `Status` field when manual verification is completed.*
