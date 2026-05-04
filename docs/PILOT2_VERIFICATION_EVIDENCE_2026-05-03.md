# Pilot-2 Go-Live Verification Evidence

Date: 2026-05-03
Environment tested: local target runtime (`http://localhost:3000`) with `.env.local` + `.env`

Tenants used:
- Tenant A: `purple-wings`
- Tenant B: `the-purple-wings`

Fixture method:
- Temporary verification API keys and contacts were created for each tenant in DB for test execution.

## 1) Verification Matrix

| Item | Route/Flow | Tenant(s) | Method/Command | Result | Evidence | Failure Root Cause (if any) |
|---|---|---|---|---|---|---|
| Static safety contracts | API route resolver usage | A/B n/a | `rg "resolveDashboardTenantContext\(|resolvePluginTenantContext\(" app/api/**/route.ts` | PASS | Resolver calls present across migrated dashboard/plugin/portal routes | n/a |
| Structured tenant logging | API route logging usage | A/B n/a | `rg "logTenantRequest\(" app/api/**/route.ts` | PASS | Structured logger usage found across migrated routes | n/a |
| Embed guard + logging contract | Embed routes | A/B n/a | `rg "\[embed\.|x-tenant-slug" app/api/embed/**/route.ts` | PASS | All embed routes allow `x-tenant-slug` and include success logs | n/a |
| Onboarding/health gate | `/api/health/onboarding` | n/a | `curl -i /api/health/onboarding` | PASS (guard) | `307` redirect to sign-in due Clerk middleware (`dev-browser-missing`) | None; expected local middleware behavior |
| Active org auth gate | `/api/active-org` | n/a | `curl -i -X POST /api/active-org ...` | PASS (guard) | `307` redirect to sign-in due Clerk middleware | None; expected local middleware behavior |
| Plugin positive isolation | `/api/plugin/crm/contacts` | A | `curl -i ... -H x-api-key:A -H x-tenant-slug:A` | PASS | `200` and only Tenant A contact returned | n/a |
| Plugin key/slug mismatch rejection | `/api/plugin/crm/contacts` | A key + B slug | `curl -i ... -H x-api-key:A -H x-tenant-slug:B` | PASS | `403` with `{"error":"Tenant slug mismatch"}` | Initially inconsistent message (`Forbidden`) fixed in code |
| Plugin cross-tenant write rejection | `/api/plugin/crm/contacts/[id]` | A key targeting B contact | `curl -i -X PATCH .../B_contact_id ...` | PASS | `404` `{"error":"Contact not found"}` | n/a |
| Embed mismatch rejection | `/api/embed/events` | A query + B header | `curl -i /api/embed/events?tenantSlug=A -H x-tenant-slug:B` | PASS | `403` `{"error":"Tenant slug mismatch"}` | n/a |
| Embed mismatch rejection | `/api/embed/newsletter` | A body + B header | `curl -i -X POST /api/embed/newsletter ...` | PASS | `403` `{"error":"Tenant slug mismatch"}` | n/a |
| Embed mismatch rejection | `/api/embed/course` | A body + B header | `curl -i -X POST /api/embed/course ...` | PASS | `403` `{"error":"Tenant slug mismatch"}` | n/a |
| Dashboard auth/isolation gate | `/api/dashboard/crm/contacts` | n/a (signed-out) | `curl -i -X POST /api/dashboard/crm/contacts ...` | PASS (guard) | `307` redirect to sign-in | Could not execute authenticated cross-tenant mutation in this environment |
| Portal auth/isolation gate | `/api/portal/member/profile` | n/a (signed-out) | `curl -i -X PUT /api/portal/member/profile ...` | PASS (guard) | `307` redirect to sign-in | Could not execute authenticated cross-tenant mutation in this environment |
| Script guardrails (runbook as written) | Scripts section | A/B | `node scripts/*.ts ...` | FAIL | `ERR_UNKNOWN_FILE_EXTENSION .ts` for all 4 commands | Runbook command drift: TS scripts require `tsx`; old flag names |
| Script guardrails (corrected) | scripts/migrate-contact-first.ts | A/B | `npx tsx scripts/migrate-contact-first.ts --allow-tenant-slugs ...` | PASS | Dry-run mode logged; no destructive writes | n/a |
| Script guardrails (corrected) | scripts/repair-orphan-tenants.ts | A/B | `npx tsx scripts/repair-orphan-tenants.ts --allow-tenant-slugs ...` | PASS | Dry-run mode logged; allowlist enforced | n/a |
| Script guardrails (corrected) | scripts/verify-tenants.ts | A/B | `npx tsx scripts/verify-tenants.ts --allow-tenant-slugs ...` | PASS | Tenant verification completed within allowlist | n/a |
| Script guardrails (corrected) | scripts/tenant-unification-dry-run.ts | A/B | `npx tsx scripts/tenant-unification-dry-run.ts --source-slug ... --target-slug ... --allow-source-slugs ... --allow-target-slugs ...` | PASS | Dry-run/simulation report generated | n/a |
| Lint gate | Workspace lint | n/a | `npm run lint` | PASS with warnings | No blocking lint errors; existing alt-text warnings only | n/a |
| Build/type gate (first run) | Production build | n/a | `npm run build` | FAIL | Type mismatch in `lib/tenant.ts` (`string|undefined` vs `string|null`) | Tenant auth-state typing gap |
| Build/type gate (after fix) | Production build | n/a | `npm run build` | PASS | Full build completed; types validated | n/a |
| Telemetry structured logs | Plugin route logs | A | Dev server logs during plugin requests | PASS | Logs include `tenantId`, `route`, `authPrincipal`, `apiKeyId` from `logTenantRequest` | n/a |
| Platform audit retrievability | AuditLog (`tenantId=__platform__`) | n/a | Prisma insert + query probe | PASS (retrieval path) | Probe row created/retrieved with `action`, `resourceType`, `resourceId`, `actorClerkId`, metadata | Could not trigger real admin action path due unavailable authenticated admin session |

## 2) Failures Fixed During Pass

1. Build/type failure in tenant resolver calls
- Category: tenant isolation plumbing / compile safety
- Symptom: production build failed (`string | undefined` not assignable to `string | null`) in `lib/tenant.ts`
- Fix: normalized `auth().orgId`/`auth().userId` to nullable values before passing into resolver state
- Files changed:
  - `lib/tenant.ts`
- Verification: `npm run build` rerun passed.

2. Script runbook execution failure
- Category: operational runbook correctness
- Symptom: runbook used `node scripts/*.ts` + stale flag names; all commands failed
- Fix: updated runbook to `npx tsx` + current allowlist flag interfaces
- Files changed:
  - `docs/PILOT2_VERIFICATION_RUNBOOK.md`
- Verification: all 4 corrected script commands executed successfully in dry-run/simulate mode.

3. External error consistency gap
- Category: external API error normalization
- Symptom: plugin key/slug mismatch returned `{"error":"Forbidden"}` while embed mismatch returned `{"error":"Tenant slug mismatch"}`
- Fix: standardized plugin mismatch error message to `Tenant slug mismatch` while retaining 403 status and `{ error }` envelope
- Files changed:
  - `lib/plugin-auth.ts`
- Verification: mismatch request rerun returned `403` with `{"error":"Tenant slug mismatch"}`.

## 3) Telemetry Confirmation

Structured request logs confirmed in runtime output:
- `tenantId`
- `route`
- `authPrincipal`
- `apiKeyId` (plugin paths)

Platform audit retrieval confirmed in DB (minimum probe path):
- Inserted/retrieved `AuditLog` row with `tenantId="__platform__"`
- Retrievable fields include:
  - `action`
  - `resourceType`
  - `resourceId`
  - `actorClerkId`
  - metadata (`route`, `authPrincipal`, `apiKeyId`)

## 4) Open Verification Limitations

1. Authenticated dashboard/portal cross-tenant mutation attempts were not executed in this pass because no authenticated tenant A user session was available in the agent environment (requests were intercepted by Clerk middleware with sign-in redirects).
2. Real admin action-triggered `__platform__` audit rows (grant/deny/list) could not be exercised without an authenticated global-admin session; DB retrieval path was validated via probe event.

## 5) Final Recommendation

Recommendation: **GO with caveats**.

Reasoning:
- Core tenant-safety checks (plugin/embed mismatch rejection, plugin cross-tenant write rejection, structured logs, script guardrails, and build/lint gates) passed.
- Failures encountered in this pass were corrected and revalidated.
- Remaining caveats are operational-session dependent (authenticated dashboard/portal cross-tenant attempts and real admin-flow audit trigger validation), not code-path regressions found in this pass.
