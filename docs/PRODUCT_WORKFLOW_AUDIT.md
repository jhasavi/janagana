# Product Workflow Audit

## Milestone audited

Second-tenant hardening after registration operations.

## Included in this milestone

- Purple Wings workflow remains intact with no data reset.
- Dashboard header includes switch link to `/select-organization`.
- Select organization flow supports multi-tenant selection and sets active tenant cookie.
- Single-tenant select flow redirects directly to dashboard and sets active tenant cookie.
- Active tenant cookie remains cache-only and validated against mapped Clerk memberships.
- Registration operations (capacity, duplicate handling, cancel/re-confirm) remain tenant-scoped.
- New second-tenant isolation script verifies two-tenant portal/registration isolation behavior.

## Excluded by design

- CRM, fundraising, donations, volunteering, communications, analytics.
- Stripe integration, billing, payments, and related webhooks.
- NB/TPW website integrations.
- Deployment/push automation.

## Guardrails validated

- Tenant context resolution always derives from Clerk org membership mapping.
- Cookie tenant IDs not in mapped memberships are ignored as stale.
- Public portal registrations do not create Clerk users/orgs.
- Cross-tenant registration leakage checks pass in script coverage.

## Known blocker

- Namaste Boston final live onboarding proof is blocked until a Namaste Clerk organization is explicitly created by owner onboarding in the current Clerk environment.

## Next planned milestone (not included here)

- Website link integration milestone for NB/TPW once both organizations are fully mapped in Clerk and validated in JanaGana.
