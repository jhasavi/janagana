# Architecture (pilot boundaries)

## Two paths

```
Public visitor → /portal/{slug} → getTenantBySlug → contacts/registrations
Admin operator → Clerk → mapped tenants → cookie preference → dashboard
```

Do not pass dashboard cookies into public portal resolution.

**Tenant websites** link or embed portal URLs (and optionally `GET /api/embed/events`); operators never put the dashboard on a tenant domain. See [13-TENANT-WEBSITE-INTEGRATION.md](./13-TENANT-WEBSITE-INTEGRATION.md).

## Data ownership

- **Contact** — visitor/registrant; never a Clerk user.
- **Tenant** — 1:1 with Clerk org (`clerkOrgId`).
- **TenantAdmin** — cache only; Clerk membership is access source of truth.

## Platform surfaces

**Live:** Admin membership tiers and enrollments; renewals desk with failed-payment/dunning visibility; Stripe subscriptions (`autoRenew`); renewal reminder job; public join (side-by-side tier comparison)/donate/event checkout; donor-covered processing fee toggle; digital membership card + verify API; contact CRM (edit, type/role, tags, filters, export, unified activity timeline); payments ledger; printable receipts + year-end giving summary export; communications admin UI (outbox with retry); transactional communication outbox (queue + Resend delivery); event registration with paid Stripe checkout; contact import; embed API; authenticated member self-service portal (magic-link sign-in, profile edit, renew, activity timeline at `/portal/{slug}/account`).

**Deferred (post-pilot):** CRM pipeline automation; refunds UI; payout reporting; households / group membership; member directory; custom contact fields; Apple/Google Wallet passes; campaigns; analytics.

Payment policy: JanaGana platform fee is **0 bps**. Stripe processor fees are disclosed; optional payer contribution is built on donate, join, and paid events.

## Parking lot (explicit deferrals)

Do not expand until NB/TPW pilot sign-off unless listed in [18-JOIN-IT-ZEFFY-DEMO-PLAN.md](./18-JOIN-IT-ZEFFY-DEMO-PLAN.md).

### Contact roles (staff, volunteer, guest, director, vendor)

**Today:** Every person is a **Contact** per tenant. Operators assign `type` (Lead, Member, Volunteer, Donor, or Event registrant) at creation or via edit, filter by it on the Contacts list, plus `interestType` / `source` and freeform `tags` (`staff`, `vendor`, …).

**Later:** Operator-side permission levels (e.g. a restricted "volunteer coordinator" login) and first-class role permissions — distinct from formal **Membership** (tiers, Stripe, renewals) and from the Contact `type` field above.

### Other deferred modules

- Families / households (`/dashboard/families` placeholder)
- Volunteers, sponsors dedicated dashboard modules (placeholders — volunteers/donors are usable today as Contact types, see above)
- Custom portal domains, full dark mode, self-serve onboarding polish

## Product workflow principles

- Tenant-scoped queries on every admin mutation (`requireActiveTenantForActions`).
- Public flows never create Clerk organizations.
- Existing-org self-mapping disabled unless `ENABLE_EXISTING_ORG_SETUP=true`.

Historical rebuild notes: see git history (`REBUILD_PLAN.md`, `V3_PRIMARY_HANDOFF.md`).
