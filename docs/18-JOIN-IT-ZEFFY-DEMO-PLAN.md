# Beat Join It + Zeffy — Demo readiness plan

**Audience:** Founders, demo presenters, product  
**Competitors:** [Join It](https://joinit.com/) (membership management) · Zeffy (zero-fee donations/payments)  
**Goal:** Win a nonprofit demo by showing **operator clarity + website-native integration + migration** — not by claiming feature parity on day one.

---

## How to win (positioning)

| Join It sells | JanaGana counter |
|---------------|------------------|
| All-in-one hosted website + membership | **Keep your existing website** (WordPress, custom) — embed portal, events, donate, join |
| Digital wallet cards | **Operator truth first** — renewals desk, contact timeline, import provenance |
| Simple SaaS for any org | **Built for diaspora/community orgs** — Raklet migration, TPW/NB production proof |
| $29/mo + their stack | **0% JanaGana platform fee** + your Stripe account (vs Zeffy payment lock-in) |

| Zeffy sells | JanaGana counter |
|-------------|------------------|
| 100% free donations | **Same 0 bps platform fee** — disclose Stripe processor fees honestly |
| Donor covers fee | **Built** — optional checkbox on donate, join, and paid events |
| Donations only | **Unified ledger** — membership + events + donations in one operator view |
| Their checkout | **Your brand, your domain path** — portal on org site, not zeffy.com redirect |

**Demo rule:** Lead with migration → contacts → renewals → event → money. Never open with “we don’t have Apple Wallet yet.”

---

## Join It feature map (what they will show)

From [joinit.com](https://joinit.com/):

- Membership database, types, custom CRM fields  
- Digital membership cards (Apple Wallet / Google Wallet + QR check-in)  
- Member portal (self-service)  
- Automated renewal reminders + recurring billing (Stripe)  
- Donations, event registration/ticketing  
- Member directory, group memberships  
- Email segmentation, embeddable widgets  
- Integrations: Mailchimp, Eventbrite, Zapier, WordPress  

---

## Must-complete checklist (28 items)

Status key: **Done** · **Partial** · **Missing**

### A. Demo blockers — complete before any Join It head-to-head (P0)

| # | Item | vs | Status | Why it matters |
|---|------|-----|--------|----------------|
| 1 | **Demo dataset**: 20+ contacts, 1 tier, 3+ enrolled members, 1 published event, 1 registration | Join It | Done (`npm run seed:joinit-demo -- --confirm-joinit-demo`) | Empty states lose demos |
| 2 | **Raklet/CSV import live path** with provenance filters | Join It migrate | Done | Their #1 onboarding story — we must match |
| 3 | **Contact profile edit + tags** (operator CRM) | Join It CRM | Done | Shows we’re not a spreadsheet |
| 4 | **Renewals desk** with expiring/expired buckets + honest copy | Join It reminders | Done (use demo seed) | UI exists; needs seeded data |
| 5 | **One-click “queue renewal reminder”** that **delivers email** (Resend configured) | Join It automation | Done | Queue + deliver via Resend |
| 6 | **Public membership join → Stripe → receipt** end-to-end | Join It billing | Done (one-time + subscription) |
| 7 | **Public donation → Stripe → receipt** end-to-end | Zeffy | Done (one-time + monthly) |
| 8 | **Fee transparency slide**: “0% JanaGana fee” + processor disclosure | Zeffy | Done | Surfaced on donate/join/register/payments |
| 9 | **Embed portal on org website** (iframe + return URL) | Join It widgets | Done | TPW proof — demo this, not localhost |
| 10 | **15-minute scripted demo** updated for Join It/Zeffy objections | — | Done | See [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) |

### B. Payments — beat Zeffy narrative (P0–P1)

| # | Item | vs | Status | Why it matters |
|---|------|-----|--------|----------------|
| 11 | **Donor covers processing fee** toggle on donate + join + events | Zeffy | Done | Their headline feature |
| 12 | **Recurring donations** (Stripe subscription) | Zeffy | Done |
| 13 | **Stripe Checkout for paid event tickets** (not PENDING_PAYMENT limbo) | Join It + Zeffy | Done | “Register and pay” in one step |
| 14 | **Downloadable receipt** (print/save-as-PDF view, no new binary dependency) | Zeffy tax letters | Done | `/dashboard/payments/receipts/[receiptId]` |
| 15 | **Failed payment / past-due visibility** on renewals desk | Join It | Done | Dunning banner + "Payment failed" filter |
| 16 | **Unified payments ledger** filters by purpose (member/event/donation) | Both | Done | `/dashboard/payments` filter chips |

### C. Membership — beat Join It core (P1)

| # | Item | vs | Status | Why it matters |
|---|------|-----|--------|----------------|
| 17 | **Stripe subscriptions for membership** (wire `autoRenew` flag) | Join It recurring | Done |
| 18 | **Automated renewal reminder job** (7/30/60 day, not manual only) | Join It | Done (`npm run job:renewal-reminders`) |
| 19 | **Digital membership card** — Phase 1: QR on contact profile | Join It wallet | Done (verify API + profile card) |
| 20 | **Member check-in via QR scan** (camera or paste code) | Join It check-in | Partial | Admin check-in button only |
| 21 | **Membership types on portal** — clear tier comparison on `/join` | Join It | Done | Side-by-side selectable comparison cards |
| 22 | **Group / household membership** (1 payer, N members) | Join It groups | Missing | Common for family orgs |

### D. CRM & engagement (P1)

| # | Item | vs | Status | Why it matters |
|---|------|-----|--------|----------------|
| 23 | **Communications admin UI** (outbox: queued/sent/failed) | Join It email | Done | `/dashboard/communications` — filters + retry |
| 24 | **Contact activity timeline** on profile (imports, payments, events) | Join It timeline | Done | Unified chronological timeline on contact profile |
| 25 | **Custom fields** (1–3 admin-defined fields per contact) | Join It CRM | Missing | “Track anything” pitch |
| 26 | **Member directory** (opt-in public list on portal) | Join It directory | Missing | Community orgs expect this |
| 27 | **Segmented export** (tag + membership status → CSV for Mailchimp) | Join It + Mailchimp | Partial | Filtered export done; save segments later |

### E. Polish & trust (P1–P2)

| # | Item | vs | Status | Why it matters |
|---|------|-----|--------|----------------|
| 28 | **Apple / Google Wallet pass** for membership card | Join It | Missing | Their wow moment — Phase 2 |
| 29 | **Authenticated member portal** (view status, renew, update profile) | Join It portal | Missing | Large build — Phase 2 |
| 30 | **Year-end giving summary** export for donors | Zeffy | Done | `/api/export/giving-summary` CSV, linked from Donations |
| 31 | **Multi-admin roles** (viewer vs admin) | Join It | Missing | Clerk org roles exist (owner/admin/member) but aren't enforced inside the dashboard yet — explicit roadmap item, not hacked in before a demo |
| 32 | **Demo objection cheat sheet** (1-pager for presenters) | — | Done | See battlecard below |

**Count:** 32 items (28 must-have for competitive demo + 4 Phase 2 differentiators).

---

## Recommended build order (8 weeks → demo-ready)

### Sprint 1 — Win the room (2 weeks)
1, 4, 5, 8, 10, 11, 13, 16 — **all done**

### Sprint 2 — Match Join It billing story (2 weeks)
6, 7, 12, 17, 18, 19 — **all done**

### Sprint 3 — CRM depth (2 weeks)
23, 24, 27 (partial), 20 (partial) — 25 (custom fields) still open

### Sprint 4 — Differentiation (2 weeks)
14, 15, 21, 30, 32 — **all done**; 22 (households) and 26 (member directory) still open

Phase 2 (post-win): 28, 29, 31 — remaining open items, all explicit roadmap call-outs, not silent gaps.

---

## Demo battlecard — objection responses (presenter 1-pager)

| They say | You say | Show |
|----------|---------|------|
| “Join It has digital cards in Apple Wallet” | “We start with QR membership proof + check-in; wallet pass is on our roadmap. Most orgs need **renewals and imports** first.” | Renewals desk + contact profile |
| “Zeffy is free” | “We charge **0% platform fee** too. You keep **your Stripe account** and one ledger for dues, events, and donations — not three tools.” | Fee disclosure on donate/join + payments ledger |
| “We need recurring memberships” | “Built — Stripe subscriptions with `autoRenew`, plus an automated reminder job at 7/30/60 days.” | Join flow + renewals desk |
| “Can we keep our website?” | “Yes — embed events, join, donate on **your** site. Join It wants you in their builder.” | TPW embed / iframe demo |
| “Import our Raklet export” | “Built for that migration path.” | Import → Raklet filter → tags |
| “Can members log in and manage their own profile?” | “Not yet — today operators manage everyone from one dashboard, which is faster for most community orgs day one. Authenticated self-service is our next major build; we're sequencing it deliberately (Clerk magic link vs. a lightweight contact token) rather than bolting on auth that isn't secure.” | Contact profile edit + timeline as the operator-side alternative |
| “What happens when a card gets declined?” | “It shows up immediately on the renewals desk with a **Payment failed** badge and the exact amount/date — no separate trip to Stripe.” | Renewals desk dunning banner |
| “Can donors get a receipt for taxes?” | “Every payment gets a numbered receipt with a print/save-as-PDF view, and operators can export a year-end giving summary per donor in one click.” | Donations page → receipt link → CSV export |
| “Do you have a communications / email history?” | “Yes — every receipt, confirmation, and reminder lands in one outbox with delivery status, and failed sends can be retried in a click.” | `/dashboard/communications` |
| “What about households or family memberships?” | “On the roadmap, not shipped — we didn't want to bolt on a data model change days before a demo. Happy to scope it as the next sprint.” | N/A — say it plainly, don't dodge |

**Golden rule:** every "not yet" above has a *reason* and a *next step*. Never apologize — state the sequencing decision like it was intentional, because it was.

---

## What NOT to promise in the demo

- Full website builder (Join It strength — we integrate instead)
- Mailchimp/Zapier marketplace (mention roadmap)
- Native mobile app
- 100% parity with Zeffy raffles/auctions
- Automated everything without Resend/Stripe configured

---

## Test manager gates (add when items ship)

```bash
npm run seed:joinit-demo -- --confirm-joinit-demo
npm run test:subscriptions
npm run job:renewal-reminders -- --dry-run
npm run test:contact-update
npm run verify:pilot-demo
npm run gate:quick
# Future:
# npm run test:membership-subscriptions
```

---

## Success criteria for “beat Join It in demo”

- [ ] Migration story < 5 minutes, visibly better than manual Join It CSV import
- [ ] Operator finds “who needs attention” faster than Join It’s generic CRM
- [ ] Live payment (donation OR membership) with fee transparency
- [ ] Website embed works on a real org domain (not just janagana subdomain)
- [ ] Presenter has answers for wallet, recurring, and member portal without apologizing
