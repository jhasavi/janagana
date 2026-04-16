# JanaGana — Complete Setup & Development Guide

> Comprehensive guide to set up, develop, and deploy JanaGana from scratch.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Service Setup (Clerk, Stripe, Resend, Cloudinary, Twilio, Sentry)](#service-setup)
8. [Development Workflow](#development-workflow)
9. [Database Management](#database-management)
10. [Testing](#testing)
11. [Deployment (Vercel)](#deployment)
12. [Monitoring & Observability](#monitoring--observability)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**JanaGana** is a multi-tenant SaaS platform for managing memberships, events, volunteers, clubs, and fundraising for non-profit and for-profit organizations.

**Live:** https://janagana.namasteneedham.com

**Key features:**
- Multi-tenant org isolation via Clerk Organizations + Prisma tenantId
- Member management: CRUD, tiers, status, custom fields, CSV import/export
- Event management: registration, check-in (QR code), attendance
- Volunteer management: opportunities, shifts, hours logging/approval
- Club management: posts, comments, roles
- Fundraising/donations: campaigns, progress tracking
- Member portal: self-service profile, events, volunteer sign-ups, billing- Global admin portal: tenant list, counts, portal links, owner/admin visibility- Email notifications (Resend), SMS notifications (Twilio)
- File uploads (Cloudinary), membership cards (QR code)
- Stripe billing: tenant subscriptions + member membership billing
- API keys & webhooks for integrations
- Audit log, analytics, notifications bell

---

## Architecture

JanaGana is a **Next.js 15 App Router monolith** deployed on Vercel with Neon PostgreSQL.

## Global Admin Portal

The global admin portal is available under `/admin` for super-admin users defined by the `GLOBAL_ADMIN_EMAILS` environment variable. It shows:
- all tenant organizations on the platform
- tenant slug and portal link
- member/event/volunteer opportunity counts
- active/inactive status
- plan subscription state
- owner/admin contact identifiers when available from Clerk org membership

This portal is intended for platform-level oversight of all organizations using JanaGana.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 15 App (Vercel)                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend:                                                        │
│  ├── Admin Dashboard  app/(dashboard)/dashboard/                  │
│  ├── Member Portal    app/portal/                                 │
│  ├── Auth Pages       app/(auth)/                                 │
│  ├── Onboarding       app/onboarding/                             │
│  └── Global Admin     app/admin/                                  │
│                                                                   │
│  Backend (Server Actions — lib/actions/):                         │
│  ├── members.ts    events.ts    volunteers.ts    clubs.ts          │
│  ├── fundraising.ts             communications.ts                  │
│  ├── billing.ts    portal.ts    analytics.ts                      │
│  ├── admin.ts      checkin.ts   api-keys.ts    webhooks.ts        │
│  └── audit.ts      tenant.ts                                      │
│                                                                   │
│  API Routes (webhooks only):                                      │
│  ├── /api/webhooks/stripe        ← Stripe events                  │
│  ├── /api/webhooks/clerk         ← Clerk org events               │
│  ├── /api/active-org             ← Short-lived active-org cookie  │
│  └── /api/health/onboarding      ← Health check                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer (Neon / PostgreSQL)                  │
├─────────────────────────────────────────────────────────────────┤
│  Prisma (50+ models)                                              │
│  ├── Tenant ← top-level org; every model has tenantId             │
│  ├── Member, MembershipTier                                       │
│  ├── Event, EventRegistration                                     │
│  ├── VolunteerOpportunity, VolunteerShift, VolunteerSignup        │
│  ├── Club, ClubMembership, ClubPost                               │
│  ├── DonationCampaign, Donation                                   │
│  ├── EmailCampaign, EmailLog, Notification                        │
│  ├── ApiKey, WebhookEndpoint, WebhookDelivery                     │
│  └── AuditLog                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Clerk v6 (`@clerk/nextjs`) |
| Database ORM | Prisma 6 + PostgreSQL (Neon) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Email | Resend |
| SMS | Twilio |
| File Upload | Cloudinary |
| Payments | Stripe |
| Error Tracking | Sentry (`@sentry/nextjs`) |
| Icons | Lucide React |
| E2E Tests | Playwright |

---

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database — use [Neon](https://neon.tech) free tier
- [Clerk](https://clerk.com) account (free tier)

---

## Quick Start

```bash
# 1. Clone & enter project
git clone <repo-url>
cd janagana

# 2. Copy env template
cp .env.example .env.local
# Fill in DATABASE_URL, CLERK keys (minimum required)

# 3. Install dependencies
npm install

# 4. Generate Prisma client & migrate
npm run db:generate
npm run db:migrate

# 5. (Optional) Load demo data
npm run db:seed

# 6. Start dev server
npm run dev
# App: http://localhost:3000
```

---

## Environment Variables

See [.env.example](../.env.example) for the full annotated list. Minimum required:

```env
DATABASE_URL=postgresql://user:pass@host:5432/janagana
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

For production also add: `STRIPE_*`, `RESEND_*`, `CLOUDINARY_*`, `TWILIO_*`, `SENTRY_DSN`.

---

## Service Setup

### Clerk

1. Create a Clerk app at [clerk.com](https://clerk.com).
2. In **Configure → Paths** set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`
3. In **Configure → Organizations** — enable Organizations (required for multi-tenancy).
4. In **Configure → Webhooks** add endpoint `https://your-domain.com/api/webhooks/clerk`.
   Subscribe: `organization.created`, `organization.updated`, `organization.deleted`.
   Copy the signing secret → `CLERK_WEBHOOK_SECRET`.
5. Add `E2E_CLERK_EMAIL` and `E2E_CLERK_PASSWORD` for E2E test users.

### Stripe

1. Create a Stripe account.
2. Copy secret key → `STRIPE_SECRET_KEY`, publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. For local webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`.
5. See [STRIPE-WEBHOOKS.md](./STRIPE-WEBHOOKS.md) for required events.

### Resend

1. Create account at [resend.com](https://resend.com).
2. Copy API key → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` and `EMAIL_FROM_NAME`.

### Cloudinary

1. Create account at [cloudinary.com](https://cloudinary.com).
2. Copy Cloud Name, API Key, API Secret → `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### Twilio

1. Create account at [twilio.com](https://twilio.com).
2. Copy Account SID → `TWILIO_ACCOUNT_SID`, Auth Token → `TWILIO_AUTH_TOKEN`.
3. Get a phone number → `TWILIO_PHONE_NUMBER`.

### Sentry

1. Create a [Sentry](https://sentry.io) project (Next.js type).
2. Copy DSN → `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

---

## Development Workflow

```bash
npm run dev              # Start dev server (Turbopack)
npm run restart          # Stop + restart dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint check
npm run typecheck        # TypeScript type check (no emit)

# Database
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema to DB without migration (dev only)
npm run db:migrate       # Create & apply migration
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Load demo data

# E2E Tests
npm run test:e2e                 # Run all Playwright tests (headless)
npm run test:e2e:headed          # With browser visible
npm run test:e2e:ui              # Interactive Playwright UI
npm run test:e2e:debug           # Debug mode

# Operational scripts
npm run scripts:verify-tenants    # Verify seeded tenant data
npm run scripts:simulate          # Simulate multi-tenant real-world data
TENANT_SLUG=xxx CLERK_USER_ID=yyy npx tsx scripts/switch-tenant.ts  # Switch Clerk user to tenant
CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --output=out.json  # Dry-run repair
CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --commit           # Commit repair
```

---

## Database Management

```bash
# After any schema change:
npm run db:generate

# Create a new migration for a schema change:
npm run db:migrate
# Enter a migration name when prompted

# Production migration (CI/deployment):
npx prisma migrate deploy

# Inspect your data:
npm run db:studio

# Reset dev DB (drops and recreates):
npx prisma migrate reset
npm run db:seed

# Backup (Neon):
# Neon console → Branches → Create branch for snapshot
```

---

## Testing

### E2E (Playwright)

```bash
# All tests
npm run test:e2e

# Specific test file
npx playwright test --config=e2e/playwright.config.ts e2e/tests/01-onboarding.spec.ts

# With trace on failure
npx playwright test --config=e2e/playwright.config.ts --trace=on

# Report
npx playwright show-report
```

Required env vars for authenticated E2E:
```env
E2E_CLERK_EMAIL=your-e2e-user@example.com
E2E_CLERK_PASSWORD=your-e2e-password
```

### TypeScript check

```bash
npm run typecheck
```

---

## Deployment

### Vercel (recommended)

1. Connect repo to Vercel.
2. Set environment variables — see [DEPLOYMENT.md](./DEPLOYMENT.md) and [.env.example](../.env.example).
3. Build command: `prisma generate && next build` (set in `package.json`).
4. After deploy, configure Clerk and Stripe webhook URLs to point to the production domain.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full checklist.

---

## Monitoring & Observability

See [MONITORING.md](./MONITORING.md) for:
- Sentry dashboard setup and key alerts
- Recommended log format (tenantId, clerkId, requestId)
- Health check endpoint (`/api/health/onboarding`)
- Incident response checklist

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Clerk redirect loop after sign-up | Clear browser cookies; check Clerk Dashboard redirect URLs |
| Stays on `/onboarding` after sign-up | Check server logs for `[getTenant]` errors; ensure `JG_ACTIVE_ORG` cookie is being set |
| Prisma client out of sync | `npm run db:generate` after any schema change |
| Vercel 500 on deploy | Verify `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are set |
| Build fails with type errors | `npm run typecheck` to see all errors |
| `Missing tenantId` error in DB query | Every Prisma query needs `where: { tenantId }` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` |
| DB connection refused | Check `DATABASE_URL` in `.env.local`, ensure Neon project is active |
| Stripe webhook failing | Verify `STRIPE_WEBHOOK_SECRET` matches your Stripe endpoint; see [STRIPE-WEBHOOKS.md](./STRIPE-WEBHOOKS.md) |
| Sentry not capturing errors | Verify `SENTRY_DSN` is set in both server and client env vars |
