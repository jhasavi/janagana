# Tenant Configuration Profile (Phase 2)

This document defines the environment-driven tenant profile used for isolated per-customer deployments (one codebase, separate env + database per client).

## Profile Schema

The runtime profile is validated by [lib/tenant-profile.ts](../lib/tenant-profile.ts).

```ts
{
  slug: string,
  branding: {
    appName: string,
    legalName?: string,
    primaryColor: `#${string}`,
  },
  baseUrls: {
    app: string, // absolute URL
    api: string, // absolute URL
  },
  locale: {
    defaultLocale: string,
    timezone: string,
  },
  featureFlags: Record<string, boolean>,
  tagNamespaces: {
    defaultNamespace: string,
    eventDefaultTagPrefix: string,
    contactDefaultTagPrefix: string,
  },
  integrations: {
    pluginApiEnabled: boolean,
    embedApiEnabled: boolean,
    defaultApiKeyName: string,
    defaultApiKeyPermissions: string[],
    webhookBaseUrl?: string,
  },
  onboardingDefaults: {
    defaultOrganizationName?: string,
    timezone: string,
    primaryColor: `#${string}`,
  }
}
```

## Environment Mapping

Required:
- `TENANT_SLUG`
- `TENANT_BRAND_NAME`
- `TENANT_APP_BASE_URL`
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Strongly recommended:
- `TENANT_API_BASE_URL`
- `TENANT_DEFAULT_LOCALE`
- `TENANT_DEFAULT_TIMEZONE`
- `TENANT_BRAND_PRIMARY_COLOR`
- `TENANT_TAG_NAMESPACE_DEFAULT`
- `ONBOARDING_DEFAULT_API_KEY_NAME`
- `ONBOARDING_DEFAULT_API_KEY_PERMISSIONS`

Optional JSON overrides:
- `TENANT_FEATURE_FLAGS_JSON`
- `TENANT_INTEGRATIONS_JSON`
- `TENANT_ONBOARDING_DEFAULTS_JSON`

Automation helper:
- `BOOTSTRAP_PLUGIN_API_KEY` (optional, used by plugin HTTP checks in preflight)

Bootstrap script flag:
- `--env-file .env.client` (supported by bootstrap scripts to avoid mutating shared `.env` or `.env.local`)

## What Is Configurable Without Code Edits

- Tenant slug and branding defaults
- Base app/API URLs used by onboarding and integration surfaces
- Locale/timezone defaults
- Feature flags (JSON)
- Tag namespace defaults for future tagging conventions
- Integration defaults for onboarding API keys
- Onboarding defaults (organization name/timezone/brand color)

## Manual Steps That Still Remain

These are intentionally manual for isolation and security:

1. Provision isolated infrastructure per client.
2. Create separate Neon database and set `DATABASE_URL`.
3. Create separate Clerk app/environment and set Clerk keys.
4. Set separate Stripe/Resend/Twilio/Sentry credentials as needed.
5. Configure webhook endpoints/secrets in each external provider.
6. Run DB migrations in the target environment.
7. Complete first admin sign-in and onboarding once deployed.
8. Validate tenant-scoped API key and embed/plugin flows.

## Migration Policy (Isolated-Client Onboarding)

Operators should not choose migration strategy ad hoc.

Policy:
1. Preferred path is migration-driven (`db:migrate:deploy`) when migration history exists.
2. If database is non-empty and migration history is missing/incomplete, stop and escalate to engineer for baseline policy.
3. `db:push` is engineer-approved fallback only when baseline migrations are intentionally deferred for that isolated environment.

This policy is enforced by `bootstrap:validate-env` and pre-onboarding preflight checks.

## Recommended Onboarding Checklist (Next Isolated Client)

1. Copy `.env.example` to `.env.local` (or deployment secret manager values).
2. Fill tenant profile vars (`TENANT_*`) for the new client.
3. Set client-specific infra secrets (`DATABASE_URL`, Clerk keys, optional integrations).
4. Run pre-onboarding checks (`bootstrap:validate-env`, `bootstrap:preflight:pre-onboarding`).
5. Run migration/build (`db:migrate:deploy` when migration readiness passes).
6. Sign in as client admin and complete onboarding.
7. Run post-onboarding checks (`bootstrap:preflight:post-onboarding`).
8. Confirm tenant record + slug + timezone/brand defaults were created as expected.
9. Validate embed and plugin APIs return only this tenant's data.
10. Record deployment values in customer runbook and rotate temporary bootstrap credentials.

## Exact Bootstrap Commands

Use this sequence for each new isolated client environment.

1. Copy template and fill profile + infra secrets.

```bash
cp .env.example .env.local
```

2. Validate required env, tenant profile schema, and migration readiness.

```bash
npm run bootstrap:validate-env
```

3. Pre-onboarding preflight (does not require tenant to exist yet).

```bash
npm run bootstrap:preflight:pre-onboarding
```

4. Apply schema and verify build.

```bash
npm run db:migrate:deploy
npm run build
```

5. Complete onboarding (UI flow).

6. Start app and run post-onboarding preflight.

```bash
npm run dev
npm run bootstrap:preflight:post-onboarding
```

Optional strict plugin check when you already have a real plugin key:

```bash
BOOTSTRAP_PLUGIN_API_KEY=jg_live_actual_key npm run bootstrap:preflight:post-onboarding
```

Soft mode when onboarding is not complete yet:

```bash
npm run bootstrap:preflight:post-onboarding -- --no-strict
```

Run bootstrap scripts against an explicit file:

```bash
npm run bootstrap:validate-env -- --env-file=.env.client
npm run bootstrap:preflight:pre-onboarding -- --env-file=.env.client
npm run bootstrap:preflight:post-onboarding -- --env-file=.env.client
```

## Exact Validation Commands

- Env + tenant profile validation:

```bash
npm run bootstrap:validate-env
```

- Pre-onboarding preflight:

```bash
npm run bootstrap:preflight:pre-onboarding
```

- Onboarding health endpoint:

```bash
curl -sS "$TENANT_APP_BASE_URL/api/health/onboarding"
```

- Public embed readiness:

```bash
curl -sS "$TENANT_APP_BASE_URL/api/embed/events?tenantSlug=$TENANT_SLUG&maxItems=1"
```

- Plugin readiness (requires real key):

```bash
curl -sS -H "x-api-key: $BOOTSTRAP_PLUGIN_API_KEY" -H "x-tenant-slug: $TENANT_SLUG" "$TENANT_APP_BASE_URL/api/plugin/events?status=PUBLISHED"
```

- Post-onboarding preflight with isolation mismatch checks:

```bash
npm run bootstrap:preflight:post-onboarding
```

- Guarded engineer-assisted tenant bootstrap helper (break-glass/rehearsal):

```bash
npm run bootstrap:provision-tenant -- --tenant-slug=<slug> --org-name="<Org Name>" --clerk-admin-email=<admin@email>
```

Dry-run mode:

```bash
npm run bootstrap:provision-tenant -- --dry-run --tenant-slug=<slug> --org-name="<Org Name>" --clerk-admin-email=<admin@email>
```

## What Is Automated vs Manual

Automated now:
- Required env var checks for bootstrap-critical runtime vars.
- Tenant profile schema validation against runtime loader logic.
- Explicit env-file targeting with `--env-file`.
- DB connectivity + tenant existence checks.
- Migration readiness and policy checks before operator migration step.
- App identity check (`app.id=janagana`) to prevent wrong-port/wrong-app checks.
- Onboarding health endpoint verification.
- Embed readiness + embed tenant mismatch guard verification.
- Default API key provisioning existence check.
- Plugin readiness + plugin tenant mismatch guard verification (when plugin key is provided).

Intentionally manual (security/isolation):
- Provisioning new Neon database/project.
- Provisioning Clerk app/environment and OAuth/provider settings.
- Creating/rotating external provider credentials (Stripe, Resend, Twilio, Sentry).
- Setting deployment secrets in hosting platform.
- Final handoff and credential rotation approvals.

## Operator Readiness

A non-engineer operator can execute most of the runbook after infrastructure and secrets are provisioned.

Engineer still required for:
1. Initial environment provisioning and secret-manager setup.
2. Troubleshooting failed migrations/builds or auth/provider misconfiguration.
3. Any isolation failure detected by preflight mismatch checks.

## Rollback Steps

If bootstrap or go-live preflight fails:

1. Stop rollout for that client environment.
2. Revert deployment to previous known-good app revision.
3. Restore previous environment variable set from secret-manager history.
4. If onboarding already created partial tenant data, disable new API keys for that tenant and mark tenant inactive until corrected.
5. Re-run:

```bash
npm run bootstrap:validate-env
npm run bootstrap:preflight:pre-onboarding
npm run bootstrap:preflight:post-onboarding -- --no-strict
```

6. Resume strict preflight only after all failures are resolved.

## Manual Onboarding Fallback Checklist

Use this when Playwright/Clerk automation is flaky.

1. Open `${TENANT_APP_BASE_URL}/sign-in` and authenticate as the designated client admin.
2. If redirected to onboarding, enter org name and submit.
3. Confirm redirect to `/dashboard`.
4. Validate tenant was created:

```bash
npm run bootstrap:preflight:post-onboarding -- --no-strict
```

5. Validate default API key provisioning and isolation checks:

```bash
BOOTSTRAP_PLUGIN_API_KEY=<real_key> npm run bootstrap:preflight:post-onboarding
```

Pass criteria:
- dashboard redirect succeeds
- post-onboarding preflight has 0 failures
- embed mismatch and plugin mismatch checks return 403 as expected

Fail criteria:
- onboarding loops or cannot reach dashboard
- tenant record missing after onboarding
- default API key missing
- isolation mismatch checks do not return 403
