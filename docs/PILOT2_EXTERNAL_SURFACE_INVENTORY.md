# Pilot-2 External Surface Inventory

Date: 2026-05-03

This inventory classifies external-facing API routes and tenant-scoped server action surfaces.

Legend:
- already migrated: uses Phase-1/Phase-2 tenant context contract + tenant-scoped checks/logging
- needs migration: still missing contract/checks
- not tenant-scoped / not applicable: webhook/health/public infra route, or server-action scope where HTTP tenant resolver is not applicable

## API Routes

| Surface | Path | Classification | Notes |
|---|---|---|---|
| Dashboard CRM | app/api/dashboard/crm/contacts/route.ts | already migrated | Dashboard tenant resolver + structured tenant logs |
| Dashboard CRM | app/api/dashboard/crm/contacts/[id]/route.ts | already migrated | Resolver + ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/contacts/search/route.ts | already migrated | Resolver + tenant-scoped query + logs |
| Dashboard CRM | app/api/dashboard/crm/activities/route.ts | already migrated | Resolver + contact/deal ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/companies/route.ts | already migrated | Resolver + logs |
| Dashboard CRM | app/api/dashboard/crm/companies/[id]/route.ts | already migrated | Resolver + ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/deals/route.ts | already migrated | Resolver + contact/company ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/deals/[id]/route.ts | already migrated | Resolver + ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/tasks/route.ts | already migrated | Resolver + ownership checks + logs |
| Dashboard CRM | app/api/dashboard/crm/tasks/[id]/route.ts | already migrated | Resolver + ownership checks + logs |
| Plugin API | app/api/plugin/events/route.ts | already migrated | Plugin context resolver + logs |
| Plugin API | app/api/plugin/event-registrations/route.ts | already migrated | Plugin context + tenant-safe event/member checks + logs |
| Plugin CRM | app/api/plugin/crm/contacts/route.ts | already migrated | Plugin context + ownership checks + logs |
| Plugin CRM | app/api/plugin/crm/contacts/[id]/route.ts | already migrated | Plugin context + ownership checks + logs |
| Plugin CRM | app/api/plugin/crm/companies/route.ts | already migrated | Plugin context + logs |
| Plugin CRM | app/api/plugin/crm/activities/route.ts | already migrated | Plugin context + ownership checks + logs |
| Plugin CRM | app/api/plugin/crm/deals/route.ts | already migrated | Plugin context + ownership checks + logs |
| Plugin CRM | app/api/plugin/crm/tasks/route.ts | already migrated | Plugin context + ownership checks + logs |
| Embed API | app/api/embed/events/route.ts | already migrated | Tenant slug mismatch rejection (header vs query) + tenant logs |
| Embed API | app/api/embed/past-events/route.ts | already migrated | Tenant slug mismatch rejection (header vs query) + tenant logs |
| Embed API | app/api/embed/newsletter/route.ts | already migrated | Tenant slug mismatch rejection (header vs body) + tenant logs |
| Embed API | app/api/embed/course/route.ts | already migrated | Tenant slug mismatch rejection (header vs body) + tenant logs |
| Portal API | app/api/portal/member/profile/route.ts | already migrated | Explicit dashboard tenant context + logs |
| Auth bridge | app/api/active-org/route.ts | already migrated | Auth required + secure cookie handling + structured logging |
| Webhooks | app/api/webhooks/stripe/route.ts | not tenant-scoped / not applicable | Signature-authenticated provider webhook; tenant-scoped effects via metadata |
| Webhooks | app/api/webhooks/clerk/route.ts | not tenant-scoped / not applicable | Signature-authenticated provider webhook |
| Health | app/api/health/onboarding/route.ts | not tenant-scoped / not applicable | Infra health check |

## Tenant-Scoped Server Actions

| Surface | Module | Classification | Notes |
|---|---|---|---|
| Tenant settings/onboarding | lib/actions/tenant.ts | already migrated | Onboarding idempotent provisioning + tenant-aware settings/stats |
| API keys | lib/actions/api-keys.ts | already migrated | Uses requireTenant for scoped key lifecycle |
| Members | lib/actions/members.ts | already migrated | Tenant-scoped via requireTenant |
| Events | lib/actions/events.ts | already migrated | Tenant-scoped via requireTenant |
| Volunteers | lib/actions/volunteers.ts | already migrated | Tenant-scoped via requireTenant |
| Portal actions | lib/actions/portal.ts | already migrated | Tenant slug/tenant id constrained |
| Organization console | lib/actions/organization-console.ts | already migrated | Tenant access policy checks |
| Duplicates | lib/actions/duplicates.ts | already migrated | Tenant admin access checks |
| Admin platform | lib/actions/admin.ts | already migrated | Environment-scoped global admin + persistent platform audit |
| Platform audit | lib/actions/audit.ts | already migrated | Added persistent platform audit helper |
| Other tenant action modules | lib/actions/*.ts | not tenant-scoped / not applicable | Use requireTenant / policy checks; HTTP tenant resolver contract is API-route specific |

## Newly Migrated in This Step

- app/api/dashboard/crm/companies/route.ts
- app/api/dashboard/crm/companies/[id]/route.ts
- app/api/dashboard/crm/deals/route.ts
- app/api/dashboard/crm/deals/[id]/route.ts
- app/api/dashboard/crm/tasks/route.ts
- app/api/dashboard/crm/tasks/[id]/route.ts
- app/api/dashboard/crm/contacts/search/route.ts
- app/api/plugin/crm/companies/route.ts
- app/api/plugin/crm/contacts/[id]/route.ts
- app/api/plugin/crm/activities/route.ts
- app/api/plugin/crm/deals/route.ts
- app/api/plugin/crm/tasks/route.ts
- app/api/portal/member/profile/route.ts
- app/api/embed/events/route.ts
- app/api/embed/past-events/route.ts
- app/api/embed/newsletter/route.ts
- app/api/embed/course/route.ts
