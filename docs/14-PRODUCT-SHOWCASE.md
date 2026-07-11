# Product showcase & demo runbook

**Audience:** Founders, operators, demo presenters.  
**Production:** https://janagana.namasteneedham.com  
**Default demo tenant:** `purple-wings` · **Alternate:** `namaste-boston`  
**Competitive backlog:** [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md)

---

## Positioning

**JanaGana** is the operator hub and visitor transaction layer for community organizations that already have a website. Your brand stays on `thepurplewings.org`; JanaGana runs contacts, events, memberships, donations, and payments behind the scenes.

**Not:** a website builder, email marketing platform, or social network.  
**Is:** Raklet-class **members + events + leads + dues + donations** with honest pricing and tenant isolation.

| Pain (Raklet) | JanaGana answer |
|---------------|-----------------|
| Locked ecosystem | Marketing site stays yours; portal/embed for transactions |
| Opaque fees | Platform fee 0 bps; Stripe fees disclosed; optional payer covers fee |
| Weak multi-org story | Clerk org + tenant slug; NB + TPW proven |
| Export hostage | CSV export + dashboard import (Raklet/generic roster) |
| Generic portal URL | Branded portal header + `returnTo` + embed API |

---

## What is production-ready

| Area | Where |
|------|-------|
| Clerk sign-in + tenant scoping | `/dashboard` |
| Contact import (CSV/Excel) + Raklet parsing | `/dashboard/members/import` |
| Contacts CRM (filters, tags, export) | `/dashboard/members` |
| Membership tiers + renewals desk | `/dashboard/tiers`, `/dashboard/memberships/renewals` |
| Events + registrations + paid Stripe checkout | `/dashboard/events` |
| Donations (portal + admin) | `/portal/{slug}/donate`, `/dashboard/donations` |
| Payments ledger | `/dashboard/payments` |
| Public portal (events, contact, join with tier comparison) | `/portal/{slug}/…` |
| Embed events API | `/api/embed/events` |
| Communications outbox (queue + Resend + retry UI) | `/dashboard/communications` |
| Failed-payment / dunning visibility on renewals | `/dashboard/memberships/renewals` |
| Contact activity timeline (single chronology) | `/dashboard/members/{contactId}` |
| Printable receipts + year-end giving summary CSV | `/dashboard/payments/receipts/{receiptId}`, `/api/export/giving-summary` |

Automated gate: `npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com`

---

## 15-minute demo script

**Prep:** `npm run seed:joinit-demo -- --confirm-joinit-demo` (or sign in as operator on `purple-wings` with real data). Have one CSV ready (Raklet export or `fixtures/contact-import-raklet-sample.csv`). Incognito window ready. Open the battlecard ([18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md)) on a second screen for objection handling.

| Min | Story | Do this | Beats |
|-----|-------|---------|-------|
| **0–1** | Operator hub | `/dashboard` — priority queue, quick actions | "One dashboard, not three tools" |
| **1–4** | Migration | `/dashboard/members/import` → Raklet export → Preview → Import → filter **Raklet import** | Join It has no migration story like this |
| **4–6** | Contacts CRM + timeline | Open one contact profile → scroll to **Activity timeline** (imports, payments, memberships, comms in one chronology) | Join It splits this across tabs |
| **6–8** | Membership attention + dunning | `/dashboard/memberships/renewals` — expiring/expired buckets, then filter **Payment failed** to show the dunning banner | Join It has no visible payment-failure queue |
| **8–10** | Public join flow | Incognito: `/portal/purple-wings/join` — side-by-side tier comparison cards, select a tier, show the fee-transparency line | Zeffy hides tiers behind generic donate; we show comparison up front |
| **10–11** | Event workflow | `/dashboard/events` — published event → copy register link | Paid Stripe checkout in one step, no PENDING_PAYMENT limbo |
| **11–12** | Money trail + receipt | `/dashboard/payments` — ledger row → open a receipt → show print/save-as-PDF view | Zeffy tax-letter parity, no new dependency |
| **12–13** | Communications outbox | `/dashboard/communications` — queued/sent/failed, retry a failed send | Join It has no visible send log |
| **13–14** | Year-end donor trust | `/dashboard/donations` → **Year-end giving summary (CSV)** | One-click donor tax summary |
| **14–15** | Close + roadmap honesty | State the two "not yet" items plainly (self-service login, households) from the battlecard — sequencing, not gaps | Confidence, not apology |

**Optional +2 min:** Switch to `namaste-boston` for multi-tenant isolation.

**Do not show:** CLI-only imports, localhost, placeholder Families page.

---

## Key URLs

Base: `https://janagana.namasteneedham.com`

| Operator | URL |
|----------|-----|
| Dashboard | `/dashboard` |
| Import | `/dashboard/members/import` |
| Renewals | `/dashboard/memberships/renewals` |
| Donations | `/dashboard/donations` |
| Settings | `/dashboard/settings` |

| Public (incognito) | URL |
|--------------------|-----|
| Portal home | `/portal/purple-wings` |
| Join | `/portal/purple-wings/join` |
| Donate | `/portal/purple-wings/donate` |
| Register | `/portal/purple-wings/register/{eventSlug}` |

| Operator (new in this pass) | URL |
|------------------------------|-----|
| Communications outbox | `/dashboard/communications` |
| Renewals — payment failed filter | `/dashboard/memberships/renewals?filter=payment_failed` |
| Receipt (printable) | `/dashboard/payments/receipts/{receiptId}` |
| Year-end giving summary export | `/api/export/giving-summary?year=2026` |

---

## Go / no-go checklist

```bash
npm run verify:pilot-demo
npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com
```

- [ ] `verify:pilot-demo` passes against production
- [ ] Signed-in import works with your real CSV
- [ ] At least one published event OR honest skip in script
- [ ] Incognito portal loads (no 500)
- [ ] No raw 500 on any demo click path

**No-go if:** import 500s, import page 404s, or migration story fails with your CSV shape.

---

## Known limitations (do not over-promise)

1. Import max 5 MB / 2,500 rows; Raklet membership columns in metadata only (not auto-enrolled).
2. No authenticated member self-service portal yet — operators manage every contact from the dashboard today; self-service login is the next major build (deliberately sequenced, see battlecard).
3. No households / group membership yet — deferred rather than rushed in before a demo; next sprint candidate.
4. No member directory or Apple/Google Wallet passes yet (explicit Phase 2 roadmap items).
5. NB live CRM sync is CLI (`npm run import:nb-crm`), not dashboard upload.

---

## Tenant deployment

1. Clerk org + `Tenant` row + operators invited.
2. Dashboard → Contacts → **Import spreadsheet**.
3. Settings → logo, tagline, portal links.
4. Website CTAs per [13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md).
5. Verify one incognito lead + one registration.

---

## Related

- [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) — weekly operator routine
- [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) — TPW sign-off
- [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md) — competitive demo backlog
- [07-ARCHITECTURE.md](./07-ARCHITECTURE.md) — deferred scope
