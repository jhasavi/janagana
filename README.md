# Janagana

> Membership, Event, Volunteer & Club Management SaaS
> For Non-profit and For-profit Organizations

## Live Demo
- Web: https://janagana.namasteneedham.com
- API Docs: https://janagana-api.onrender.com/api/docs

## Local Development
```bash
git clone [repo-url]
cd janagana
cp .env.example .env.local
# Fill in environment variables (see docs/SETUP.md)
npm install
docker compose up -d  # PostgreSQL + Redis for local dev
npm run db:generate
npm run dev
```

Access:
- Web: http://localhost:3000
- API: http://localhost:4000  
- Swagger: http://localhost:4000/api/docs

## Tech Stack
- **Monorepo:** Turborepo
- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend:** NestJS 10, TypeScript, Swagger, class-validator
- **Database:** PostgreSQL (Neon) + Prisma 5
- **Cache:** Redis (Upstash)
- **Authentication:** Clerk (admin), JWT (member portal)
- **Payments:** Stripe (payments, Stripe Connect)
- **Email:** Resend
- **Media:** Cloudinary
- **Error Tracking:** Sentry
- **Mobile:** Expo SDK 51, React Native, Expo Router, NativeWind

## Documentation
- [Setup Guide](docs/SETUP.md) - Environment configuration
- [API Documentation](docs/API.md) - Backend API reference
- [Web App Documentation](docs/WEB.md) - Frontend dashboard guide
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Architecture](docs/ARCHITECTURE.md) - System architecture

## Monorepo Structure

```
orgflow/
├── apps/
│   ├── web/                    # Next.js admin dashboard & public site
│   ├── api/                    # NestJS REST API
│   └── mobile/                 # React Native member portal
├── packages/
│   ├── database/               # Prisma schema & migrations
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities
├── scripts/                    # Utility scripts
├── docs/                       # Documentation
├── turbo.json
├── package.json
└── docker-compose.yml
```

## Features

### Core Platform
- **Multi-tenant SaaS** - Subdomain-based organization isolation
- **Role-based Access Control** - Owner, Admin, Staff, ReadOnly, Custom roles
- **Audit Logging** - Complete activity tracking
- **Webhooks** - Extensible event system

### Member Management
- Member profiles with custom fields
- Membership tiers and expiry tracking
- Member portal for self-service
- Import/export members (CSV)

### Events
- Event creation with categories and venues
- Registration management
- Check-in system with QR codes
- Waitlist management
- Event reminders and notifications

### Volunteering
- Volunteer opportunities
- Shift scheduling
- Hours tracking
- Application management
- Shift reminders

### Clubs
- Club creation and management
- Member clubs
- Post feed and engagement
- Club leadership roles

### Donations
- Campaign management with progress tracking
- One-time and recurring donations
- Stripe integration for payments
- Tax receipt generation
- Donor management and export
- Thank you emails

### Mobile App (Member Portal)
- Digital membership card with QR
- Event browsing and registration
- Volunteer shift management
- Club participation
- Push notifications
- Multi-tenant support

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Expo CLI (for mobile development)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- pgAdmin (port 5050)

### 3. Generate Prisma client

```bash
npm run db:generate
```

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Run development servers

```bash
npm run dev
```

This starts:
- Web app: http://localhost:3000
- API: http://localhost:4000
- Swagger docs: http://localhost:4000/docs

### 6. (Optional) Run mobile app

```bash
cd apps/mobile
npm install
npx expo start
```

## Environment Variables

See `.env.example` for required environment variables. Key variables:

```env
# API
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
RESEND_API_KEY=...

# Web
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:4000
```

## Useful Commands

```bash
# Development
npm run dev              # Start all services
npm run dev:web          # Web only
npm run dev:api          # API only

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Build & Test
npm run build            # Build all packages
npm run lint             # Lint all packages
npm run typecheck        # Type check all packages
npm run test             # Run tests
```

## Documentation

- [API Documentation](docs/API.md) - Backend API reference
- [Web App Documentation](docs/WEB.md) - Frontend dashboard guide
- [Mobile App Documentation](apps/mobile/README.md) - Mobile app guide
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Architecture](docs/ARCHITECTURE.md) - System architecture

## API Endpoints

Base URL: `http://localhost:4000`

- Swagger UI: http://localhost:4000/docs
- Health check: http://localhost:4000/health

### Key Endpoints

- `POST /auth/register` - Register organization
- `POST /auth/login` - Login
- `GET /tenants/:id` - Get tenant details
- `GET /members` - List members
- `GET /events` - List events
- `POST /events/:id/register` - Register for event
- `GET /volunteer/opportunities` - List volunteer opportunities
- `GET /clubs` - List clubs
- `GET /donations/campaigns` - List donation campaigns
- `POST /donations/checkout` - Create donation checkout

## Multi-Tenancy

OrgFlow uses subdomain-based multi-tenancy:
- `tenant1.orgflow.app` → Tenant 1
- `tenant2.orgflow.app` → Tenant 2

In development, use path-based routing:
- `localhost:3000/tenant1/dashboard`
- `localhost:3000/tenant2/dashboard`

## Authentication

- **Admin Portal:** Clerk authentication
- **Member Portal:** Magic link authentication
- **API:** JWT tokens via Clerk
- **Mobile:** Magic link + SecureStore

## Payments

- **Stripe Connect** for organization accounts
- **Subscription billing** via Stripe
- **Donation processing** via Stripe Checkout
- **Webhook handling** for payment events

## Notifications

- **Email:** Resend for transactional emails
- **Push:** Expo Notifications for mobile
- **SMS:** Twilio (optional)
- **In-app:** Real-time updates via WebSockets

## License

MIT
