# Pilot-2 Tenant Isolation Verification Runbook

Date: 2026-05-03

This runbook verifies that external API surfaces are tenant-safe before pilot-2 go-live.

## Preconditions

1. Two test tenants exist: Tenant A and Tenant B.
2. Each tenant has:
   - unique slug
   - plugin API key
   - at least one contact/event/member record
3. You have environment-specific base URL and keys loaded in shell.

Example environment variables:

```bash
export BASE_URL="http://localhost:3000"
export TENANT_A_SLUG="tenant-a"
export TENANT_B_SLUG="tenant-b"
export TENANT_A_KEY="<tenant-a-plugin-key>"
export TENANT_B_KEY="<tenant-b-plugin-key>"
```

## 1) Static Safety Checks

```bash
# Ensure core resolver contracts are in place
rg "resolveDashboardTenantContext\(|resolvePluginTenantContext\(" app/api/**/route.ts

# Ensure structured tenant logging appears in migrated routes
rg "logTenantRequest\(" app/api/**/route.ts

# Ensure embed routes log success and accept x-tenant-slug header
rg "\[embed\.|x-tenant-slug" app/api/embed/**/route.ts
```

Expected outcome: all migrated routes appear in results.

## 2) Plugin Route Isolation

### 2.1 Positive: tenant A key lists tenant A data

```bash
curl -sS "$BASE_URL/api/plugin/crm/contacts" \
  -H "x-api-key: $TENANT_A_KEY" \
  -H "x-tenant-slug: $TENANT_A_SLUG"
```

Expected: HTTP 200 and only tenant A contacts.

### 2.2 Negative: key/slug mismatch rejected

```bash
curl -i "$BASE_URL/api/plugin/crm/contacts" \
  -H "x-api-key: $TENANT_A_KEY" \
  -H "x-tenant-slug: $TENANT_B_SLUG"
```

Expected: HTTP 403 with tenant mismatch error.

### 2.3 Negative: cross-tenant record write rejected

Attempt create/update in tenant A using an ID that belongs to tenant B.

Expected: HTTP 404 or HTTP 403 (no cross-tenant mutation succeeds).

## 3) Dashboard/Portal Isolation

Use authenticated session for tenant A admin/member.

1. Query/update dashboard CRM routes with tenant B resource IDs.
2. Call portal profile update under tenant A with tenant B-linked references.

Expected: tenant B resources are not accessible or mutable.

Note: in local/dev signed-out calls can be intercepted by Clerk middleware and return `307` redirect to sign-in instead of route-level `401` JSON. This still confirms unauthenticated access is denied.

## 4) Embed Route Slug Mismatch Rejection

### 4.1 Events mismatch (header vs query)

```bash
curl -i "$BASE_URL/api/embed/events?tenantSlug=$TENANT_A_SLUG" \
  -H "x-tenant-slug: $TENANT_B_SLUG"
```

Expected: HTTP 403, error about tenant slug mismatch.

### 4.2 Newsletter mismatch (header vs body)

```bash
curl -i "$BASE_URL/api/embed/newsletter" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: $TENANT_B_SLUG" \
  -d "{\"tenantSlug\":\"$TENANT_A_SLUG\",\"email\":\"verify@example.com\"}"
```

Expected: HTTP 403, error about tenant slug mismatch.

### 4.3 Course mismatch (header vs body)

```bash
curl -i "$BASE_URL/api/embed/course" \
  -H "Content-Type: application/json" \
  -H "x-tenant-slug: $TENANT_B_SLUG" \
  -d "{\"tenantSlug\":\"$TENANT_A_SLUG\",\"email\":\"verify@example.com\",\"firstName\":\"T\",\"lastName\":\"User\"}"
```

Expected: HTTP 403, error about tenant slug mismatch.

## 5) Script Safety Guardrails

```bash
# TypeScript scripts are executed with tsx.
# Use allowlist flags required by current script interfaces.
npx tsx scripts/migrate-contact-first.ts --allow-tenant-slugs "$TENANT_A_SLUG,$TENANT_B_SLUG"
npx tsx scripts/repair-orphan-tenants.ts --allow-tenant-slugs "$TENANT_A_SLUG,$TENANT_B_SLUG"
npx tsx scripts/verify-tenants.ts --allow-tenant-slugs "$TENANT_A_SLUG,$TENANT_B_SLUG"
npx tsx scripts/tenant-unification-dry-run.ts --source-slug "$TENANT_A_SLUG" --target-slug "$TENANT_B_SLUG" --allow-source-slugs "$TENANT_A_SLUG" --allow-target-slugs "$TENANT_B_SLUG"
```

Expected: scripts refuse unsafe operation without allowlists; default mode is dry-run/simulation and produces no destructive writes.

## 6) Platform Admin Audit Persistence

Sensitive admin access/list operations should now emit AuditLog entries with tenantId="__platform__".

Validation query example:

```bash
# Use your normal Prisma/DB inspection workflow to query audit logs
# Filter: tenantId == "__platform__"
```

Expected: records present for environment denial, allowlist denial, grant, and tenant list actions.

## 7) Build/Typecheck Validation

```bash
npm run lint
npm run build
```

Expected: no new route-level type/lint failures.

## Go/No-Go Criteria

Go if all are true:
1. No endpoint allows cross-tenant reads/writes.
2. Plugin/embed mismatch tests return expected 403s.
3. Static resolver/log checks pass.
4. Admin platform audit entries are persisted.
5. Lint/build pass in target environment.

No-go if any cross-tenant access succeeds or if audit/log observability is missing in production telemetry.
