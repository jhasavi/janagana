# Product showcase & go-to-market (internal)

**Audience:** Founders, operators, demo presenters.  
**Goal:** Replace Raklet for diaspora/community orgs while borrowing the best of Zeffy (transparent fees), Eventbrite (events), and Mailchimp-lite (lists) — without building a bloated suite.

> **Canonical demo runbook:** [JANAGANA_LITE_PILOT_DEMO_V1.md](./JANAGANA_LITE_PILOT_DEMO_V1.md) — 15-minute script, URLs, test data, go/no-go checklist, and `npm run verify:pilot-demo`.

---

## Positioning (one paragraph)

**JanaGana** is the operator hub and visitor transaction layer for community organizations that already have a website. Your brand stays on `thepurplewings.org`; JanaGana runs contacts, events, memberships, and payments behind the scenes. Operators sign in once at the platform dashboard; visitors never see Clerk or a generic SaaS chrome unless you link them to the portal.

**Not:** a website builder, email marketing platform, or social network.  
**Is:** Raklet-class **members + events + leads + dues** with honest pricing and tenant isolation.

---

## Why communities switch from Raklet

| Pain (Raklet) | JanaGana answer (pilot) |
|---------------|-------------------------|
| Everything feels like one locked ecosystem | Marketing site stays yours; portal/embed for transactions |
| Opaque fees on donations/dues | Platform fee 0 bps pilot; Stripe fees disclosed (Zeffy-style path later) |
| Weak multi-org / chapter story | Clerk org + tenant slug; NB + TPW proven |
| Export hostage | CSV export + **dashboard import** (Raklet/generic/class roster) |
| Generic portal URL | Branded portal header + `returnTo` + embed API |

---

## Demo script and checklist

See **[JANAGANA_LITE_PILOT_DEMO_V1.md](./JANAGANA_LITE_PILOT_DEMO_V1.md)** for the exact 15-minute script, URLs, test data, limitations, and go/no-go checklist.

Automated gate: `npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com`

---

## Tenant deployment (simplified)

1. **Platform:** Clerk org + `Tenant` row + operators invited.
2. **Data:** Dashboard → Contacts → **Import spreadsheet** (Raklet export or Excel saved as .xlsx).
3. **Brand:** Settings → logo, tagline, portal links.
4. **Website:** Developer wires CTAs ([13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md)).
5. **Verify:** One incognito lead + one registration.

NB CRM still supports live sync via `npm run import:nb-crm` when Supabase is the source of truth.

---

## Product phases (sell in order)

| Phase | Sell | Build |
|-------|------|-------|
| **Now** | “Your website + our CRM/events/membership backend” | Portal, dashboard import, embed API |
| **Next** | “Raklet replacement for dues + events” | Donations, renewal reminders, richer membership |
| **Later** | “Zeffy-grade transparency” | Optional donor covers processing fee |
| **Scale** | “Chapters on one platform” | Self-serve onboarding, billing, custom portal domain |

---

## Competitive steals (explicit)

- **Zeffy:** Show fees; optional payer contribution — never hide Stripe in membership checkout copy.
- **Eventbrite:** Simple publish → share link → attendee list → check-in (no overbuilt discovery).
- **Mailchimp:** One list per intent (newsletter vs class interest) via `interestType`, not 50 audiences.
- **Raklet:** Single admin dashboard — but **without** forcing the public site into their template.

---

## Related

- [13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md)
- [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md)
- [PARKING-LOT.md](./PARKING-LOT.md)
