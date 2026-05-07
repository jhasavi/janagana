# Required Environment Variables

Copy-paste these into Vercel or your `.env.local` for local development.

## Quick Setup for Vercel

```bash
# Set all variables at once using Vercel CLI:
vercel env pull --yes
# Then push any missing production-specific secrets

# Set tenant configuration:
vercel env add TENANT_SLUG
vercel env add TENANT_BRAND_NAME
vercel env add TENANT_BRAND_PRIMARY_COLOR
```

---

## Database & ORM

| Variable | Example | Environments | Notes |
|----------|---------|--------------|-------|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true&connection_limit=1` | Production, Preview | **Must include `pgbouncer=true&connection_limit=1` for Neon+Vercel.** Use connection pooling to avoid exhausting serverless connections. |

---

## Authentication (Clerk v6)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | All | Public key, safe in client code |
| `CLERK_SECRET_KEY` | All | Private key, server-only |
| `CLERK_WEBHOOK_SECRET` | All | For `/api/webhooks/clerk` webhook validation |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | All | Default: `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | All | Default: `/sign-up` |

---

## Tenant Configuration (Required for Startup)

| Variable | Type | Example | Notes |
|----------|------|---------|-------|
| `TENANT_SLUG` | string | `janagana` | URL-safe, 2-40 chars, lowercase alphanumeric + hyphens. Used in URLs and as default tag namespace. |
| `TENANT_BRAND_NAME` | string | `JanaGana` | Display name for this deployment instance |
| `TENANT_BRAND_PRIMARY_COLOR` | hex | `#4F46E5` | Primary theme color (must be valid hex) |
| `TENANT_BRAND_LEGAL_NAME` | string (optional) | `JanaGana Inc.` | For legal/compliance docs |

---

## Application URLs

| Variable | Example | Environments | Notes |
|----------|---------|--------------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://janagana.namasteneedham.com` | All | Main app URL (for metadata, redirects, etc.) |
| `NEXT_PUBLIC_APP_DOMAIN` | `janagana.namasteneedham.com` | All | Domain only (no protocol) |
| `NEXT_PUBLIC_API_URL` | `https://janagana.namasteneedham.com/api` | All | API base URL (for client-side fetch calls) |
| `API_URL` | `https://janagana.namasteneedham.com/api` | All | Server-side API URL |

---

## Email (Resend)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `RESEND_API_KEY` | Production, Preview | Get from [resend.com/api-keys](https://resend.com/api-keys). Free tier: 100 emails/day. |
| `EMAIL_FROM` | All | Sender email, e.g., `noreply@janagana.namasteneedham.com` |
| `EMAIL_FROM_NAME` | All | Sender name, e.g., `JanaGana` |

---

## Payments (Stripe)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production, Preview | Public key, safe in client |
| `STRIPE_SECRET_KEY` | Production, Preview | Private key, server-only. Get from [dashboard.stripe.com](https://dashboard.stripe.com/account/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Production, Preview | For `/api/webhooks/stripe` validation. Get from Stripe Webhooks dashboard. |
| `STRIPE_PRICE_ID` | Production (optional) | Subscription price ID if using Stripe billing |

---

## File Upload (Cloudinary)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | All | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Production, Preview | From [Cloudinary Settings](https://cloudinary.com/console/settings/api-keys) |
| `CLOUDINARY_API_SECRET` | Production, Preview | From Cloudinary Settings (keep secret, server-only) |
| `CLOUDINARY_URL` | Development, Preview, Production | Full connection string: `cloudinary://key:secret@cloud-name` |

---

## Error Tracking (Sentry)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `SENTRY_DSN` | Production, Preview | Get from [sentry.io](https://sentry.io) project settings |
| `NEXT_PUBLIC_SENTRY_DSN` | Production, Preview | Public DSN for client-side errors |
| `SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING` | Production, Preview | Set to `1` to suppress deprecation warnings (safe to ignore) |

---

## Optional: Google OAuth (for sign-in)

| Variable | Environments | Notes |
|----------|--------------|-------|
| `GOOGLE_CLIENT_ID` | All | From Google Cloud Console → OAuth 2.0 Credentials |
| `GOOGLE_CLIENT_SECRET` | Production, Preview | From Google Console (keep secret) |

---

## Vercel Build

Add this to **Vercel Dashboard → Settings → Build & Development → Build Command**:

```
npm run bootstrap:validate-env && npm run build
```

This ensures all required env vars are set before the build proceeds. If missing, the build fails with clear error messages.

---

## Validation

Run locally to validate env var setup:

```bash
npm run bootstrap:validate-env
```

This checks that:
- All required `TENANT_*` vars are set
- All `NEXT_PUBLIC_*` vars are non-empty
- Database connection string is valid
- Vercel project is correctly linked (if using Vercel)

---

## Local Development

1. **Pull from Vercel:**
   ```bash
   vercel env pull --yes
   ```

2. **Add sensitive vars to `.env.local` (not committed):**
   ```
   CLERK_SECRET_KEY=sk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. **Run validation:**
   ```bash
   npm run bootstrap:validate-env
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```
