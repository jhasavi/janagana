# Vercel Environment Variables Checklist

This document lists all environment variables that need to be set in the Vercel dashboard for the Janagana frontend deployment.

## How to Add Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Navigate to the `janagana` project
3. Click on **Settings** → **Environment Variables**
4. Click **Add** for each variable below
5. Select the appropriate environment(s): Production, Preview, Development

## CRITICAL - MUST SET FIRST (app will 500 without these)

- [ ] **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** 🔒
  - Get from Clerk dashboard: https://dashboard.clerk.com/
  - Format: `pk_test_...` or `pk_live_...`
  - Navigate to your application → API Keys → Publishable Key
  - Public key (exposed to browser)
  - **REQUIRED** - App will crash without this

- [ ] **CLERK_SECRET_KEY** 🔒
  - Get from Clerk dashboard
  - Format: `sk_test_...` or `sk_live_...`
  - Secret key (server-side only)
  - **REQUIRED** - App will crash without this

## REQUIRED (app won't work without these)

- [ ] **NEXT_PUBLIC_API_URL** = `https://janagana-api.onrender.com/api/v1`
  - Public API URL (exposed to browser)
  - Used for client-side API calls

- [ ] **API_URL** = `https://janagana-api.onrender.com/api/v1`
  - Server-side API URL
  - Used for SSR and API routes

- [ ] **NEXT_PUBLIC_APP_URL** = `https://janagana.namasteneedham.com`
  - Public app URL (exposed to browser)
  - Used for redirects and OAuth callbacks

- [ ] **NEXT_PUBLIC_APP_DOMAIN** = `namasteneedham.com`
  - App domain (exposed to browser)
  - Used for cookie settings and subdomain resolution

- [ ] **NEXT_PUBLIC_APP_NAME** = `Janagana`
  - App name (exposed to browser)
  - Used in UI and page titles

## AUTHENTICATION (Clerk) - ADDITIONAL

- [ ] **NEXT_PUBLIC_CLERK_SIGN_IN_URL** = `/sign-in`
  - Sign-in page path
  - Public (exposed to browser)

- [ ] **NEXT_PUBLIC_CLERK_SIGN_UP_URL** = `/sign-up`
  - Sign-up page path
  - Public (exposed to browser)

- [ ] **NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL** = `/dashboard`
  - Redirect after sign-in
  - Public (exposed to browser)

- [ ] **NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL** = `/onboarding`
  - Redirect after sign-up
  - Public (exposed to browser)

## PAYMENTS (Stripe)

- [ ] **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** 🔒
  - Get from Stripe dashboard: https://dashboard.stripe.com/
  - Format: `pk_test_...` or `pk_live_...`
  - Navigate to Developers → API keys → Publishable key
  - Public key (exposed to browser)

## MEDIA (Cloudinary)

- [ ] **NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME** 🔒
  - Get from Cloudinary dashboard: https://cloudinary.com/
  - Public cloud name (exposed to browser)

## ERROR TRACKING (Sentry)

- [ ] **SENTRY_DSN** 🔒
  - Get from Sentry dashboard: https://sentry.io/
  - Format: `https://xxx@oxxx.ingest.us.sentry.io/xxx`
  - Server-side DSN

- [ ] **NEXT_PUBLIC_SENTRY_DSN** 🔒
  - Get from Sentry dashboard
  - Format: `https://xxx@oxxx.ingest.us.sentry.io/xxx`
  - Public DSN (exposed to browser for client-side errors)

- [ ] **SENTRY_AUTH_TOKEN** 🔒
  - Get from Sentry Settings → Auth Tokens
  - Used for uploading source maps to Sentry

## FEATURE FLAGS

- [ ] **NEXT_PUBLIC_ENABLE_ANALYTICS** = `true`
  - Enable analytics tracking
  - Set to "true" or "false"

## Environment-Specific Values

### Production
- `NEXT_PUBLIC_API_URL` = `https://janagana-api.onrender.com/api/v1`
- `API_URL` = `https://janagana-api.onrender.com/api/v1`
- `NEXT_PUBLIC_APP_URL` = `https://janagana.namasteneedham.com`
- `NEXT_PUBLIC_APP_DOMAIN` = `namasteneedham.com`

### Preview (automatic Vercel preview deployments)
- `NEXT_PUBLIC_API_URL` = `https://janagana-api.onrender.com/api/v1`
- `API_URL` = `https://janagana-api.onrender.com/api/v1`
- `NEXT_PUBLIC_APP_URL` = `https://your-preview-url.vercel.app`
- `NEXT_PUBLIC_APP_DOMAIN` = `vercel.app`

### Development (local)
- `NEXT_PUBLIC_API_URL` = `http://localhost:4000/api/v1`
- `API_URL` = `http://localhost:4000/api/v1`
- `NEXT_PUBLIC_APP_URL` = `http://localhost:3000`
- `NEXT_PUBLIC_APP_DOMAIN` = `localhost`

## After Setting Environment Variables

1. Click **Save** in Vercel
2. Trigger a new deployment: Click **Deployments** → **Redeploy**
3. Monitor the deployment logs to ensure it succeeds
4. Test the application at https://janagana.namasteneedham.com

## Troubleshooting

### 500 Internal Server Error
- **Most common cause:** Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY
- Check Vercel dashboard logs for specific error
- Ensure all REQUIRED environment variables are set

### Build Fails
- Check that all required environment variables are set
- Verify API keys are valid and not expired
- Check build logs for specific error messages

### App Crashes on Startup
- Verify NEXT_PUBLIC_API_URL is correct and accessible
- Check that CLERK_SECRET_KEY is set (for server-side auth)
- Review logs in Vercel dashboard

### Features Not Working
- Check that feature-specific environment variables are set (Stripe, Cloudinary, etc.)
- Verify API keys are valid and not expired
- Check that CORS is configured correctly on the API

### Authentication Issues
- Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set
- Check that Clerk redirect URLs match your domain
- Ensure NEXT_PUBLIC_APP_URL matches your actual domain

## Security Notes

- **NEVER** commit secrets to git
- Use `NEXT_PUBLIC_` prefix only for values that can be exposed to the browser
- Server-side secrets should NOT have the `NEXT_PUBLIC_` prefix
- Rotate API keys periodically
- Use different keys for development, staging, and production

## Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [Clerk Authentication Docs](https://clerk.com/docs)
- [Stripe Payment Docs](https://stripe.com/docs)
- [Cloudinary Media Docs](https://cloudinary.com/documentation)
- [Sentry Error Tracking Docs](https://docs.sentry.io/platforms/javascript/)
