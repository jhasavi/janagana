# Janagana

> Membership, Event, Volunteer & Club Management SaaS
> For Non-profit and For-profit Organizations

## Live Demo
- Web: https://janagana.namasteneedham.com

## 📚 Complete Setup Guide

**For detailed setup, deployment, and development instructions, see [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md)**

## Quick Start
```bash
git clone https://github.com/jhasavi/janagana.git
cd janagana
cp .env.example .env.local
# Fill in environment variables (see COMPLETE_GUIDE.md)
npm install
npm run db:generate
npm run dev
```

Access:
- Web: http://localhost:3000

## Tech Stack
- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** TailwindCSS, shadcn/ui
- **Database:** PostgreSQL + Prisma ORM
- **Authentication:** Clerk
- **Payments:** Stripe (placeholder)
- **Error Tracking:** Sentry

## Project Structure

```
janagana/
├── app/                       # Next.js App Router pages
│   ├── (auth)/               # Authentication pages
│   ├── dashboard/            # Admin dashboard
│   ├── portal/               # Member portal
│   └── onboarding/           # Onboarding flow
├── components/               # React components
├── lib/                      # Server actions & utilities
│   ├── actions.ts           # Server Actions
│   └── prisma.ts            # Prisma client
├── prisma/                   # Database schema & migrations
│   ├── schema.prisma        # Prisma schema
│   └── seed.ts             # Seed script
├── docs/legacy/              # Legacy documentation (archived)
├── TODO.md                  # Project status & roadmap
└── package.json
```

## Current Features (Implemented)

### Core Platform
- **Multi-tenant SaaS** - Organization isolation
- **Authentication** - Clerk integration
- **Onboarding** - Organization setup wizard

### Admin Dashboard
- **Member Management** - CRUD operations for members
- **Event Management** - Create, edit, delete events
- **Event Registration** - Member registration with confirmation emails
- **Club Management** - Club CRUD with posts and comments
- **Volunteer Opportunities** - Create and manage opportunities
- **Volunteer Shifts** - Shift scheduling with capacity management
- **Volunteer Hours** - Hours logging and approval workflow
- **Settings** - Organization settings
- **Analytics Dashboard** - Member, event, volunteer, and club counts
- **Billing** - Stripe subscription management
- **Webhooks** - Webhook subscription management
- **API Keys** - API key generation and management

### Member Portal
- **Profile** - View and edit member profile
- **Events** - Browse events
- **Volunteer** - View volunteer opportunities

### Communications
- **Email Notifications** - Resend integration for transactional emails
- **Welcome Emails** - Automatic welcome emails for new members
- **Event Confirmation Emails** - Registration confirmations
- **Volunteer Shift Confirmation Emails** - Shift signup confirmations

### File Management
- **File Upload** - Cloudinary integration for file uploads

### Database
- **50+ Prisma models** - Comprehensive schema preserved
- **Migrations** - Database migration support
- **Seed data** - Demo data for testing
- **Member Import/Export** - CSV bulk import and export

## Planned Features (Roadmap)

See [TODO.md](TODO.md) for detailed roadmap and implementation status.

### Phase 2: Complete Core Features ✅ COMPLETED
- ✅ Volunteer shifts & hours tracking
- ✅ Club posts & comments
- ✅ Event registration flow
- ✅ Member import/export (CSV)
- ✅ Basic analytics dashboard

### Phase 3: Payment Integration ✅ COMPLETED
- ✅ Full Stripe integration
- ✅ Subscription billing
- ✅ Invoice generation
- ✅ Payment history

### Phase 4: Communications ✅ COMPLETED
- ✅ Resend email integration
- ✅ Email templates
- ⏳ Email campaigns (partially - infrastructure ready)
- ⏳ Notification system (infrastructure ready)

### Phase 5: Advanced Features ✅ COMPLETED
- ✅ Webhook system
- ✅ API key authentication
- ✅ File upload system (Cloudinary)
- ⏳ Advanced permissions/RBAC (schema ready)
- ⏳ Real-time features (requires Redis)

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL (local or hosted)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk secret key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

### 3. Generate Prisma client

```bash
npm run db:generate
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. (Optional) Seed database with demo data

```bash
npm run seed
```

### 6. Start development server

```bash
npm run dev
```

Access the app at: http://localhost:3000

## Environment Variables

See `.env.example` for required environment variables. Key variables:

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Authentication
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Stripe
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Optional: Sentry
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```

## Useful Commands

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:push          # Push schema changes
npm run seed             # Seed database

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type check
npm run test             # Run tests
```

## Architecture Notes

This project underwent a significant architectural change in April 2026:
- **Previous:** Turborepo monorepo with NestJS API, Next.js web, and Expo mobile
- **Current:** Simplified Next.js monolith with Server Actions
- **Reason:** Resolved persistent Vercel deployment issues
- **Trade-off:** Lost some advanced features, gained deployment stability and faster iteration

The Prisma schema with 50+ models was preserved from the original architecture, allowing for incremental feature rebuild.

## Documentation

- [TODO.md](TODO.md) - Current status and implementation roadmap
- [docs/legacy/](docs/legacy/) - Archived documentation from original architecture

## Multi-Tenancy

Currently uses path-based routing for development. Each user has one organization associated with their Clerk account.

## Authentication

- **Admin Portal:** Clerk authentication
- **Member Portal:** Clerk authentication (planned magic link)

## Deployment

- **Platform:** Vercel
- **Status:** ✅ Deployed successfully
- **URL:** https://janagana.namasteneedham.com

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment details.

## License

MIT
