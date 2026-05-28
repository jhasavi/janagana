# V3 Foundation Scope

This document defines the approved scope for JanaGana v3 in `~/janagana`.

## In scope (implemented)

- Clerk login and sign-out
- Tenant mapped to Clerk organization (1:1)
- Onboarding: create organization + map existing Clerk org
- Select organization flow (multi-tenant)
- Dashboard with tenant-scoped counts
- Contacts & leads: create + list + update (dashboard shows contacts, registrations, formal memberships separately)
- Membership tiers: create + list
- Events: create + list + registration management (cancel / re-confirm)
- Public portal per tenant slug: home, events, registration, contact, interest aliases
- Tenant isolation (contacts, tiers, events, registrations)
- Invariant: public registration never creates a Clerk organization

## Deferred (not in v3 foundation)

- Stripe and all payments/billing work
- Full CRM (deals, pipelines, activities)
- Membership enrollment UI (`Membership` model exists; dashboard shows formal count as 0 until enroll flow exists)

## People semantics (pilot)

| Term | Definition |
|------|------------|
| Contact | Any person captured for a tenant (registration, inquiry, manual) |
| Lead / inquiry | Contact from portal contact form (`type` OTHER) |
| Event registrant | Contact with event registration (`type` REGISTRANT after signup) |
| Formal member | Row in `Membership` table (enrollment deferred) |
- Donations, fundraising, volunteering
- Communications and automation
- Analytics and reporting
- Plugins and external public API
- Embeddable events widget (v3.1)

## Delivery rule

If a feature is not listed in the in-scope section, it is deferred by default.

See also: `docs/PRE_LAUNCH_CHECKLIST.md` for go-live readiness.
