# JanaGana Lite — Product Plan

**Status:** Living document (June 2026)  
**Audience:** Founders, operators, engineers  
**Pilot tenants:** Namaste Boston (`namaste-boston`), The Purple Wings (`purple-wings`)

---

## Product positioning

**JanaGana Lite** is a simple **community operating system** for small volunteer-run organizations — cultural associations, temples, school groups, clubs, and nonprofits — that today juggle Raklet, WildApricot, CiviCRM, Google Sheets, WhatsApp, Stripe links, and manual email.

It is **not** another generic event-ticketing app. It is **not** a CiviCRM clone. It is an opinionated, workflow-first hub where a board member can answer: *"What does our organization need to do today?"*

| Compared to… | JanaGana Lite |
|--------------|---------------|
| CiviCRM | Simpler data model, fewer screens, no consultant required |
| HubSpot | Community-focused language, not sales pipeline jargon |
| Zeffy | Broader ops (members, events, volunteers), not donations-only |
| Hi.Events | Full org context, not events in isolation |
| Raklet | Your website stays yours; portal handles transactions |
| Google Sheets | Structured contacts, payments, and audit trail |

**First pilot:** ICON / Indian community association style organizations (NB, TPW). **Later:** other small nonprofits and cultural groups.

**Revenue philosophy (MVP):** JanaGana platform fee is **0 bps** on transactions. Processor (Stripe) fees are separate and disclosed. Future revenue may come from setup help, premium features, hosting, support, templates, AI automation, or annual SaaS — not from complicating the MVP.

---

## Target users

### Primary — Volunteer admin / board operator

- Runs membership renewals, event registration, donor follow-up
- Non-technical; needs clear labels ("Families," "Members," not "CRM entities")
- Works 2–5 hours/week; wants a single dashboard

### Secondary — Public visitor / member

- Registers for events, joins membership, donates (future)
- Never sees Clerk or generic SaaS chrome unless linked to portal

### Tertiary — Platform operator (founder / integrator)

- Onboards tenants, wires website CTAs, imports legacy data
- Uses ops scripts and existing NB/TPW integration paths

---

## MVP modules

| # | Module | Status (repo) | Notes |
|---|--------|---------------|-------|
| 1 | Organization / tenant setup | **Live** | Clerk org ↔ Tenant; settings page |
| 2 | Contacts | **Live** | `/dashboard/members`; import, filters, CRM notes |
| 3 | Households / families | **Planned** | Schema TBD; placeholder nav |
| 4 | Membership plans | **Live** | Tiers on `/dashboard/tiers` |
| 5 | Membership purchases / renewals | **Partial** | Renewals desk + reminder queue; checkout polish remains |
| 6 | Events | **Live** | Publish, register, check-in statuses |
| 7 | Ticket types & registration | **Live** | `EventTicketType`, quantity-aware |
| 8 | Donations | **Planned** | `PaymentPurpose.DONATION` in ledger only |
| 9 | Sponsors | **Planned** | Placeholder |
| 10 | Volunteers | **Planned** | `ContactType.VOLUNTEER` exists; no workflows |
| 11 | Payments / receipts | **Partial** | `PaymentRecord`, receipts, Stripe webhooks |
| 12 | Communications outbox | **Partial** | `CommunicationMessage` queued; no admin UI |
| 13 | Admin dashboard | **Live** | Community OS dashboard (this slice) |
| 14 | Public pages | **Live** | `/portal/{slug}` — events, contact, interest |

---

## Data model overview

Multi-tenant PostgreSQL via Prisma. **Invariant:** one `Tenant` ↔ one Clerk organization; `Contact` is never a Clerk user.

```
Tenant
├── Contact (person: member, registrant, donor, volunteer, lead)
├── MembershipTier → Membership (enrollment + status + expiry)
├── Event → EventTicketType → EventRegistration
├── PaymentRecord → PaymentReceipt
├── CommunicationMessage (outbox)
└── AuditLog
```

**Not yet modeled:** `Household`, `Sponsor`, `VolunteerShift`, `Committee`, `Pledge`.

**Payment boundaries:**

- All money flows through `PaymentRecord` with `purpose`: MEMBERSHIP | EVENT | DONATION | OTHER
- Stripe for card flows where implemented; offline/cash/check supported
- Receipts issued via `PaymentReceipt`; communications queued on key events
- Refunds, payouts, and donor-covered fees → deferred ([PARKING-LOT.md](./PARKING-LOT.md))

---

## Admin workflows

Every screen should answer: *"What does a volunteer admin need to do today?"*

| Workflow | Today | Target |
|----------|-------|--------|
| See org health at a glance | Community OS dashboard | ✓ this slice |
| Import legacy contacts | Spreadsheet import on Contacts | ✓ |
| Publish event + share link | Events → portal register URL | ✓ |
| Enroll member + record dues | Memberships tab | ✓ partial |
| Follow up on non-renewals | — | Slice 2 |
| Record donation + receipt | Ledger only | Slice 3 |
| Assign volunteer to event | — | Slice 4 |
| Send renewal reminder | Outbox schema only | Slice 5 |

---

## Public workflows

| Path | Purpose |
|------|---------|
| `/portal/{slug}` | Community home |
| `/portal/{slug}/events` | Event list |
| `/portal/{slug}/register/{eventSlug}` | Event registration |
| `/portal/{slug}/interest/{type}` | Lead capture (newsletter, class interest) |
| Membership checkout | Partial (public membership actions exist) |
| Donation page | Not built |

Visitors resolve tenant by **slug only** — no dashboard cookies on public paths ([07-ARCHITECTURE.md](./07-ARCHITECTURE.md)).

---

## Intentionally out of scope (MVP)

- Full CiviCRM feature parity (cases, grants, complex ACLs)
- Website builder / CMS replacement
- Email marketing campaigns (Mailchimp replacement)
- Social feed / member directory with profiles
- AI assistant (optional later; data model first)
- Self-serve billing / SaaS plans (pilot is manual onboarding)
- Custom portal domains (embed + `returnTo` for now)
- Committees/teams as first-class entities
- Destructive data migrations without explicit approval

---

## Long-term vision (post-MVP)

Volunteer admin asks natural questions backed by solid data:

- Who has not renewed?
- Who attended last year's event but not this year's?
- Which sponsors should we follow up with?
- Which families have children/volunteers?
- Who paid, who pledged, who needs a receipt?

AI is optional until core workflows and data are trustworthy.

---

## Related docs

- [JANAGANA_LITE_MVP_ROADMAP.md](./JANAGANA_LITE_MVP_ROADMAP.md) — phased build plan
- [07-ARCHITECTURE.md](./07-ARCHITECTURE.md) — technical boundaries
- [10-CODE-LAYOUT.md](./10-CODE-LAYOUT.md) — where code lives
- [14-PRODUCT-SHOWCASE.md](./14-PRODUCT-SHOWCASE.md) — GTM and demo script
