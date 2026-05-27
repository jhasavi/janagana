# Product Workflow Audit

## Milestone audited

Members + Membership Tiers + Events minimal CRUD behind existing auth + tenant guard.

## Included in this milestone

- Dashboard overview shows tenant name and real counts for contacts, tiers, and events.
- Members page supports create and list for tenant-scoped contacts.
- Membership tiers page supports create and list for tenant-scoped tiers.
- Events page supports create and list for tenant-scoped events.
- All create flows resolve tenant context server-side.
- Action payload schemas are strict and reject unexpected keys, including tenantId injection.
- Tenant isolation verification script confirms cross-tenant non-visibility for contacts, tiers, and events.

## Excluded by design

- Public portal registration workflow.
- Event registration and attendee checkout.
- Stripe integration, billing, payments, and related webhooks.
- CRM, fundraising, and non-core modules.

## Guardrails validated

- No client-provided tenantId is used for create/list flows.
- Legacy "new" routes now redirect to safe list/create pages.
- Isolation script includes empty-tenant checks.
- Local demo seed uses explicit confirmation flag and makes no Clerk API calls.

## Known blocker

- Real Clerk smoke remains potentially pending when test identity flow is blocked by external SSO redirect behavior.

## Next planned milestone (not included here)

- Public portal registration flow, while preserving invariant that public registration must never create Clerk organizations.
- Stripe remains deferred until after portal registration scope is stable.
