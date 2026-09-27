# JanaGana Lite — Pilot Demo v1

**Audience:** Founders, demo presenters, first pilot organizations.
**Production:** https://janagana.namasteneedham.com
**Default demo tenant:** `purple-wings`
**Scope rule for this milestone:** no new modules. One complete, polished admin workflow: **import → CRM → segment → export → renewals → events → donations/P2P → payments**. See [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md) for the older competitive feature backlog — that plan is now secondary to this one.

---

## 15-minute demo script

**Prep:** sign in as operator on `purple-wings` (or run `npm run seed:joinit-demo -- --confirm-joinit-demo` locally). Have one CSV ready (`fixtures/contact-import-raklet-sample.csv`). Open an incognito window for the visitor-facing steps.

| Min | Story | Do this | URL |
|-----|-------|---------|-----|
| 0–1 | Operator hub | Open the dashboard, orient on nav | `/dashboard` |
| 1–4 | Migration | Import → preview → import Raklet CSV → see the success banner (created/updated/skipped) | `/dashboard/members/import` |
| 4–7 | CRM usability | Filter chips (All, Members, Leads, Imported, Raklet, No email, Recent activity) → search a name → open one contact, scroll through import record, tags, activity, memberships, donations, events | `/dashboard/members` |
| 7–8 | Segmented export | Apply a filter (e.g. lifecycle stage + membership status) → **Export CSV** → open the file, show it matches the filter | `/dashboard/members` |
| 8–9 | Renewals desk | Expiring/expired buckets, payment-failed filter | `/dashboard/memberships/renewals` |
| 9–10 | Events | One published event, copy the register link | `/dashboard/events` |
| 10–12 | Donations + P2P fundraising | Show a donation on the ledger, then open a published campaign, then a supporter's fundraising page with its own progress bar | `/dashboard/donations`, `/portal/purple-wings/campaigns` |
| 12–13 | Campaign admin view | Open the campaign detail page: total raised, direct-vs-P2P split, fundraiser leaderboard | `/dashboard/campaigns/{id}` |
| 13–14 | Money trail | Payments ledger, one receipt | `/dashboard/payments` |
| 14–15 | Close | State plainly: 100% free, no pricing page, own Stripe account | — |

**Do not show:** CLI-only imports, localhost, Apple/Google Wallet (untested against real credentials).

---

## Exact URLs

Base: `https://janagana.namasteneedham.com` (swap in for local: `http://localhost:3020`)

| Operator (signed in) | URL |
|---|---|
| Dashboard | `/dashboard` |
| Import | `/dashboard/members/import` |
| Contacts CRM | `/dashboard/members` |
| Contact detail | `/dashboard/members/{contactId}` |
| Filtered export | `/api/export/contacts?preset=recent&lifecycleStage=ENGAGED&membershipStatus=ACTIVE` |
| Renewals desk | `/dashboard/memberships/renewals` |
| Events | `/dashboard/events` |
| Donations | `/dashboard/donations` |
| Campaigns (list + create) | `/dashboard/campaigns` |
| Campaign detail + leaderboard | `/dashboard/campaigns/{campaignId}` |
| Payments ledger | `/dashboard/payments` |
| Settings | `/dashboard/settings` |

| Public / visitor (incognito) | URL |
|---|---|
| Portal home | `/portal/purple-wings` |
| Join | `/portal/purple-wings/join` |
| Donate | `/portal/purple-wings/donate` |
| Campaigns list | `/portal/purple-wings/campaigns` |
| Campaign page | `/portal/purple-wings/campaigns/{campaignSlug}` |
| Fundraiser page | `/portal/purple-wings/fundraise/{fundraiserSlug}` |
| Start a fundraiser (self-serve) | `/portal/purple-wings/fundraise/new` |
| Register for event | `/portal/purple-wings/register/{eventSlug}` |
| Embed events widget | `/api/embed/events?tenantSlug=purple-wings` |

---

## Sample data needed

- At least one CSV to import live: `fixtures/contact-import-raklet-sample.csv` (Raklet-shaped) or the org's own export.
- 20+ contacts with a mix of: has-email / no-email, tagged / untagged, at least one `ACTIVE` and one `EXPIRED` membership, at least one lifecycle stage other than `NEW`.
- One published `Event`.
- One published `Campaign` with a goal, and at least one `PeerFundraiser` under it with a `PAID` donation (see prior session's manual verification steps, or use `npm run seed:joinit-demo -- --confirm-joinit-demo` and create a campaign by hand in `/dashboard/campaigns`).
- One completed donation and one completed membership payment so the payments ledger and receipts aren't empty.

---

## What is production-ready

| Area | Where | Notes |
|---|---|---|
| Contact import (CSV/Excel, Raklet + generic) | `/dashboard/members/import` | Preview + commit, visible created/updated/skipped counts |
| Contacts CRM: DB-backed pagination, search, filters | `/dashboard/members` | Search and filters run at the DB level — not limited to the first fetched page |
| Contact detail: import record, tags, activity, memberships, donations, events | `/dashboard/members/{contactId}` | Now includes external source/ID, imported-at, and original import fields |
| Segmented CSV export (source, tag, lifecycle stage, membership status, search) | `/dashboard/members` → Export CSV | Filters and export share one schema — export always matches what's on screen; not row-capped; tenant-scoped |
| Membership tiers + renewals desk + dunning | `/dashboard/tiers`, `/dashboard/memberships/renewals` | |
| Events + registration + paid Stripe checkout | `/dashboard/events` | |
| Donations (one-time + recurring) | `/portal/{slug}/donate`, `/dashboard/donations` | |
| Peer-to-peer fundraising | `/portal/{slug}/campaigns`, `/portal/{slug}/fundraise/{slug}` | Self-serve fundraiser creation, live rollup totals |
| Campaign admin detail + fundraiser leaderboard | `/dashboard/campaigns/{id}` | Direct-vs-P2P split, publish/archive |
| Payments ledger + printable receipts + year-end giving summary | `/dashboard/payments` | |
| 100% free — no paid tier, no pricing page | site-wide | Removed this milestone |
| Public portal (join, donate, events, campaigns, directory) | `/portal/{slug}/…` | |
| Embed events API | `/api/embed/events` | |

## What is demo-only

- Seed/demo data script (`npm run seed:joinit-demo`) — not a real-organization onboarding flow.
- Campaign/fundraiser CSV export and embed-link copy button on the admin detail page — functional, but not yet used by a real pilot org.
- Digital membership card QR + Apple/Google Wallet — code-complete, gated on the tenant's own Apple/Google credentials, never exercised against real ones.

## What is not built

- No milestone/thank-you emails for P2P donors or fundraisers.
- No fundraiser self-edit after creation (title/story/goal are fixed once created).
- No saved export segments (a filter must be re-applied each time, not named/stored).
- No Mailchimp/Zapier integrations.
- No hosted website/site builder (intentional — JanaGana embeds into an existing site).

---

## Go / no-go checklist

```bash
npm run verify:pilot-demo
```

- [ ] `verify:pilot-demo` passes against the target base URL
- [ ] Signed-in CSV import works with the org's real export shape
- [ ] At least one published event exists, or honestly skip that step
- [ ] At least one published campaign with one fundraiser and one paid donation exists
- [ ] Filtered export produces a CSV matching the on-screen filter
- [ ] Incognito portal loads with no 500 (home, donate, campaigns, join)
- [ ] No raw 500 on any step of the demo path above

**No-go if:** import 500s, import page 404s, the org's CSV shape isn't handled, or the campaign/fundraiser flow can't be shown end to end.

---

## Related

- [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) — prior demo runbook (pre-P2P, pre-free-pricing; being superseded by this doc)
- [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md) — competitive feature backlog
- [17-REFERRAL-PROGRAM.md](./17-REFERRAL-PROGRAM.md) — ambassador/referral program design
