# JanaGana Lite — Pilot Demo v1

**Status:** June 2026  
**Audience:** Founders, operators, demo presenters  
**Goal:** Prove JanaGana Lite can replace the **first layer** of Raklet / Google Sheets chaos for a community org — not full Raklet parity.

**Production:** https://janagana.namasteneedham.com  
**Demo tenant (default):** `purple-wings` (The Purple Wings)  
**Alternate tenant:** `namaste-boston` (Namaste Boston)

---

## What this demo is (and is not)

| In scope | Out of scope for v1 |
|----------|---------------------|
| Import contacts from Raklet-style or real-world CSV | Website builder |
| Contacts list, filters, provenance | Member directory / social feed |
| Membership renewals desk (attention items) | Email marketing / campaigns UI |
| One event + registration story | Online event Stripe checkout |
| Payments ledger if sample rows exist | Households, sponsors, volunteers |
| Public portal pages | Full Raklet replacement pitch |
| Multi-tenant isolation (optional 2 min) | TPW production data import via CLI |
| No raw 500 errors | Donations as a demo storyline |

**The product is not sellable yet.** This is a **credible pilot demo** for diaspora/community org operators.

---

## What is production-ready

Verified on https://janagana.namasteneedham.com (run `npm run verify:pilot-demo`):

| Area | Ready | Where |
|------|-------|-------|
| Clerk sign-in + tenant scoping | Yes | `/dashboard` |
| Contact import (CSV/Excel) | Yes | `/dashboard/members/import` |
| Raklet + NB CSV header parsing | Yes | `lib/import/contact-roster.ts` |
| Contacts list + filters | Yes | `/dashboard/members` |
| Import source filters (Imported, Raklet import) | Yes | Quick filters on members page |
| Membership tiers + admin enroll | Yes | `/dashboard/tiers` |
| Renewals desk | Yes | `/dashboard/memberships/renewals` |
| Events create/publish/register/check-in | Yes | `/dashboard/events` |
| Payments ledger (read-only) | Yes | `/dashboard/payments` |
| Public portal (events, contact, join) | Yes | `/portal/{slug}/…` |
| Embed events API | Yes | `/api/embed/events` |
| Communication outbox (queue only) | Partial | Schema + queue; **no admin UI** |
| Donations portal + admin | Built | **Not part of Pilot Demo v1 storyline** |

---

## What is demo-ready only

Needs **manual setup** before showing anyone:

| Item | Requirement |
|------|-------------|
| 10–20+ contacts visible | Dashboard import or portal leads (not CLI-only for migration story) |
| Import provenance | At least one successful import with **Raklet import** or **Imported** filter |
| One published event | Operator publishes in `/dashboard/events` |
| One registration (ideal) | Incognito register → row in Events → Registrations |
| Renewals desk interest | At least one membership tier + enrollment (or explain empty state honestly) |
| Payments / receipts | Only if Stripe sample payments exist for tenant |
| Outbox | Only mention if renewal reminder was queued; do not promise email delivery without `RESEND_API_KEY` |
| Tenant branding | Logo/tagline in Settings (optional polish) |

---

## What is not built yet

Do **not** demo or promise these in Pilot Demo v1:

- Families / households
- Volunteers module
- Sponsors module
- Communications admin UI
- Bulk renewal email send
- Online event ticket Stripe checkout (paid tickets → `PENDING_PAYMENT`)
- Member self-service login portal
- Email campaigns / Mailchimp replacement
- Refunds UI
- Custom portal domains

See [PARKING-LOT.md](./PARKING-LOT.md) and [JANAGANA_LITE_MVP_ROADMAP.md](./JANAGANA_LITE_MVP_ROADMAP.md).

---

## Exact 15-minute demo script

**Prep:** Sign in as operator on `purple-wings`. Have one CSV ready (Raklet export or `fixtures/contact-import-raklet-sample.csv`). Incognito window ready.

| Min | Story | Do this |
|-----|-------|---------|
| **0–2** | Operator hub | Open `/dashboard` — signal banner, at-a-glance cards, Next Steps |
| **2–6** | Migration (Raklet/Sheets killer) | `/dashboard/members/import` → choose **Raklet export** → **Preview** → **Import now** → `/dashboard/members` → filter **Raklet import** → show source/tags |
| **6–8** | Contacts CRM | Search, channel filter, one contact profile (`/dashboard/members/{id}`) |
| **8–10** | Membership attention | `/dashboard/memberships/renewals` — expiring / expired buckets (or honest empty state) |
| **10–12** | Event workflow | `/dashboard/events` — published event → copy register link **or** show registrations list |
| **12–14** | Visitor path | Incognito: `/portal/purple-wings/events` → register (or contact form) → back to dashboard → show new row |
| **14–15** | Money trail (if data) | `/dashboard/payments` — one receipt row; mention outbox queues reminders (no blast UI yet) |

**Optional +2 min:** Switch tenant to `namaste-boston` — different counts, different portal URL (isolation).

**Do not show:** CLI import scripts, localhost, Coming Soon pages, donations desk (until post-v1), placeholder Families/Volunteers/Sponsors.

---

## Exact test data needed

| File / data | Purpose | In repo |
|-------------|---------|---------|
| Raklet-style CSV | Migration demo | `fixtures/contact-import-raklet-sample.csv` |
| NB real-world CSV | Namaste Boston shape | `fixtures/contact-import-real-world-nb.csv` |
| Minimal name/email/phone | Smoke import | `fixtures/contact-import-regression.csv` |
| Template for operators | Download link in UI | `public/templates/contact-import-template.csv` |
| 1 published event | Registration story | **Create in dashboard** before demo |
| 1+ membership tier + enrollment | Renewals desk | **Create in dashboard** or skip renewals slide |
| Optional: 1 Stripe payment | Payments slide | Real checkout or admin-recorded payment |

**Your files to validate manually (in order):**

1. `contacts_with_email_janagana_minimal.csv`
2. `contacts_with_email.csv`
3. Raklet export

Success = import completes or clean `error=` on redirect. **Never a raw 500.**

---

## Exact URLs to open

Base: `https://janagana.namasteneedham.com`

### Operator (signed in)

| Step | URL |
|------|-----|
| Dashboard | `/dashboard` |
| Import | `/dashboard/members/import` |
| Contacts | `/dashboard/members` |
| Raklet filter | `/dashboard/members?source=dashboard_raklet_import` |
| Renewals | `/dashboard/memberships/renewals` |
| Events | `/dashboard/events` |
| Payments | `/dashboard/payments` |
| Settings / portal links | `/dashboard/settings` |

### Public (incognito)

| Step | URL |
|------|-----|
| Portal home | `/portal/purple-wings` |
| Events | `/portal/purple-wings/events` |
| Register | `/portal/purple-wings/register/{eventSlug}` |
| Contact / newsletter | `/portal/purple-wings/contact?interest=newsletter` |
| Membership join | `/portal/purple-wings/join` |

### Verification

| Check | URL |
|-------|-----|
| Deploy commit | `GET /api/import/contacts` → `commit` field |
| Embed API | `/api/embed/events?tenantSlug=purple-wings&maxItems=3` |

---

## Known limitations

1. **Import** — Max 5 MB / 2,500 rows; upserts by email per tenant; Raklet membership columns stored in metadata only (not auto-enrolled).
2. **Paid event tickets** — Registration works; online Stripe checkout for events is **not** built (manual confirm flow).
3. **Renewal reminders** — Queue to outbox only; delivery needs Resend; no communications inbox UI.
4. **Donations** — Module exists but is **out of Pilot Demo v1** scope until post-import sign-off.
5. **Nav** — Coming Soon items hidden when `PILOT_HIDE_COMING_SOON_NAV` is not `false` (default: hidden).
6. **Multi-tenant** — Operators with multiple orgs must select tenant before import.
7. **NB live CRM** — Full Supabase sync is `npm run import:nb-crm` (CLI), not dashboard upload.
8. **Not sellable** — No self-serve onboarding, no SLA, no full Raklet parity.

---

## Go / no-go checklist (before showing anyone)

Run automated gate first:

```bash
npm run verify:pilot-demo
npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com
```

Then manual sign-off:

- [ ] `verify:pilot-demo` passes against production URL
- [ ] Signed-in import works with your real CSV (Preview + Import)
- [ ] `/dashboard/members` shows imported rows with correct source label
- [ ] **Raklet import** or **Imported** filter returns expected rows
- [ ] At least one published event OR honest “publish first” skip in script
- [ ] Incognito portal page loads (no 500)
- [ ] Optional: one registration appears in dashboard within 2 minutes
- [ ] No raw 500 during any click path you plan to demo
- [ ] Sidebar shows **no** “Soon” badges (pilot nav hide on)

**No-go if:** import still 500s, `/dashboard/members/import` 404s, or you cannot complete migration story with your CSV shape.

---

## Related docs

| Doc | Use |
|-----|-----|
| [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) | GTM positioning (high level) |
| [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) | TPW tenant integration (after demo v1 green) |
| [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) | Weekly operator routine |
| [08-OPS-SCRIPTS.md](./08-OPS-SCRIPTS.md) | All verification commands |
| [JANAGANA_LITE_MVP_ROADMAP.md](./JANAGANA_LITE_MVP_ROADMAP.md) | What to build **after** import confirmed |

---

## After Pilot Demo v1 is green

Build only after import is confirmed on production with real CSVs:

1. Phase 2 remainder — communications outbox admin UI, bulk renewal actions
2. Online event Stripe checkout
3. Member filters export (active vs lapsed)
4. Then Slice C households (schema migration) — **not before import sign-off**

Do **not** start donations storyline expansion, households, sponsors, or volunteers until Pilot Demo v1 checklist is green.
