# Janagana Setup Guide

This guide will walk you through setting up the Janagana development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Service Configuration](#service-configuration)
  - [Clerk Authentication](#clerk-authentication)
  - [Database Setup](#database-setup)
  - [Stripe Payments (Optional)](#stripe-payments-optional)
  - [Sentry Error Tracking (Optional)](#sentry-error-tracking-optional)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** (local installation or hosted database)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/janagana.git
cd janagana

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed database with demo data
npm run seed

# Start development server
npm run dev
```

Access the app at: http://localhost:3000

## Service Configuration

### Clerk Authentication

Clerk provides user authentication and user management for Janagana.

#### Setup Steps

1. **Create a Clerk Account**
   - Go to [clerk.com](https://clerk.com/)
   - Click "Sign up" and create an account
   - Verify your email address

2. **Create a New Application**
   - In the Clerk Dashboard, click "Add application"
   - Give your application a name (e.g., "Janagana Dev")
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
     - `http://localhost:3000/dashboard`
   - For production, add your production domain

#### Environment Variables

Add these to `.env.local`:

```bash
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
```

### Database Setup

Janagana uses PostgreSQL with Prisma ORM.

#### Option 1: Local PostgreSQL

1. **Install PostgreSQL**
   - Mac: `brew install postgresql`
   - Windows: Download from [postgresql.org](https://postgresql.org/download)
   - Linux: Use your package manager

2. **Create Database**
   ```bash
   psql postgres
   CREATE DATABASE janagana_dev;
   \q
   ```

3. **Set DATABASE_URL**
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost:5432/janagana_dev"
   ```

#### Option 2: Hosted PostgreSQL (Recommended)

**Neon** (Serverless PostgreSQL):
1. Go to [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the `DATABASE_URL` from the project settings

**Supabase**:
1. Go to [supabase.com](https://supabase.com)
2. Create a free account
3. Create a new project
4. Copy the `DATABASE_URL` from project settings

#### Environment Variables

Add to `.env.local`:

```bash
DATABASE_URL="postgresql://..."
```

### Stripe Payments (Optional)

Stripe handles payment processing for subscriptions and donations.

#### Setup Steps

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com/)
   - Click "Start now" and create an account
   - Complete the onboarding process

2. **Get API Keys**
   - In the Stripe Dashboard, go to "Developers" → "API keys"
   - Copy the **Secret key** (starts with `sk_test_...`)
   - Copy the **Publishable key** (starts with `pk_test_...`)

3. **Set Up Webhook** (for production)
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Set the webhook URL to your production domain
   - Select events to listen for

#### Environment Variables

Add these to `.env.local`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Sentry Error Tracking (Optional)

Sentry provides error tracking and performance monitoring.

#### Setup Steps

1. **Create a Sentry Account**
   - Go to [sentry.io](https://sentry.io/)
   - Click "Sign up" and create an account

2. **Create a Project**
   - Select "Next.js" as the platform
   - Give your project a name
   - Click "Create Project"

3. **Get DSN**
   - Copy the **DSN** (Data Source Name) from project settings

#### Environment Variables

Add these to `.env.local`:

```bash
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

## Local Development

### Starting the Development Server

```bash
npm run dev
```

Access the app at: http://localhost:3000

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes (development only)
npm run db:push

# Seed database with demo data
npm run seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Run TypeScript type check
npm run typecheck

# Run tests
npm run test
```

### Build for Production

```bash
npm run build
npm run start
```

## Production Deployment

### Vercel Deployment (Recommended)

Janagana is currently deployed on Vercel. To deploy:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Use production API keys (not test keys)
   - Set `NEXT_PUBLIC_APP_URL` to your production domain

### Environment Variables for Production

```bash
# Required
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional (Stripe)
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Optional (Sentry)
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

### Deployment Checklist

- [ ] Update all API keys to production versions
- [ ] Configure production database
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure Clerk redirect URLs for production
- [ ] Enable Sentry error tracking
- [ ] Test all critical user flows
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy

## Troubleshooting

### Common Issues

#### Database connection errors

```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test database connection
psql $DATABASE_URL

# Reset database (development only - deletes all data)
npm run db:push --force-reset
```

#### Prisma client out of sync

```bash
# Regenerate Prisma client
npm run db:generate
```

#### Clerk authentication not working

- Verify the Clerk keys are correct
- Check that redirect URLs are configured in Clerk Dashboard
- Ensure you're using the correct environment (test vs production)

#### Build errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Getting Help

If you encounter issues not covered here:

1. Check the [TODO.md](../TODO.md) for known issues
2. Review [legacy documentation](./legacy/) for reference
3. Check service-specific documentation:
   - [Clerk Docs](https://clerk.com/docs)
   - [Prisma Docs](https://www.prisma.io/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Vercel Docs](https://vercel.com/docs)

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
