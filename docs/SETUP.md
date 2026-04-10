# OrgFlow Setup Guide

This guide will walk you through setting up the OrgFlow development environment, including configuring all required third-party services.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Service Configuration](#service-configuration)
  - [Clerk Authentication](#clerk-authentication)
  - [Stripe Payments](#stripe-payments)
  - [Resend Email](#resend-email)
  - [Cloudinary Media](#cloudinary-media)
  - [Sentry Error Tracking](#sentry-error-tracking)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **pnpm** or npm (comes with Node.js)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

## Quick Start

The easiest way to set up OrgFlow is to use the automated setup script:

```bash
# Clone the repository
git clone https://github.com/your-org/orgflow.git
cd orgflow

# Run the setup script
./scripts/setup.sh
```

The script will:
1. Check Node.js version (must be 20+)
2. Check Docker is running
3. Create `.env.local` files from examples
4. Install dependencies
5. Start Docker containers (PostgreSQL, Redis)
6. Run database migrations
7. Seed the database

After the script completes, you'll need to fill in the environment variables (see [Service Configuration](#service-configuration)).

## Service Configuration

### Clerk Authentication

Clerk provides user authentication and user management for OrgFlow.

#### Setup Steps

1. **Create a Clerk Account**
   - Go to [clerk.com](https://clerk.com/)
   - Click "Sign up" and create an account
   - Verify your email address

2. **Create a New Application**
   - In the Clerk Dashboard, click "Add application"
   - Give your application a name (e.g., "OrgFlow Dev")
   - Choose "Email & Password" as the authentication method
   - Click "Create application"

3. **Get API Keys**
   - In your application dashboard, go to "API Keys" in the left sidebar
   - Copy the **Secret Key** (starts with `sk_test_...`)
   - Copy the **Publishable Key** (starts with `pk_test_...`)

4. **Configure Redirect URLs**
   - Go to "Domains" in the left sidebar
   - Add your development URLs:
     - `http://localhost:3000`
     - `http://localhost:3000/sign-in`
     - `http://localhost:3000/sign-up`
   - For production, add your production domain

5. **Set Up Webhook**
   - Go to "Webhooks" in the left sidebar
   - Click "Add endpoint"
   - Set the webhook URL to: `http://localhost:4000/webhooks/clerk`
   - Select events to listen for:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created`
     - `session.ended`
   - Click "Create"
   - Copy the **Webhook Secret** (starts with `whsec_...`)

#### Environment Variables

Add these to `apps/api/.env.local`:

```bash
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

Add these to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
```

### Stripe Payments

Stripe handles payment processing and Stripe Connect for multi-tenant payments.

#### Setup Steps

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com/)
   - Click "Start now" and create an account
   - Complete the onboarding process

2. **Get API Keys**
   - In the Stripe Dashboard, go to "Developers" → "API keys"
   - Copy the **Secret key** (starts with `sk_test_...`)
   - Copy the **Publishable key** (starts with `pk_test_...`)

3. **Set Up Payment Webhook**
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Set the webhook URL to: `http://localhost:4000/webhooks/stripe`
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click "Create endpoint"
   - Copy the **Signing secret** (starts with `whsec_...`)

4. **Set Up Stripe Connect**
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Select "Connect" as the event type
   - Set the webhook URL to: `http://localhost:4000/webhooks/stripe/connect`
   - Select Connect events:
     - `account.updated`
     - `account.external_account.created`
     - `account.external_account.deleted`
     - `account.external_account.updated`
   - Click "Create endpoint"
   - Copy the **Signing secret** (starts with `whsec_...`)

5. **Configure Platform Fee**
   - Go to "Settings" → "Connect" → "Platform settings"
   - Set your platform fee percentage (default: 2%)

#### Environment Variables

Add these to `apps/api/.env.local`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_WEBHOOK_SECRET="whsec_..."
PLATFORM_FEE_PERCENTAGE=2
```

Add these to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Resend Email

Resend provides transactional email services for OrgFlow.

#### Setup Steps

1. **Create a Resend Account**
   - Go to [resend.com](https://resend.com/)
   - Click "Sign up" and create an account
   - Verify your email address

2. **Get API Key**
   - In the Resend Dashboard, go to "API Keys"
   - Click "Create API Key"
   - Give it a name (e.g., "OrgFlow Dev")
   - Copy the API key (starts with `re_...`)

3. **Verify Sender Domain**
   - Go to "Domains" in the left sidebar
   - Click "Add domain"
   - Enter your domain (e.g., `orgflow.app`)
   - Add the DNS records provided by Resend to your domain's DNS settings
   - Wait for DNS propagation (usually takes a few minutes to 24 hours)
   - For development, you can use Resend's default `@resend.dev` domain

#### Environment Variables

Add these to `apps/api/.env.local`:

```bash
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@orgflow.app"
EMAIL_FROM_NAME="OrgFlow"
```

### Cloudinary Media

Cloudinary provides image and file storage for OrgFlow.

#### Setup Steps

1. **Create a Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com/)
   - Click "Sign up for free" and create an account
   - Verify your email address

2. **Get Credentials**
   - In the Cloudinary Dashboard, go to "Account Details"
   - Copy the **Cloud name**
   - Copy the **API Key**
   - Copy the **API Secret**

3. **Configure Upload Settings** (Optional)
   - Go to "Settings" → "Upload"
   - Configure allowed formats, file size limits, etc.
   - Set up auto-formatting and optimization

#### Environment Variables

Add these to `apps/api/.env.local`:

```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

Add these to `apps/web/.env.local`:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
```

### Sentry Error Tracking

Sentry provides error tracking and performance monitoring for OrgFlow.

#### Setup Steps

1. **Create a Sentry Account**
   - Go to [sentry.io](https://sentry.io/)
   - Click "Sign up" and create an account
   - Verify your email address

2. **Create a Project**
   - In the Sentry Dashboard, click "Create Project"
   - Select "NestJS" for the API
   - Select "Next.js" for the web app
   - Give your project a name (e.g., "orgflow-api", "orgflow-web")
   - Click "Create Project"

3. **Get DSN**
   - In your project settings, go to "Client Keys (DSN)"
   - Copy the **DSN** (Data Source Name)

4. **Get Auth Token** (for source maps upload)
   - Go to "Settings" → "Auth Tokens"
   - Click "Create New Token"
   - Give it a name (e.g., "orgflow-deploy")
   - Select the `project:write` scope
   - Copy the token

#### Environment Variables

Add these to `apps/api/.env.local`:

```bash
SENTRY_DSN="https://..."
```

Add these to `apps/web/.env.local`:

```bash
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="your-auth-token"
```

## Local Development

### Starting the Development Servers

Once you've configured all environment variables, start the development servers:

```bash
# Terminal 1: Start the API
cd apps/api
npm run dev

# Terminal 2: Start the Web App
cd apps/web
npm run dev
```

### Access Points

- **API**: http://localhost:4000
- **API Documentation**: http://localhost:4000/api/docs
- **Web App**: http://localhost:3000
- **Database**: localhost:5432 (via Docker)
- **Redis**: localhost:6379 (via Docker)

### Database Management

```bash
# Generate a new migration
cd packages/database
npx prisma migrate dev --name your_migration_name

# Apply migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Running Tests

```bash
# Run API tests
cd apps/api
npm test

# Run web app tests
cd apps/web
npm test
```

## Production Deployment

### Environment Variables

For production, you'll need to update the environment variables with production values:

1. Use production API keys (not test keys)
2. Update URLs to production domains
3. Set `NODE_ENV=production`
4. Use production database and Redis instances
5. Configure production Sentry DSN

### Deployment Checklist

- [ ] Update all API keys to production versions
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Configure production Redis
- [ ] Update CORS origins to production domain
- [ ] Configure production webhooks
- [ ] Set up SSL certificates
- [ ] Configure CDN for static assets
- [ ] Enable Sentry error tracking
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review security settings

### Recommended Hosting

- **API**: Railway, Fly.io, or AWS ECS
- **Web**: Vercel, Netlify, or AWS Amplify
- **Database**: Supabase, Neon, or AWS RDS
- **Redis**: Upstash or AWS ElastiCache
- **File Storage**: Cloudinary (already configured)

## Troubleshooting

### Common Issues

#### Docker won't start

```bash
# Check Docker status
docker info

# Restart Docker Desktop
# (Mac) Click Docker Desktop icon → Restart
# (Windows) Right-click Docker tray icon → Restart
```

#### Database connection errors

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs <container-name>

# Restart PostgreSQL container
docker restart <container-name>
```

#### Redis connection errors

```bash
# Check if Redis container is running
docker ps | grep redis

# View Redis logs
docker logs <container-name>

# Test Redis connection
redis-cli ping
```

#### Environment variable validation errors

The API will fail to start if required environment variables are missing. Check the error message for the specific variable that's missing and add it to `.env.local`.

#### Clerk authentication not working

- Verify the Clerk keys are correct
- Check that redirect URLs are configured in Clerk Dashboard
- Ensure webhook secret matches what's in Clerk Dashboard
- Check Clerk webhook logs for failed deliveries

#### Stripe webhooks not receiving events

- Verify webhook endpoints are accessible from Stripe
- Check webhook secret matches what's in Stripe Dashboard
- Use Stripe CLI to test webhooks locally:
  ```bash
  stripe listen --forward-to localhost:4000/webhooks/stripe
  ```

#### Resend emails not sending

- Verify your sender domain is verified in Resend
- Check that the API key is valid
- Review Resend logs for delivery failures
- For development, use `@resend.dev` domain

### Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/your-org/orgflow/issues)
2. Review the [API Documentation](http://localhost:4000/api/docs)
3. Check service-specific documentation:
   - [Clerk Docs](https://clerk.com/docs)
   - [Stripe Docs](https://stripe.com/docs)
   - [Resend Docs](https://resend.com/docs)
   - [Cloudinary Docs](https://cloudinary.com/documentation)
   - [Sentry Docs](https://docs.sentry.io/)

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com)
