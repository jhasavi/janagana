# Jana Gana Deployment Guide

This guide covers the complete deployment process for the Jana Gana SaaS platform to production environments.

## Architecture Overview

- **Frontend (Web)**: Vercel (Next.js)
- **Backend (API)**: Railway (NestJS)
- **Database**: Neon (PostgreSQL)
- **Cache**: Upstash (Redis)
- **File Storage**: Cloudinary
- **Monitoring**: Sentry
- **Authentication**: Clerk
- **Payments**: Stripe
- **Email**: Resend

## Pre-deployment Checklist

Before deploying to production, ensure you have:

- [ ] Neon database created and DATABASE_URL saved
- [ ] Upstash Redis created and REDIS_URL saved
- [ ] Clerk production app created with API keys
- [ ] Stripe production account with API keys
- [ ] Stripe Connect configured for platform payments
- [ ] Resend domain verified and API key obtained
- [ ] Cloudinary account set up with API credentials
- [ ] Sentry projects created (web + api) with DSNs
- [ ] Custom domain (janagana.app) purchased and ready
- [ ] GitHub repository configured with necessary secrets
- [ ] Railway project created and API key obtained
- [ ] Vercel project created and API token obtained

---

## Step 1: Neon PostgreSQL Setup

### Create Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project named "janagana-prod"
3. Choose a region closest to your users
4. Copy the `DATABASE_URL` from the project settings

### Run Migrations

```bash
# Set the DATABASE_URL environment variable
export DATABASE_URL="postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/janagana?sslmode=require"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Verify migration status
cd packages/database
npx prisma migrate status
```

### Save Credentials

Add the `DATABASE_URL` to:
- GitHub Secrets (`DATABASE_URL`)
- Railway Environment Variables
- Local `.env.prod` file

---

## Step 2: Upstash Redis Setup

### Create Upstash Redis

1. Go to [upstash.com](https://upstash.com) and sign up
2. Create a new database named "janagana-redis"
3. Choose a region (preferably same as Neon)
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Configure Redis

The application uses Redis for:
- Session storage
- Rate limiting
- Cache invalidation
- Background job queues

### Save Credentials

Add to environment variables:
- `REDIS_URL` (formatted as `rediss://default:TOKEN@HOST`)
- GitHub Secrets
- Railway Environment Variables

---

## Step 3: Clerk Authentication Setup

### Create Production Instance

1. Go to [clerk.com](https://clerk.com) and sign in
2. Create a new application "Jana Gana Production"
3. Enable the following features:
   - Email/password authentication
   - Social providers (Google, GitHub)
   - Multi-tenancy (subdomain support)
   - Webhooks

### Configure Allowed Origins

Add the following URLs to your Clerk application:

**Allowed Origins:**
- `https://janagana.app`
- `https://*.janagana.app`
- `https://api.janagana.app`

**Redirect URLs:**
- `https://janagana.app/sign-in`
- `https://janagana.app/sign-up`
- `https://janagana.app/portal/*`
- `https://*.janagana.app/portal/*`

**Webhook URLs:**
- `https://api.janagana.app/webhooks/clerk`

### Save Credentials

- `CLERK_PUBLISHABLE_KEY` (public)
- `CLERK_SECRET_KEY` (private)
- `CLERK_WEBHOOK_SECRET` (for webhook verification)

---

## Step 4: Stripe Payment Setup

### Enable Live Mode

1. Go to [stripe.com](https://stripe.com) and sign in
2. Switch to "Live mode"
3. Copy the live API keys:
   - `STRIPE_PUBLISHABLE_KEY` (public)
   - `STRIPE_SECRET_KEY` (private)

### Configure Stripe Connect

1. Enable Stripe Connect for platform payments
2. Create a Connect application
3. Configure onboarding flow
4. Set up webhook endpoints:
   - `https://api.janagana.app/webhooks/stripe`
   - `https://api.janagana.app/webhooks/stripe-connect`

### Configure Webhooks

Create webhooks for the following events:

**Standard Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

**Connect Events:**
- `account.updated`
- `account.external_account.created`
- `account.external_account.deleted`
- `payout.created`
- `payout.paid`

### Save Credentials

- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_CLIENT_ID` (for Connect)

---

## Step 5: Resend Email Setup

### Verify Domain

1. Go to [resend.com](https://resend.com) and sign up
2. Add your domain `janagana.app`
3. Verify DNS records:
   - TXT record for verification
   - CNAME record for DKIM
   - MX record for email delivery

### Configure Email Templates

Create email templates for:
- Welcome email
- Password reset
- Event registration confirmation
- Membership renewal reminders
- Invoice notifications

### Save Credentials

- `RESEND_API_KEY`

---

## Step 6: Cloudinary File Storage Setup

### Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com) and sign up
2. Create a new cloud named "janagana"
3. Enable auto-upload for user uploads
4. Configure image transformations

### Configure Settings

**Upload Presets:**
- Member photos: 400x400, face detection
- Event images: 1200x630, aspect ratio
- Documents: PDF/DOCX only

**Security:**
- Enable signed uploads
- Configure allowed formats
- Set size limits

### Save Credentials

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

## Step 7: Sentry Monitoring Setup

### Create Sentry Projects

1. Go to [sentry.io](https://sentry.io) and sign in
2. Create a new organization "Jana Gana"
3. Create two projects:
   - `janagana-web` (Next.js frontend)
   - `janagana-api` (NestJS backend)

### Configure Projects

**Web Project:**
- Framework: Next.js
- Source maps: Enabled
- Session replay: Enabled (for errors)

**API Project:**
- Framework: Node.js
- Source maps: Enabled
- Performance monitoring: Enabled

### Save Credentials

- `SENTRY_DSN` (API)
- `NEXT_PUBLIC_SENTRY_DSN` (Web)
- `SENTRY_AUTH_TOKEN` (for source map uploads)

---

## Step 8: Railway API Deployment

### Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Create Railway Project

```bash
railway new
# Select "Empty Project"
# Name it "janagana-api"
```

### Add PostgreSQL (Optional)

If not using Neon, add PostgreSQL via Railway:
```bash
railway add postgresql
```

### Configure Environment Variables

In Railway dashboard, add all required environment variables:
- `DATABASE_URL`
- `REDIS_URL`
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SENTRY_DSN`
- `JWT_SECRET`
- `APP_URL`

### Deploy

```bash
# Link to project
railway link

# Deploy
railway up

# View logs
railway logs
```

### Configure Health Check

Set health check path to `/health` in Railway settings.

---

## Step 9: Vercel Web Deployment

### Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### Create Vercel Project

```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to ./apps/web
# - Framework preset: Next.js
```

### Configure Environment Variables

In Vercel dashboard, add environment variables:

**Public Variables:**
- `NEXT_PUBLIC_APP_URL` = `https://janagana.app`
- `NEXT_PUBLIC_API_URL` = `https://api.janagana.app`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_SENTRY_DSN`

**Private Variables:**
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Deploy to Production

```bash
vercel --prod
```

### Configure Custom Domain

1. In Vercel project settings, add domain `janagana.app`
2. Vercel will provide CNAME records to add to your DNS:
   - CNAME: `janagana.app` → `cname.vercel-dns.com`

3. For subdomain routing, add wildcard:
   - CNAME: `*.janagana.app` → `cname.vercel-dns.com`

4. Update DNS records with your domain provider

---

## Step 10: Domain Configuration

### DNS Records

Add the following DNS records to your domain provider:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | cname.vercel-dns.com | 3600 |
| CNAME | * | cname.vercel-dns.com | 3600 |
| TXT | @ | v=spf1 include:_spf.google.com ~all | 3600 |

### SSL Configuration

Vercel automatically provisions SSL certificates for:
- `janagana.app`
- `*.janagana.app`

### Test Subdomain Routing

Test that subdomains work correctly:
- `tenant1.janagana.app` → Should route to tenant dashboard
- `tenant2.janagana.app` → Should route to tenant dashboard
- `janagana.app` → Should route to marketing page

---

## Step 11: GitHub Actions Configuration

### Configure Repository Secrets

Add the following secrets to your GitHub repository:

**Database & Cache:**
- `DATABASE_URL`
- `REDIS_URL`

**Authentication:**
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Payments:**
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Email:**
- `RESEND_API_KEY`

**File Storage:**
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

**Monitoring:**
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

**Deployment:**
- `RAILWAY_API_KEY`
- `RAILWAY_PROJECT_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Notifications (Optional):**
- `SLACK_WEBHOOK_URL`

### Test CI Pipeline

```bash
# Push to develop branch to test CI
git push origin develop

# Check GitHub Actions tab for results
```

---

## Step 12: Post-Deploy Verification

### Health Checks

Run the following checks to verify deployment:

```bash
# API Health Check
curl https://api.janagana.app/health

# Web Health Check
curl https://janagana.app/api/health

# Database Connection
# Check Railway logs for database connection success

# Redis Connection
# Check Railway logs for Redis connection success
```

### Functional Testing

Test the following user flows:

**Authentication:**
- [ ] Sign up as new user
- [ ] Sign in with email/password
- [ ] Sign in with Google
- [ ] Sign out
- [ ] Password reset

**Organization Onboarding:**
- [ ] Create new organization
- [ ] Complete onboarding wizard
- [ ] Access dashboard

**Member Management:**
- [ ] Create member
- [ ] Edit member
- [ ] Delete member
- [ ] Import members via CSV
- [ ] Search and filter members

**Events:**
- [ ] Create event
- [ ] Add tickets
- [ ] Publish event
- [ ] Register for event
- [ ] Check in attendee

**Payments:**
- [ ] Subscribe to plan
- [ ] Process payment
- [ ] Receive invoice
- [ ] Cancel subscription

**Email:**
- [ ] Send welcome email
- [ ] Send password reset
- [ ] Send event confirmation

**Webhooks:**
- [ ] Stripe webhook received
- [ ] Clerk webhook received

### Performance Testing

```bash
# Run load test
npm run test:load

# Check response times
# - API: < 200ms average
# - Web: < 2s first contentful paint
# - Database: < 50ms query time
```

### Security Audit

Run security checks:

```bash
# Dependency audit
npm audit

# OWASP ZAP scan
# Run on production URL

# SSL check
curl https://www.ssllabs.com/ssltest/analyze.html?d=janagana.app
```

---

## Monitoring & Alerts

### Sentry Alerts

Configure Sentry alerts for:
- Error rate > 1%
- New errors introduced
- Performance degradation

### Railway Alerts

Configure Railway alerts for:
- CPU usage > 80%
- Memory usage > 80%
- Disk usage > 80%
- Service restarts

### Vercel Alerts

Configure Vercel alerts for:
- Build failures
- Deployment errors
- Edge function errors

---

## Rollback Procedure

### API Rollback

```bash
# Via Railway CLI
railway rollback

# Or deploy previous commit
git checkout <previous-commit>
railway up
```

### Web Rollback

```bash
# Via Vercel CLI
vercel rollback

# Or deploy previous commit
git checkout <previous-commit>
vercel --prod
```

### Database Rollback

```bash
# Revert to previous migration
cd packages/database
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs in Sentry
- Monitor API response times
- Check Stripe payment failures

**Weekly:**
- Review database backup status
- Check storage usage in Cloudinary
- Review email delivery rates

**Monthly:**
- Review and rotate secrets
- Check dependency updates
- Review Stripe Connect payouts
- Audit user access

---

## Troubleshooting

### Common Issues

**API returning 500 errors:**
- Check Railway logs
- Verify DATABASE_URL is correct
- Check Redis connection

**Web deployment fails:**
- Check Vercel build logs
- Verify environment variables
- Check for build errors

**Stripe webhooks failing:**
- Verify webhook secret
- Check webhook URL is accessible
- Review Stripe dashboard for errors

**Emails not sending:**
- Verify Resend API key
- Check domain DNS records
- Review email templates

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Neon Documentation](https://neon.tech/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Sentry Documentation](https://docs.sentry.io)

---

## Cost Estimation

**Monthly Costs (approximate):**

| Service | Tier | Cost |
|---------|------|------|
| Vercel (Pro) | Pro | $20 |
| Railway | Starter | $5-20 |
| Neon | Serverless | $19-99 |
| Upstash Redis | Free | $0 |
| Clerk | Production | $25+ |
| Stripe | Per transaction | 2.9% + 30¢ |
| Resend | Free tier | $0 |
| Cloudinary | Free tier | $0 |
| Sentry | Developer | $26 |

**Total:** ~$95-200/month (excluding Stripe transaction fees)

---

## Emergency Contacts

- **Technical Lead**: [email]
- **DevOps**: [email]
- **Security**: [email]
