# Production Preflight Checklist

This document is a final verification guide before launching Janagana
into production.

## Required Environment Variables

### Platform & Tenant
- `PLATFORM_BRAND_NAME` — deployment display name, e.g. `Jana Gana`
- `NEXT_PUBLIC_APP_URL` — canonical app URL, e.g. `https://app.example.com`
- `NEXT_PUBLIC_APP_DOMAIN` — domain only, e.g. `example.com`
- `TENANT_SLUG` — tenant slug for default tenant context
- `TENANT_BRAND_NAME` — tenant display name
- `TENANT_BRAND_PRIMARY_COLOR` — valid hex color
- `TENANT_DEFAULT_LOCALE` — default locale, e.g. `en-US`
- `TENANT_DEFAULT_TIMEZONE` — default timezone, e.g. `America/New_York`

### Authentication (Clerk)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

### Payments (Stripe)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET` (if Stripe Connect integrations are used)
- `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

### Email & SMS
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `TWILIO_ACCOUNT_SID` (if using Twilio)
- `TWILIO_AUTH_TOKEN` (if using Twilio)
- `TWILIO_PHONE_NUMBER` (if using Twilio)

### Database
- `DATABASE_URL` — production Postgres connection string
  - For Neon/Vercel, use pooled settings:
    - `?pgbouncer=true&connection_limit=1`
    - optionally add `pool_timeout=20`
  - Example: `postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1`

### Monitoring
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING=1`

### Optional / Feature Flags
- `NEXT_PUBLIC_SHOW_EXPERIMENTAL_FEATURES`
- `TENANT_FEATURE_FLAGS_JSON`
- `TENANT_INTEGRATIONS_JSON`
- `TENANT_PLUGIN_API_ENABLED`
- `TENANT_EMBED_API_ENABLED`

---

## Clerk Configuration

1. Sign in to the Clerk dashboard.
2. Confirm the project has the correct callback and redirect URLs:
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`
3. Enable password auth for the test user used by Playwright.
4. Add the test user to the target organization if using org context.

---

## Stripe Configuration

1. Confirm `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set.
2. Confirm webhook secrets are configured in Stripe and in Vercel:
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CONNECT_WEBHOOK_SECRET`
3. Confirm Stripe product prices exist for starter/growth/pro plans.

---

## Resend / Twilio

1. Confirm `RESEND_API_KEY` is set.
2. Confirm `EMAIL_FROM` and `EMAIL_FROM_NAME` are valid.
3. If using Twilio, confirm both `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`.
4. Verify email and SMS flows in a staging environment before production.

---

## Verification Steps

### Onboarding
- Visit `/` as a fresh user.
- If redirected to `/sign-in`, sign in and follow onboarding.
- Confirm org creation completes and you land on `/dashboard`.
- Confirm sidebar brand text matches the tenant name.

### Dashboard
- Confirm `/dashboard` loads for an authenticated user.
- Confirm `/dashboard/events` loads with no errors.
- Confirm `/dashboard/members` loads with no errors.

### Event / Member Creation
- Create a new event at `/dashboard/events/new`.
- Confirm the app returns to the events list and the event exists.
- Create a new member at `/dashboard/members/new`.
- Confirm the app returns to the members list and the member exists.

### Tenant Isolation
- Verify Tenant A cannot view Tenant B events.
- Verify a direct request to `/dashboard/events/<other-event-id>` returns 404.
- Verify event list pages do not surface events from other tenants.

---

## How to verify before launch

Run these commands in the project root:

```bash
npm run build
npx tsc --noEmit
npm run lint
npm audit --production
npx prisma validate
npx playwright test e2e/tests/10-first-user-journey.spec.ts e2e/tests/11-tenant-isolation.spec.ts
```

If any command fails, do not deploy until the specific issue is fixed.

---

## Release decision guidance

- Local Demo: OK if build and core E2E pass locally.
- Single-org Controlled Launch: OK if onboarding and tenant isolation tests pass for the target org.
- Multi-tenant Beta: requires tenant isolation and pooled DATABASE_URL settings.
- Public SaaS Launch: requires removal of residual hardcoded org-specific URLs and complete tenant isolation guarantees.
