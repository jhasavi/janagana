# JanaGana — Local Development Setup

## Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- A [Clerk](https://clerk.com) account (free tier works)

---

## Quick Start

```bash
# 1. Clone and enter the project
git clone https://github.com/your-org/janagana.git
cd janagana

# 2. Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, CLERK keys, etc.

# 3. Run the startup script (installs deps, migrates DB, starts dev server)
./start.sh

# Or with demo data:
./start.sh --seed
```

The app will be available at **http://localhost:3000**.

---

## Manual Setup (step by step)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → your project → Connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | [dashboard.clerk.com](https://dashboard.clerk.com) → API Keys |

### 3. Set Up the Database

```bash
# Apply migrations (creates all tables)
npm run db:migrate

# (Optional) Load demo data
npm run db:seed
```

### 4. Start the Dev Server

```bash
npm run dev
```

---

## Clerk Configuration

In your Clerk Dashboard:

1. Go to **Configure → Sessions**  
   Enable **Organizations** (required for multi-tenant functionality).

2. Go to **Configure → Paths**  
   Set these redirect URLs:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`

3. Go to **Configure → Webhooks**  
   Add an endpoint: `https://your-domain.com/api/webhooks/clerk`  
   Subscribe to: `organization.created`, `organization.updated`, `organizationMembership.created`

---

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack (hot reload)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run typecheck    # TypeScript type check (no emit)

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Push schema changes to DB without migration file (dev only)
npm run db:migrate   # Create and apply migration (use in dev)
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Load demo data

# E2E Tests (after configuring E2E_CLERK_EMAIL + E2E_CLERK_PASSWORD in .env)
npm run test:e2e           # Run all E2E tests (headless)
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:ui        # Run with Playwright interactive UI
npm run test:e2e:debug     # Debug mode

# Run only public/no-auth tests (don't need Clerk credentials)
npx playwright test --config=e2e/playwright.config.ts --project=no-auth
```

### E2E Test Credentials Setup

To run the full authenticated E2E test suite, add these to `.env`:

```bash
# Create a dedicated test user in Clerk Dashboard first
E2E_CLERK_EMAIL="e2e-test@yourdomain.com"
E2E_CLERK_PASSWORD="your-test-password"
```

The test user must:
1. Exist in your Clerk project
2. Have password auth enabled (not social login only)
3. Have already completed onboarding (or the global-setup will do it)

Public/no-auth tests always work without credentials:
```bash
npx playwright test --config=e2e/playwright.config.ts --project=no-auth
```

---

## Project Structure

```
janagana/
├── app/
│   ├── (auth)/sign-in, sign-up     ← Clerk auth pages
│   ├── (dashboard)/                ← Admin dashboard (auth protected)
│   │   ├── dashboard/              ← Stats overview
│   │   ├── members/                ← Member management
│   │   ├── events/                 ← Event management
│   │   ├── volunteers/             ← Volunteer opportunities
│   │   └── settings/               ← Org settings
│   ├── onboarding/                 ← New org setup wizard
│   └── api/webhooks/               ← Stripe + Clerk webhooks
├── components/
│   ├── dashboard/                  ← Dashboard-specific components
│   └── ui/                         ← shadcn/ui components
├── lib/
│   ├── actions/                    ← Server Actions (data mutations)
│   │   ├── tenant.ts
│   │   ├── members.ts
│   │   ├── events.ts
│   │   └── volunteers.ts
│   ├── prisma.ts                   ← Prisma singleton
│   └── utils.ts                    ← Shared utilities
├── prisma/
│   ├── schema.prisma               ← Database schema
│   └── seed.ts                     ← Demo data
├── e2e/tests/                      ← Playwright E2E tests
├── docs/                           ← Documentation
├── .env.example                    ← Environment variable template
├── start.sh                        ← Local dev startup script
└── middleware.ts                   ← Clerk auth middleware
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Clerk redirect loop | Clear browser cookies, check Clerk Dashboard redirect URLs |
| Prisma client out of sync | Run `npm run db:generate` after any schema change |
| Build fails with type errors | Run `npm run typecheck` to see all errors |
| `Missing tenantId` error | Every DB query needs `where: { tenantId }` |
| Port 3000 in use | Kill with `lsof -ti:3000 \| xargs kill -9` |
| DB connection refused | Check `DATABASE_URL` in `.env.local`, ensure Neon project is active |

---

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to Vercel
- See [TODO.md](../TODO.md) for planned features and roadmap
