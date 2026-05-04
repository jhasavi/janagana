# JanaGana Productization Plan

Date: 2026-05-03

This plan enforces a strict separation between:
- what is required for a safe second pilot, and
- what is required for full shared multi-tenant SaaS.

Context: TPW is customer-zero. Current implementation has many good tenant patterns, but it is not yet hardened for low-blast-radius onboarding of additional pilot customers on a shared runtime/database.

## A) Recommendation

Recommended next step: single codebase with separate database/project per client (for now).

Why this is the best immediate move:
- It keeps shipping velocity high by avoiding a full fork per customer.
- It removes the highest risk immediately: cross-tenant data leakage and operational coupling in one shared database.
- It keeps migration path open to true shared multi-tenant SaaS after tenant boundaries are proven in code, tests, and observability.

Why not the other two right now:
- Separate isolated instance per pilot client: safest but expensive and slows feature velocity due to operational drift.
- True shared multi-tenant SaaS now: fastest theoretically, but current code/schema surfaces still include trust-on-convention areas that should be hardened before sharing production blast radius.

Decision window:
- Use per-client DB/project through 2-3 pilots.
- Move to shared SaaS only after cross-tenant test suite + policy guardrails + operational controls are complete.

## B) Critical Blocker Breakdown

### Must fix before any second pilot

1. Tenant context in API layer
- Enforce a single tenant resolver contract for all authenticated dashboard APIs and plugin APIs.
- Eliminate ad-hoc tenant resolution variance (cookie fallback + org fallback + slug lookup in different endpoints).
- Add request-level tenant context logging (tenantId, route, auth principal, key id).

Key files:
- app/api/dashboard/crm/contacts/route.ts
- app/api/dashboard/crm/contacts/[id]/route.ts
- app/api/dashboard/crm/activities/route.ts
- app/api/plugin/events/route.ts
- app/api/plugin/event-registrations/route.ts
- lib/tenant.ts
- lib/plugin-auth.ts

2. Tenant-aware reconciliation scripts and migrations
- Guard all data repair/migration scripts with explicit tenant boundary checks and dry-run defaults.
- Require source/target tenant allowlists and mismatch detection for any script that updates references.

Key files:
- scripts/migrate-contact-first.ts
- scripts/repair-orphan-tenants.ts
- scripts/tenant-unification-dry-run.ts
- scripts/verify-tenants.ts

3. Hardcoded API/config values in runtime integration surface
- Remove production-origin defaults from runtime JS/TS paths and force environment-driven base URLs.
- Keep docs/examples allowed, but runtime defaults must not point to TPW production domain.

Key files:
- public/janagana-embed.js
- lib/embed/event-integration-client.ts
- lib/embed/public-event-shape.ts

4. Onboarding automation baseline
- Add deterministic tenant provisioning checklist execution: org created, tenant created, API key created, default roles/policies created, health check emitted.
- Add idempotent retry path for partial failures.

Key files:
- app/onboarding/OnboardingClient.tsx
- app/api/active-org/route.ts
- lib/actions/tenant.ts

5. Dashboard/admin access separation
- Make global admin controls environment-scoped and auditable; avoid accidental access expansion.
- Add explicit tenant admin role checks in sensitive operations.

Key files:
- app/admin/page.tsx
- lib/actions/admin.ts
- lib/permissions-policy.ts

### Must fix before shared multi-tenant SaaS

1. tenant_id coverage and tenant-local uniqueness hardening
- Add tenantId columns (or equivalent denormalized tenant foreign key) to high-write child tables that currently rely only on parent traversal for tenant scoping.
- Add tenant-scoped composite indexes/uniques where needed for efficient and safe filtering.

High-priority tables/models:
- EventRegistration
- VolunteerSignup
- ClubMembership
- ClubPost
- VolunteerShift
- VolunteerShiftSignup
- FormSubmission
- SurveyResponse
- SurveyAnswer
- WebhookDelivery
- EmailLog
- MemberCustomFieldValue
- ContactCustomFieldValue
- ForumReply

2. Tag/event scoping policy standardization
- Define system tag namespace policy (__system_*), tenant tag constraints, and API-level normalization/validation.
- Ensure event/tag APIs cannot accidentally introduce cross-tenant analytical bleed through shared reporting code.

3. Centralized authorization and policy enforcement
- Build one policy layer for tenant action authorization used by all server actions and API routes.
- Add negative tests for cross-tenant access attempts on every external endpoint.

4. Monitoring/observability for shared mode
- Per-tenant SLOs, per-tenant anomaly alerts, and suspicious cross-tenant query detection.
- Correlation IDs across request -> action -> DB writes.

5. Multi-tenant test gate
- Mandatory cross-tenant E2E matrix before deploy (tenant A token/key cannot read/write tenant B).

### Cleanup only (can defer)

1. TPW-specific seed/import docs and scripts that are not in runtime path
- scripts/seed-purple-wings.ts
- scripts/import-tpw-past-events.ts
- scripts/rollback-tpw-past-events.ts
- docs/PURPLE_WINGS_INTEGRATION_GUIDE.md
- docs/TPW_INTEGRATION_GUIDE.md

2. Legacy/duplicate documentation cleanup
- Consolidate overlapping integration docs and remove duplicate TPW narrative where not required for general product docs.

3. Cosmetic/default text cleanup
- Example slugs/domains in docs/help content can be normalized gradually.

## C) Minimum Safe Architecture for a Second Pilot

Target: onboard one additional customer safely in weeks, not months.

Minimum safe architecture:
- Single deployed codebase artifact (same repo/branching strategy).
- Separate database project per pilot customer.
- Separate Clerk application/instance per pilot customer OR separate Clerk environment with strict org isolation policy.
- Separate Stripe/Resend/Twilio webhook endpoints + keys per customer environment.
- Separate API keys per tenant and per integration surface.
- Separate admin access lists per customer environment.

Explicit yes/no decisions:
- Separate environment: Yes.
- Separate Supabase project: Yes if using Supabase. (Current stack uses Neon/Postgres; use separate Neon project equivalently.)
- Separate JanaGana instance: Yes logically (separate deployment target + env vars), even if built from same codebase.
- Separate API keys: Yes (plugin keys, webhook secrets, service credentials).
- Separate dashboard/admin access: Yes (customer admins isolated; global admins tightly allowlisted per env).

Second-pilot launch checklist (minimum):
1. Provision new environment with isolated database and secrets.
2. Run onboarding flow and validate org->tenant linkage.
3. Generate new plugin API key and verify key scope.
4. Validate all embed/plugin endpoints return only new tenant data.
5. Run cross-tenant negative tests between TPW and pilot-2 environments.
6. Enable monitoring alerts and health heartbeat for new environment.
7. Execute rollback plan and backup verification before go-live.

## D) Productization Roadmap

### Phase 1: Safety / Isolation (2-3 weeks)

Goal: make second pilot safe with low blast radius.

Deliver:
- Per-customer isolated environment templates (env vars, DB, webhooks).
- Unified tenant context resolver contract for API routes.
- Guardrailed migration/repair scripts (dry-run default, allowlist checks).
- Runtime hardcoded base URL removal.

Exit criteria:
- Pilot-2 can run fully isolated from TPW data and secrets.
- No unresolved high-severity tenant-context gaps in API layer.

### Phase 2: Tenant Configuration (2-4 weeks)

Goal: remove TPW assumptions from configuration and provisioning.

Deliver:
- Tenant provisioning profile (branding, locale/timezone, feature flags).
- Standardized tag namespace and validation rules.
- Environment-driven integration configuration surfaces.

Exit criteria:
- New tenant can be configured without code edits.

### Phase 3: Admin / Onboarding (2-3 weeks)

Goal: operationally ready onboarding and tenant administration.

Deliver:
- Idempotent onboarding orchestration and retries.
- Admin controls for tenant lifecycle, keys, and health checks.
- Audit trails for tenant-scoped admin actions.

Exit criteria:
- Non-engineering ops can onboard a pilot tenant using a runbook.

### Phase 4: Cross-Tenant Testing (2-3 weeks)

Goal: prove shared-mode readiness before enabling shared DB/runtime.

Deliver:
- Automated cross-tenant test matrix (auth + API key + embed surfaces).
- Tenant isolation chaos tests and policy regression suite.
- Shared multi-tenant go/no-go checklist.

Exit criteria:
- Green cross-tenant suite in CI for 2 consecutive releases.
- Observability can detect and alert on tenant boundary violations.

## E) Deliverables: Exact Files, Tables, Services to Change First

### Files to change first (priority order)

1. Tenant context + API authorization
- lib/tenant.ts
- lib/plugin-auth.ts
- app/api/dashboard/crm/contacts/route.ts
- app/api/dashboard/crm/contacts/[id]/route.ts
- app/api/dashboard/crm/activities/route.ts
- app/api/plugin/events/route.ts
- app/api/plugin/event-registrations/route.ts
- app/api/plugin/crm/contacts/route.ts

2. Onboarding and tenant provisioning reliability
- lib/actions/tenant.ts
- app/onboarding/OnboardingClient.tsx
- app/api/active-org/route.ts

3. Hardcoded runtime integration config
- public/janagana-embed.js
- lib/embed/event-integration-client.ts
- lib/embed/public-event-shape.ts

4. Script safety and tenant-aware reconciliation
- scripts/migrate-contact-first.ts
- scripts/repair-orphan-tenants.ts
- scripts/verify-tenants.ts
- scripts/tenant-unification-dry-run.ts

5. Admin and policy enforcement
- lib/actions/admin.ts
- app/admin/page.tsx
- lib/permissions-policy.ts

### Tables/models to change first

Second-pilot required now:
- Tenant
- ApiKey
- AuditLog
- Contact
- Event
- VolunteerOpportunity

Shared-SaaS required before go-live:
- EventRegistration (add tenantId and index/guardrails)
- VolunteerSignup (add tenantId and index/guardrails)
- ClubMembership (add tenantId and index/guardrails)
- ClubPost (add tenantId and index/guardrails)
- VolunteerShift (add tenantId and index/guardrails)
- VolunteerShiftSignup (add tenantId and index/guardrails)
- FormSubmission (add tenantId and index/guardrails)
- SurveyResponse (add tenantId and index/guardrails)
- SurveyAnswer (evaluate denormalized tenantId or strict parent-chain enforcement with tests)
- WebhookDelivery (add tenantId and index/guardrails)
- EmailLog (add tenantId and index/guardrails)
- MemberCustomFieldValue (add tenantId and index/guardrails)
- ContactCustomFieldValue (add tenantId and index/guardrails)
- ForumReply (add tenantId and index/guardrails)

### Services/processes to change first

Second-pilot required now:
- Clerk org/tenant provisioning flow
- Plugin API key issuance and verification
- Environment/secret provisioning pipeline
- Monitoring alerts and health check heartbeat

Shared-SaaS required before go-live:
- CI policy tests for cross-tenant isolation
- Tenant-aware observability dashboards and alerts
- Data repair/migration execution guardrails with approvals

## What can remain TPW-specific for now vs what must be generalized immediately

Can remain TPW-specific for now:
- TPW seed/import/rollback scripts used only for TPW historical data handling.
- TPW integration runbooks/docs as customer-specific references.

Must be generalized immediately:
- Runtime defaults and base URLs used by production code paths.
- API authorization/tenant resolution behavior.
- Onboarding provisioning reliability and idempotency.
- Admin access and audit controls.
- Reconciliation/migration script safety boundaries.

## Go/No-Go Rule

Do not move to true shared multi-tenant SaaS until:
- tenant boundary tests are automated and passing,
- tenant context is centralized and enforced in every external endpoint,
- high-write child tables have explicit tenant scoping or proven equivalent guarantees,
- per-tenant observability and incident response are operational.
