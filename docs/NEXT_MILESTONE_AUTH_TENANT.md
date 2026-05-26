# Next Milestone Plan: Auth and Tenant Guardrails

This document is a plan only. Do not implement from this file until foundation approval.

## Scope for next milestone

1. Clerk environment setup
- Configure Clerk development keys in local .env.local.
- Verify Clerk publishable and secret key mode alignment.
- Confirm sign-in/sign-up URL settings.

2. Tenant mapping
- Enforce Tenant to Clerk organization 1:1 mapping.
- Resolve dashboard tenant context from Clerk orgId only.
- Keep URL slug as the source for public portal tenant resolution.

3. Real Clerk smoke
- Add a dedicated real Clerk smoke command/config.
- Validate sign-in, org selection, dashboard access, and sign-out.
- Keep real Clerk smoke separate from synthetic tests.

4. Synthetic auth tests
- Add explicit synthetic auth state-machine tests.
- Label synthetic tests clearly and never present them as real Clerk proof.

5. Select organization
- Implement select organization flow for users with multiple org memberships.
- Handle no-org, single-org, and multi-org cases predictably.

6. Sign out
- Implement sign-out endpoint and page behavior.
- Clear app cache cookies and return user to sign-in route.

7. Dashboard tenant guard
- Protect dashboard routes with validated Clerk session and org context.
- Redirect cleanly when tenant mapping is missing.

## Safety constraints for next milestone

- Do not add Stripe in this milestone.
- Do not add CRM, fundraising, donations, volunteering, communications, analytics, plugins, or advanced dashboards.
- Do not modify old project directories.

## Explicit env instruction

Do not copy old .env wholesale.
Create a new .env.local manually from .env.example only after foundation tests pass.
