# JanaGana v3 Rebuild Plan

## A. Why rebuild

The old project accumulated architecture drift, mixed auth behavior, and feature sprawl before proving the first core workflow. v3 resets to a controlled, testable, minimal foundation.

## B. What to keep from old project

- High-level route concepts for auth, dashboard, and portal.
- Basic infrastructure patterns (Next App Router, Prisma singleton, env checks).
- Useful domain language for tenant, contacts, events, and registrations.

## C. What to avoid from old project

- Mixed real-auth and test-auth logic in shared middleware.
- Fuzzy tenant resolution and cookie-as-truth patterns.
- Dashboard feature-card sprawl and non-working CTAs.
- Broad modules before core workflow proof.

## D. v3 architecture

- Real Clerk auth for admin paths.
- Tenant mapped 1:1 to Clerk organization.
- Public portal by tenant slug.
- Public registration creates Contact and EventRegistration only.

## E. v3 database model

Foundation models only:
- Tenant
- TenantAdmin
- Contact
- MembershipTier
- Membership
- Event
- EventRegistration
- AuditLog

## F. v3 route map

- Auth: /sign-in, /sign-up, /select-organization, /onboarding/create-organization
- Dashboard: /dashboard, /dashboard/members, /dashboard/tiers, /dashboard/events, /dashboard/settings
- Portal: /portal/[tenantSlug], /portal/[tenantSlug]/events, /portal/[tenantSlug]/events/[eventSlug], /portal/[tenantSlug]/register/[eventSlug]
- API: /api/active-org, /api/sign-out

## G. v3 test strategy

- Foundation smoke tests first.
- Env contract checks before app tests.
- Real Clerk smoke separate from synthetic tests.
- Gate promotion only after foundation checks pass.

## H. 7-day implementation plan

1. Day 1: Foundation scaffold, docs, schema, placeholder routes, env scripts.
2. Day 2: Org selection and tenant mapping hardening.
3. Day 3: Members and tiers minimal flows.
4. Day 4: Events and public portal listing.
5. Day 5: Public registration and tenant isolation checks.
6. Day 6: First workflow polish and release gate dry run.
7. Day 7: Foundation review sign-off.

## I. First demo scope

- Clerk login
- Tenant to Clerk org mapping
- Select organization
- Simple dashboard
- Contacts or members
- Membership tiers
- Events
- Public portal
- Event registration
- Tenant isolation
- No accidental Clerk org creation

## J. Deferred features

- CRM and deals
- Donations and fundraising
- Volunteering and communications
- Analytics and plugin platform
- Advanced Stripe billing and marketplace features
- Complex website integration beyond link-based phase
