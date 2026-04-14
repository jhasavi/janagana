# Janagana - Complete Setup & Development Guide

**A comprehensive guide to set up, develop, and deploy Janagana from scratch.**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Service Setup](#service-setup)
8. [Development Workflow](#development-workflow)
9. [Database Management](#database-management)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Current Features](#current-features)
13. [Roadmap](#roadmap)
14. [Troubleshooting](#troubleshooting)
15. [Monitoring](#monitoring)

---

## Project Overview

**Janagana** is a multi-tenant SaaS platform for managing memberships, events, volunteers, and clubs for non-profit and for-profit organizations.

**Live Demo:** https://janagana.namasteneedham.com

**Key Differentiators:**
- Multi-tenant architecture with organization isolation
- Comprehensive volunteer management (shifts, hours tracking)
- Club management with posts and comments
- Digital membership cards (QR code version)
- SMS notifications (Twilio integration)
- Fundraising/donations management
- API keys and webhooks for integrations

---

## Architecture

### Current Architecture (Simplified Next.js Monolith)

Janagana uses a simplified Next.js 14 architecture with Server Actions, replacing the previous Turborepo monorepo.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                           │
├─────────────────────────────────────────────────────────────────┤
│  Frontend:                                                      │
│  ├── Admin Dashboard (app/dashboard/)                           │
│  ├── Member Portal (app/portal/)                               │
│  ├── Auth Pages (app/(auth)/)                                  │
│  └── Onboarding (app/onboarding/)                              │
│                                                                 │
│  Backend:                                                       │
│  ├── Server Actions (lib/actions.ts)                           │
│  ├── Prisma Client (lib/prisma.ts)                             │
│  └── Direct Database Access                                    │
│                                                                 │
│  Integrations:                                                  │
│  - Clerk Authentication                                         │
│  - Prisma ORM (PostgreSQL)                                      │
│  - Stripe Payments                                             │
│  - Resend Email                                                │
│  - Cloudinary File Upload                                      │
│  - Twilio SMS                                                  │
│  - Sentry Error Tracking                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Neon or other provider)                            │
│  ├── Prisma Schema (50+ models)                                │
│  ├── Tenant isolation (tenant_id foreign keys)                  │
│  └── Migrations supported                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
janagana/
├── app/                       # Next.js App Router pages
│   ├── (auth)/               # Authentication pages
│   │   ├── sign-in/          # Sign-in page
│   │   └── sign-up/          # Sign-up page
│   ├── dashboard/            # Admin dashboard
│   │   ├── page.tsx          # Dashboard home
│   │   ├── members/          # Member management
│   │   ├── events/           # Event management
│   │   ├── volunteers/       # Volunteer management
│   │   ├── clubs/            # Club management
│   │   ├── fundraising/      # Fundraising/donations
│   │   └── settings/         # Organization settings
│   ├── portal/               # Member portal
│   │   └── profile/          # Member profile
│   ├── onboarding/           # Onboarding flow
│   └── api/                  # API routes
│       └── webhooks/         # Webhook endpoints
├── components/               # React components
│   └── ui/                   # shadcn/ui components
├── lib/                      # Server actions & utilities
│   ├── actions.ts           # Server Actions
│   ├── prisma.ts            # Prisma client
│   ├── email.ts             # Email service (Resend)
│   ├── sms.ts               # SMS service (Twilio)
│   ├── upload.ts            # File upload (Cloudinary)
│   └── membership-card.ts   # Membership card generation
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma        # Prisma schema
│   └── seed.ts             # Seed script
├── docs/                     # Documentation
│   ├── SETUP.md             # Setup guide
│   └── VERCEL-ENV-VARS.md   # Vercel environment variables
├── e2e/                      # E2E tests
│   └── tests/               # Playwright test files
├── .env.example             # Environment variables template
├── middleware.ts             # Next.js middleware (Clerk)
├── package.json             # Dependencies
└── README.md                # Project overview
```

---

## Tech Stack

### Frontend & Backend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** Clerk Next.js SDK v5
- **Database:** Prisma ORM
- **Server Actions:** Next.js Server Actions
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod
- **State:** React Query (TanStack Query)

### Database
- **ORM:** Prisma
- **Schema:** 50+ models
- **Provider:** PostgreSQL (Neon recommended)

### Integrations
- **Auth:** Clerk
- **Payments:** Stripe
- **Email:** Resend
- **SMS:** Twilio
- **File Upload:** Cloudinary
- **Error Tracking:** Sentry

### Deployment
- **Platform:** Vercel
- **Database:** Neon (PostgreSQL)
- **Monitoring:** Sentry

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **npm** 10+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **PostgreSQL** (local installation or hosted database)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/jhasavi/janagana.git
cd janagana

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env.local

# Fill in environment variables (see Environment Variables section)
# Edit .env.local and add your API keys

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

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the following variables:

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/janagana_dev"

# Clerk Authentication
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables (Recommended for Production)

```env
# Stripe Payments
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Resend Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@janagana.app"
EMAIL_FROM_NAME="Janagana"

# Cloudinary File Upload
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Twilio SMS
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Apple Wallet Passes (requires Apple Developer account)
PASS_CERTIFICATE_PASSWORD=""
PASS_TYPE_IDENTIFIER=""
TEAM_IDENTIFIER=""

# Sentry Error Tracking
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

---

## Service Setup

### 1. Clerk Authentication

Clerk provides user authentication and user management.

#### Setup Steps

1. **Create a Clerk Account**
   - Go to [clerk.com](https://clerk.com/)
   - Sign up and verify your email

2. **Create a New Application**
   - In Clerk Dashboard, click "Add application"
   - Name it (e.g., "Janagana Dev")
   - Choose "Email & Password" authentication
   - Click "Create application"

3. **Get API Keys**
   - Go to "API Keys" in the left sidebar
   - Copy the **Secret Key** (starts with `sk_test_...`)
   - Copy the **Publishable Key** (starts with `pk_test_...`)

4. **Configure Redirect URLs**
   - Go to "Domains" in the left sidebar
   - Add development URLs:
     - `http://localhost:3000`
     - `http://localhost:3000/sign-in`
     - `http://localhost:3000/sign-up`
     - `http://localhost:3000/dashboard`
     - `http://localhost:3000/onboarding`
   - For production, add your production domain

#### Environment Variables

```env
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"
```

### 2. Database Setup

Janagana uses PostgreSQL with Prisma ORM.

#### Option 1: Hosted PostgreSQL (Recommended - Neon)

**Neon** (Serverless PostgreSQL):
1. Go to [neon.tech](https://neon.tech)
2. Create a free account
3. Create a new project
4. Copy the `DATABASE_URL` from the project settings

#### Option 2: Local PostgreSQL

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

### 3. Stripe Payments (Optional)

Stripe handles payment processing for subscriptions and donations.

#### Setup Steps

1. **Create a Stripe Account**
   - Go to [stripe.com](https://stripe.com/)
   - Sign up and complete onboarding

2. **Get API Keys**
   - In Stripe Dashboard, go to "Developers" → "API keys"
   - Copy the **Secret key** (starts with `sk_test_...`)
   - Copy the **Publishable key** (starts with `pk_test_...`)

3. **Set Up Webhook** (for production)
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Set the webhook URL to your production domain
   - Select events to listen for:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

#### Environment Variables

```env
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Resend Email (Optional)

Resend provides email delivery for transactional emails.

#### Setup Steps

1. **Create a Resend Account**
   - Go to [resend.com](https://resend.com)
   - Sign up and verify your email

2. **Get API Key**
   - Go to API Keys section
   - Copy the API key

3. **Configure Domain** (for production)
   - Add your domain in Resend dashboard
   - Verify DNS records

#### Environment Variables

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@janagana.app"
EMAIL_FROM_NAME="Janagana"
```

### 5. Cloudinary File Upload (Optional)

Cloudinary handles file uploads and image optimization.

#### Setup Steps

1. **Create a Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Sign up

2. **Get Credentials**
   - Go to Dashboard
   - Copy Cloud Name, API Key, and API Secret

#### Environment Variables

```env
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

### 6. Twilio SMS (Optional)

Twilio provides SMS notifications.

#### Setup Steps

1. **Create a Twilio Account**
   - Go to [twilio.com](https://www.twilio.com)
   - Sign up

2. **Get Credentials**
   - Go to Console
   - Copy Account SID and Auth Token
   - Get a phone number

#### Environment Variables

```env
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
```

### 7. Sentry Error Tracking (Optional)

Sentry provides error tracking and performance monitoring.

#### Setup Steps

1. **Create a Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up

2. **Create a Project**
   - Select "Next.js" as the platform
   - Copy the DSN

#### Environment Variables

```env
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

---

## Development Workflow

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

# Push schema changes (development only - no migration file)
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

---

## Database Management

### Prisma Schema

The Prisma schema includes 50+ models covering:
- Multi-tenancy (Tenant)
- Authentication (User, Member)
- Events (Event, EventTicket, EventRegistration)
- Volunteers (VolunteerOpportunity, VolunteerShift, VolunteerHours)
- Clubs (Club, ClubPost, ClubComment)
- Payments (Subscription, Invoice, Payment)
- Fundraising (DonationCampaign, Donation)
- And many more...

### Common Database Operations

```bash
# View all models
cat prisma/schema.prisma

# Open Prisma Studio to browse data
npm run db:studio

# Reset database (development only - deletes all data)
npm run db:push --force-reset

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply pending migrations
npx prisma migrate deploy

# Generate Prisma client after schema changes
npm run db:generate
```

---

## Testing

### E2E Testing with Playwright

```bash
# Run all E2E tests
npm run test

# Run specific test file
npx playwright test e2e/tests/01-onboarding.spec.ts

# Run tests in headed mode (with browser UI)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug
```

### Test Files

- `01-onboarding.spec.ts` - Organization registration flow
- `02-member-management.spec.ts` - Member CRUD operations
- `03-event-flow.spec.ts` - Event creation and management
- `04-volunteer-flow.spec.ts` - Volunteer opportunities and shifts
- `05-club-flow.spec.ts` - Club creation and posts
- `06-member-portal.spec.ts` - Member portal interactions
- `07-volunteer-shifts.spec.ts` - Volunteer shifts management
- `08-event-registration.spec.ts` - Event registration management

---

## Deployment

### Vercel Deployment (Recommended)

#### 1. Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

#### 2. Deploy to Production

```bash
vercel --prod
```

#### 3. Configure Environment Variables

Add all required environment variables in Vercel dashboard:
- Go to Settings → Environment Variables
- Add each variable from `.env.example`
- Use production API keys (not test keys)
- Set `NEXT_PUBLIC_APP_URL` to your production domain

#### 4. Configure Custom Domain

- Add your domain in Vercel dashboard
- Update DNS records as instructed
- Verify domain ownership

### Vercel Environment Variables Checklist

**CRITICAL - Must Set First:**
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY

**Required:**
- [ ] DATABASE_URL
- [ ] NEXT_PUBLIC_APP_URL

**Optional but Recommended:**
- [ ] STRIPE_SECRET_KEY
- [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] RESEND_API_KEY
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY
- [ ] CLOUDINARY_API_SECRET
- [ ] TWILIO_ACCOUNT_SID
- [ ] TWILIO_AUTH_TOKEN
- [ ] TWILIO_PHONE_NUMBER
- [ ] SENTRY_DSN
- [ ] NEXT_PUBLIC_SENTRY_DSN

### Deployment Checklist

- [ ] Update all API keys to production versions
- [ ] Configure production database
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Configure Clerk redirect URLs for production
- [ ] Enable Sentry error tracking
- [ ] Test all critical user flows
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy

---

## Current Features

### Core Platform
- ✅ **Multi-tenant SaaS** - Organization isolation
- ✅ **Authentication** - Clerk integration
- ✅ **Onboarding** - Organization setup wizard

### Admin Dashboard
- ✅ **Member Management** - CRUD operations for members
- ✅ **Event Management** - Create, edit, delete events
- ✅ **Event Registration** - Member registration with confirmation emails
- ✅ **Club Management** - Club CRUD with posts and comments
- ✅ **Volunteer Opportunities** - Create and manage opportunities
- ✅ **Volunteer Shifts** - Shift scheduling with capacity management
- ✅ **Volunteer Hours** - Hours logging and approval workflow
- ✅ **Settings** - Organization settings
- ✅ **Analytics Dashboard** - Member, event, volunteer, and club counts
- ✅ **Billing** - Stripe subscription management
- ✅ **Webhooks** - Webhook subscription management
- ✅ **API Keys** - API key generation and management
- ✅ **Fundraising** - Donation campaigns and donation tracking

### Member Portal
- ✅ **Profile** - View and edit member profile
- ✅ **Digital Membership Card** - QR code generation
- ✅ **Events** - Browse events
- ✅ **Volunteer** - View volunteer opportunities

### Communications
- ✅ **Email Notifications** - Resend integration for transactional emails
- ✅ **Welcome Emails** - Automatic welcome emails for new members
- ✅ **Event Confirmation Emails** - Registration confirmations
- ✅ **Volunteer Shift Confirmation Emails** - Shift signup confirmations
- ✅ **SMS Notifications** - Twilio integration for SMS

### File Management
- ✅ **File Upload** - Cloudinary integration for file uploads

### Database
- ✅ **50+ Prisma models** - Comprehensive schema
- ✅ **Migrations** - Database migration support
- ✅ **Seed data** - Demo data for testing
- ✅ **Member Import/Export** - CSV bulk import and export

---

## Roadmap

### Phase 6: Competitive Features (In Progress)

**High Priority:**
- ✅ Digital Membership Cards (QR code version)
- ✅ SMS Notifications (Twilio integration)
- ✅ Fundraising/Donations management
- ⏳ Membership renewal reminders
- ⏳ Failed payment notifications

**Medium Priority:**
- ⏳ Job Boards functionality
- ⏳ Discussion Boards/Forum
- ⏳ Form Builder for custom forms
- ⏳ Member check-in system
- ⏳ Custom Reports/Advanced Analytics
- ⏳ Email Campaigns UI
- ⏳ Notification System UI

### Competitive Analysis

Janagana has unique differentiators:
- **Volunteer management** (shifts, hours tracking) - Not in Raklet/Joinme
- **Club management** (posts, comments) - Not in Raklet/Joinme
- **API keys** - Not in Raklet/Joinme
- **Webhooks** - Not in Raklet/Joinme

Critical missing features being implemented:
- Digital Membership Cards
- SMS Notifications
- Fundraising/Donations
- Membership renewal reminders
- Failed payment notifications

---

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
- Clear browser cookies if stuck in redirect loop

#### Build errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

#### Vercel deployment 500 error

- Check that NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are set
- Verify all required environment variables are configured
- Check Vercel deployment logs for specific error
- Ensure middleware is not throwing errors

#### Sign-up redirects to sign-in

- Clear browser cookies for localhost:3000
- Check if user is already signed in
- Verify Clerk redirect URLs in dashboard
- Try in incognito/private window

### Getting Help

1. Check this guide for common issues
2. Review [TODO.md](TODO.md) for known issues
3. Check service-specific documentation:
   - [Clerk Docs](https://clerk.com/docs)
   - [Prisma Docs](https://www.prisma.io/docs)
   - [Next.js Docs](https://nextjs.org/docs)
   - [Vercel Docs](https://vercel.com/docs)

---

## Monitoring

### Sentry Error Tracking

Sentry is configured for error tracking and performance monitoring.

**Access:** https://sentry.io

**What's Tracked:**
- Frontend errors
- Backend errors
- Performance metrics
- User session replays

**Key Metrics to Monitor:**
- Error rate (target: < 1%)
- Response time P95 (target: < 500ms)
- User impact (target: < 1% users affected)

### Health Checks

The application has health check endpoints:

```bash
# Basic health check
curl https://your-domain.com/health

# Liveness check
curl https://your-domain.com/health/live

# Readiness check
curl https://your-domain.com/health/ready
```

### Log Monitoring

**Vercel Logs:**
- Application logs: Vercel dashboard
- Build logs: Vercel dashboard
- Edge logs: Vercel dashboard

**Viewing Logs:**
```bash
vercel logs
vercel logs --follow
vercel logs --filter "error"
```

### Monitoring Best Practices

1. **Set appropriate sampling rates**
   - Development: 100%
   - Staging: 50%
   - Production: 10%

2. **Filter expected errors**
   - Ignore 404s
   - Ignore validation errors
   - Ignore client aborts

3. **Regular maintenance**
   - Review error reports weekly
   - Update alert thresholds
   - Clean up old logs
   - Review audit logs quarterly

---

## Additional Resources

### Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)

### Project Files

- [README.md](README.md) - Project overview
- [TODO.md](TODO.md) - Detailed roadmap and implementation status
- [docs/SETUP.md](docs/SETUP.md) - Setup guide
- [docs/VERCEL-ENV-VARS.md](docs/VERCEL-ENV-VARS.md) - Vercel environment variables
- [.env.example](.env.example) - Environment variables template

---

## License

MIT

---

**Last Updated:** April 14, 2026
