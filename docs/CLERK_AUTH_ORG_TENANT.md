# Clerk Auth, Organization, and Tenant Contract

## Core contract

- Clerk handles user authentication and organization membership.
- Tenant is the application record mapped 1:1 to Clerk organization.
- Tenant.clerkOrgId must be unique.
- Tenant.slug must be unique.

## Admin flow

1. User signs in with Clerk.
2. User selects active Clerk organization.
3. App resolves Tenant by clerkOrgId.
4. If no Tenant exists for active Clerk org, onboarding creates it explicitly.

## Public flow

- Public portal resolves tenant by URL slug only.
- Public registration creates or updates Contact plus EventRegistration only.
- Public registration must never create a Clerk organization.

## Environment alignment

- Dev Clerk keys must map to dev DB tenant records.
- Prod Clerk keys must map to prod DB tenant records.
- Do not mix dev Clerk with prod DB or prod Clerk with dev DB.

## Testing rule

- Real Clerk tests must run without synthetic auth flags.
- Synthetic tests must never be presented as real Clerk proof.
