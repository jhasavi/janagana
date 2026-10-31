# JanaGana v1.0 test report (interim)

Decision: **NO-GO for now** (insufficient evidence, not proven broken). Environment: localhost:3020, Stripe/Clerk test keys, production Neon database. Nothing fixed; the one DB change was an approved additive migration.

## Promise scorecard
| # | Promise | Status |
|---|---|---|
| P1 | New admin sets up an org and publishes an event in <10 min | Not tested (no admin session) |
| P2 | Visitor joins and pays dues, member renews unaided | Partial: pages load, payment scripts pass; UI checkout not run |
| P3 | Guest registers; capacity, check-in, reports accurate | Partial: registration and capacity pass; past-dated bug; no waitlist; check-in/report not run |
| P4 | Payments match ledger, receipts, reports | Partial: script-level pass; refund webhook and reports not run |
| P5 | Right emails arrive, visible in outbox | Not tested |
| P6 | CSV import/export, bad rows, Hindi/Nepali | Partial: parser/export and Hindi names pass; UI bad-row import not run |
| P7 | No data leaks; admin URLs protected | Pass at script level and signed-out URLs; member-vs-member UI not run |

## Fixed in this pass (verified)
Past-dated registration blocked; closed/full states shown instead of the form; friendly validation messages; build now runs `prisma migrate deploy` instead of `db push --accept-data-loss`; README pricing claim removed; stale tests updated; portal hero contrast fixed. Axe WCAG 2.1 AA scan of 7 public pages: 0 violations after the fix. Note: the earlier Blocker was overstated, because deploys already applied schema changes; the migration is still a required release step.

## Top fixes (S/M/L), original list
1. Run `prisma migrate deploy` before deploying main; add it to the release pipeline (S). Prod DB was one migration behind.
2. Block registration for events whose start date has passed (S). Major.
3. Replace raw validation text in URLs with friendly messages (S).
4. Hide the form and show "full" state on full events; add waitlist (M, v1.1).
5. Update the 4 stale Playwright tests for the new homepage (S).
6. Add /pricing or remove it from README/docs (S).
7. Make the refund-webhook test runnable against a test DB (S).
8. Complete blocked workflows A-H, email and dashboard checks before GO (L).

## Needed before a real GO
Admin/member UI session, Stripe test-card checkout, Gmail inbox check, Vercel access (403), GIFs of failures (none recorded).

## v1.1 candidates
Waitlist, full-event UX, pricing page.

## Still not tested (needs a signed-in session, Stripe test-card UI, Gmail inbox, Vercel access)
Workflows A (org setup), B (member lifecycle in UI), C (admin event tools, check-in, attendance), D (checkout, failed card, refund in admin), E (emails, broadcast, unsubscribe), F (dashboard totals), G (member-vs-member UI). Design critique of authenticated screens was not done. Real-user script: see research-script.md.

## Decision
NO-GO stays: P1, P5 and most of P2 to P4 are unverified in the UI. Step 6 (launch marketing) not started.
