# Render Environment Variables Checklist

This document lists all environment variables that need to be set in the Render dashboard for the Janagana API deployment.

## How to Add Environment Variables in Render

1. Go to your Render dashboard: https://dashboard.render.com/
2. Navigate to the `janagana-api` service
3. Click on the "Environment" tab
4. Click "Add Environment Variable" for each variable below
5. Set `sync: false` variables manually (these are marked with 🔒)

## REQUIRED (app won't start without these)

- [ ] **NODE_ENV** = `production`
  - Set automatically by Render, but verify it's set to production

- [ ] **PORT** = `4000`
  - Set automatically by Render, but verify it's set to 4000

- [ ] **DATABASE_URL** 🔒
  - Get from Neon PostgreSQL dashboard
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Example: `postgresql://neondb_owner:xxx@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`

- [ ] **JWT_SECRET** 🔒
  - Generate using: `openssl rand -hex 64`
  - Or run: `node scripts/generate-secrets.js`
  - Must be at least 32 characters

- [ ] **CLERK_SECRET_KEY** 🔒
  - Get from Clerk dashboard: https://dashboard.clerk.com/
  - Format: `sk_test_...` or `sk_live_...`
  - Navigate to your application → API Keys → Secret Key

- [ ] **MEMBER_JWT_SECRET** 🔒
  - Generate using: `openssl rand -hex 64`
  - Or run: `node scripts/generate-secrets.js`
  - Must be different from JWT_SECRET
  - Used for member portal authentication

## REQUIRED FOR FEATURES (features won't work without these)

- [ ] **REDIS_URL** 🔒
  - Get from Upstash dashboard: https://console.upstash.com/
  - Format: `redis://xxx.upstash.io:6379`
  - Used for caching and sessions

- [ ] **UPSTASH_REDIS_REST_URL** 🔒
  - Get from Upstash dashboard → REST API
  - Format: `https://xxx.upstash.io`

- [ ] **UPSTASH_REDIS_REST_TOKEN** 🔒
  - Get from Upstash dashboard → REST API
  - Format: long alphanumeric string

- [ ] **STRIPE_SECRET_KEY** 🔒
  - Get from Stripe dashboard: https://dashboard.stripe.com/
  - Format: `sk_test_...` or `sk_live_...`
  - Navigate to Developers → API keys → Secret key

- [ ] **STRIPE_WEBHOOK_SECRET** 🔒
  - Get from Stripe dashboard → Webhooks
  - Format: `whsec_...`
  - See `docs/STRIPE-WEBHOOKS.md` for setup instructions

- [ ] **STRIPE_CONNECT_WEBHOOK_SECRET** 🔒
  - Get from Stripe dashboard → Webhooks (for Connect)
  - Format: `whsec_...`
  - Optional if not using Stripe Connect

- [ ] **RESEND_API_KEY** 🔒
  - Get from Resend dashboard: https://resend.com/
  - Format: `re_...`
  - Used for transactional emails

## OPTIONAL (feature degrades gracefully without these)

- [ ] **CLOUDINARY_CLOUD_NAME** 🔒
  - Get from Cloudinary dashboard: https://cloudinary.com/
  - Used for image uploads

- [ ] **CLOUDINARY_API_KEY** 🔒
  - Get from Cloudinary dashboard

- [ ] **CLOUDINARY_API_SECRET** 🔒
  - Get from Cloudinary dashboard

- [ ] **SENTRY_DSN** 🔒
  - Get from Sentry dashboard: https://sentry.io/
  - Format: `https://xxx@oxxx.ingest.us.sentry.io/xxx`
  - Used for error tracking

## PRE-CONFIGURED (set by render.yaml)

These are already set in `render.yaml` and should not need manual configuration:

- **PLATFORM_FEE_PERCENTAGE** = `2`
- **JWT_EXPIRES_IN** = `7d`
- **MEMBER_JWT_EXPIRES_IN** = `30d`
- **CORS_ORIGINS** = `https://janagana.namasteneedham.com,https://janagana-api.onrender.com,http://localhost:3000,http://localhost:3001`
- **WEB_ORIGIN** = `https://janagana.namasteneedham.com`
- **APP_URL** = `https://janagana-api.onrender.com`
- **EMAIL_FROM** = `noreply@namasteneedham.com`
- **EMAIL_FROM_NAME** = `Janagana`

## After Setting Environment Variables

1. Click "Save Changes" in Render
2. Click "Manual Deploy" → "Clear build cache & deploy"
3. Monitor the build logs to ensure the deployment succeeds
4. Check the health endpoint: `https://janagana-api.onrender.com/api/v1/health/live`

## Troubleshooting

### Build Fails
- Check that `DATABASE_URL` is valid and accessible
- Verify all required environment variables are set
- Check build logs for specific error messages

### App Crashes on Startup
- Verify `DATABASE_URL` is correct
- Check that `JWT_SECRET` and `CLERK_SECRET_KEY` are set
- Review logs in Render dashboard

### Features Not Working
- Check that feature-specific environment variables are set (e.g., `REDIS_URL`, `STRIPE_SECRET_KEY`)
- Verify API keys are valid and not expired
- Check webhook secrets match what's configured in third-party services
