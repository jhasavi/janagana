# Clerk Auth, Organization, and Tenant Contract

## Core contract

- Clerk handles user authentication and organization membership.
- Tenant is the application record mapped 1:1 to Clerk organization.
- Tenant.clerkOrgId must be unique.
- Tenant.slug must be unique.

## Admin flow

1. User signs in with Clerk.
2. App reads the user's Clerk organization memberships.
3. User selects an active JanaGana tenant mapped to one of those Clerk organizations.
4. App stores the selected tenant in `JG_ACTIVE_TENANT_ID`.
5. Every dashboard request re-validates that selected tenant against current Clerk memberships.
6. If no Tenant exists for a Clerk org, onboarding creates or maps it explicitly.

## Public flow

- Public portal resolves tenant by URL slug only.
- Public registration creates or updates Contact plus EventRegistration only.
- Public registration must never create a Clerk organization.

## Environment alignment

- Dev Clerk keys must map to dev DB tenant records.
- Prod Clerk keys must map to prod DB tenant records.
- Do not mix dev Clerk with prod DB or prod Clerk with dev DB.

## Deletion and drift

- Clerk `organization.deleted` webhooks suspend matching JanaGana tenants.
- If a webhook is missed, use `/api/ops/clerk-tenant-reconciliation` with the ops token to dry-run and then suspend active tenants whose Clerk org no longer exists.
- Local/e2e seed tenants may use placeholder `e2e_*` Clerk org IDs; they are not real Clerk organizations.

## Testing rule

- Real Clerk tests must run without synthetic auth flags.
- Synthetic tests must never be presented as real Clerk proof.
