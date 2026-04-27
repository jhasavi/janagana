# JanaGana — Deployment Guide (Vercel)

## Prerequisites

- Production database on [Neon](https://neon.tech)
- [Clerk](https://clerk.com) app configured for production
- [Vercel](https://vercel.com) account

---

## 1. Neon Database Setup

1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the **Connection string** (pooled connection recommended)
3. Format: `postgresql://user:password@ep-xxx.region.neon.tech/neondb?sslmode=require`

Run migrations against production DB:
```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

---

## 2. Clerk Production Setup

1. In Clerk Dashboard, switch to **Production** environment
2. Get production API keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)
3. Configure **Allowed redirect URLs** to include your Vercel domain:
   - `https://your-app.vercel.app/dashboard`
   - `https://your-app.vercel.app/onboarding`
4. Enable **Organizations** feature in Clerk settings
5. Add Webhook endpoint: `https://your-app.vercel.app/api/webhooks/clerk`

---

## 3. Stripe Setup (Optional)

1. Switch Stripe to live mode
2. Get live keys from [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys
3. Create webhook endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
4. Subscribe to events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
5. Copy the webhook signing secret (`whsec_...`)

---

## 4. Deploy to Vercel

### Via Vercel Dashboard

1. Click **New Project** → Import from Git
2. Select your repository
3. Framework preset: **Next.js** (auto-detected)
4. Add all environment variables (see table below)
5. Click **Deploy**

### Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 5. Environment Variables on Vercel

Go to **Project Settings → Environment Variables** and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | Clerk live publishable key |
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk live secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ Yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ Yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | ✅ Yes | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | ✅ Yes | `/onboarding` |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | `https://your-app.vercel.app` |
| `STRIPE_SECRET_KEY` | Optional | Stripe live secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe live publishable key |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook signing secret |
| `RESEND_API_KEY` | Optional | Resend API key for emails |
| `EMAIL_FROM` | Optional | From email address |
| `EMAIL_FROM_NAME` | Optional | From display name |

---

## 6. Post-Deploy Checklist

- [ ] Visit `https://your-app.vercel.app` — should show landing page
- [ ] Sign up for an account
- [ ] Complete onboarding — creates a Clerk org and Tenant record
- [ ] Visit `/dashboard` — should render stats page
- [ ] Create a test member
- [ ] Create a test event
- [ ] Check Vercel logs for any errors: **Project → Deployments → Functions**
- [ ] Test Stripe webhook: `stripe trigger checkout.session.completed`

---

## 7. Custom Domain

1. In Vercel Project → **Settings → Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
5. Update Clerk allowed redirect URLs to include the custom domain
6. Update Stripe webhook endpoint URL

---

## 8. Monitoring

- **Vercel Analytics**: Enable in Project Settings → Analytics
- **Vercel Logs**: Project → Deployments → View Function Logs
- **Prisma Pulse** (optional): Real-time DB change subscriptions
- **Sentry** (optional): Add `SENTRY_DSN` and `@sentry/nextjs` for error tracking

---

## Database Migrations in Production

Never use `db push` in production. Always use migrations:

```bash
# Create migration locally
npm run db:migrate

# Commit migration files
git add prisma/migrations/
git commit -m "Add new migration"
git push

# Vercel build command handles it via prisma generate
# For explicit deploy migration:
DATABASE_URL="<prod-url>" npx prisma migrate deploy
```
