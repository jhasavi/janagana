# Ambassador / referral-code tracking

**Status:** implemented (2026-09-16). Closes the "Ambassador/referral-program tracking" gap noted as a smaller deferred item in [16-LEAD-INTELLIGENCE-PLAN.md](./16-LEAD-INTELLIGENCE-PLAN.md).

## Why

TPW's `campaigns/referral-program` page generates a `?ref=CODE` link to JanaGana's join flow and shows referral stats — but its backend was entirely fake (client-side code generation, `user_referrals`/`referral_codes` Supabase tables that don't exist). JanaGana now has the real backend: operators create trackable codes, and every public form captures and reports on redemptions.

## Data model

- `ReferralCode` — tenant-scoped code (`@@unique([tenantId, code])`), optional `label` and `ownerContactId` (the ambassador, if they're already a Contact), `active`/`archivedAt` for soft-archiving.
- `ReferralRedemption` — one row per contact (`contactId` is `@unique`, enforcing first-touch: a contact keeps whichever code referred them first). `converted`/`convertedAt` track whether the contact became a paying member/donor.
- `Contact.referredByCode` — denormalized copy of the code string for quick display, set only on `create` (never overwritten).

## Capture

`?ref=CODE` is read server-side from each portal page's own `searchParams` (no client JS), same pattern as UTM capture in [lib/portal/utm.ts](../lib/portal/utm.ts) — see [lib/portal/referral.ts](../lib/portal/referral.ts). Threaded through as a hidden form field into all 4 public entry points: contact/lead capture, event registration, membership join (the one TPW's link actually targets), and donation checkout. Resolution (`resolveActiveReferralCode`) and redemption recording (`recordReferralRedemption`, idempotent via the unique constraint) live in [lib/actions/referrals.ts](../lib/actions/referrals.ts). An unknown or inactive code degrades silently to "no attribution" — never blocks a signup.

Redemption is recorded when the contact is created (checkout-started, not payment-confirmed) — consistent with how event registration already treats "started the flow" as a real signal, rather than deferring to payment success.

## Conversion tracking

No new call sites: `recomputeLeadScore` ([lib/leads/scoring-actions.ts](../lib/leads/scoring-actions.ts)) already runs on every membership/donation success path and already computes `hasMembership`/`hasDonation`. It now also flips the contact's `ReferralRedemption.converted` the first time either becomes true, inside the same transaction. This reuses every existing trigger (5 action call sites + the nightly stale-lead cron) instead of adding referral-specific wiring anywhere else.

## Admin UI

- `/dashboard/referrals` — create codes, see redemption/conversion counts per code, archive.
- `/dashboard/referrals/[id]` — per-code detail: copyable join link, conversion rate, and the list of redeeming contacts with converted status.
- Contact detail page shows "Referred by" when set; CSV export includes `referredByCode`.

## Self-serve ambassador view — implemented (2026-09-17)

An ambassador doesn't need admin access to see their own numbers. `getMyReferralCodes` (`lib/actions/referrals.ts`) reuses the existing magic-link member session (`getCurrentMemberContact`, the same one powering `/portal/{tenantSlug}/account`) instead of a new auth mechanism — no new sign-in flow, no new session model. It scopes to `ReferralCode.ownerContactId === current contact`, so it's a plain reuse of infrastructure already built for member self-service.

A "Referral program" card appears on the member account page only when the signed-in contact owns at least one code — same conditional pattern as the existing "Household" section. Shows the copyable join link and live redemption/conversion counts per code.

## Explicitly out of scope

- Reward/tier automation (TPW's "Financial Friend / Community Builder / Movement Maker" tiers) — that's a fulfillment/rewards workflow, not tracking, and belongs with the already-deferred workflow-automation scope in [07-ARCHITECTURE.md](./07-ARCHITECTURE.md#L24).
