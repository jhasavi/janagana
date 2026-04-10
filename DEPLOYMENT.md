# OrgFlow Deployment Guide

## 1. Production Overview
OrgFlow is a monorepo with two deployable apps:
- `apps/api` — NestJS backend
- `apps/web` — Next.js frontend

Both apps share the same workspace and environment variables managed using `.env` files or CI secrets.

## 2. Vercel Setup (Web)
1. Create a new project in Vercel and connect to the repo.
2. Set the root directory to `apps/web`.
3. Build command: `npm run build --workspace apps/web`.
4. Output directory: `.next`.
5. Set environment variables from `apps/web/.env.example`.
6. Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` if using Sentry.
7. Add any custom domains and verify DNS settings.

## 3. Railway Setup (API)
1. Create a new Railway project.
2. Add PostgreSQL and Redis plugins.
3. Add the API service using the `apps/api` Dockerfile or deployment from root.
4. Set environment variables from `apps/api/.env.example`.
5. Ensure `DATABASE_URL` points to the Railway Postgres instance.
6. Ensure `REDIS_URL` points to the Railway Redis instance.

## 4. PostgreSQL / Neon / Supabase
Recommended settings:
- Database host: from provider
- Database name: `orgflow`
- User: `orgflow`
- Password: strong secret
- SSL: enabled if required
- `DATABASE_URL` example:
  `postgresql://orgflow:your_password@host:5432/orgflow?schema=public`

## 5. Upstash Redis
Recommended settings:
- Create a Redis database using Upstash.
- Set `REDIS_URL` to the provided connection string.
- Enable persistence if available.

## 6. Clerk Setup
1. Create a Clerk application.
2. Copy the Publishable Key into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
3. Copy the Secret Key into `CLERK_SECRET_KEY`.
4. Set Clerk redirect URLs to:
   - `/sign-in`
   - `/sign-up`
   - `/dashboard`

## 7. Stripe Setup
1. Create a Stripe account.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CONNECT_WEBHOOK_SECRET`.
3. Verify webhook endpoints in the deployment environment.
4. Add plans and pricing for your SaaS tiers.

## 8. DNS and Custom Domains
1. Add DNS `A` / `CNAME` records for your frontend domain.
2. Configure the API domain or reverse proxy target.
3. For multi-tenant subdomains, point `*.yourdomain.com` to Vercel or your proxy.

## 9. Local Docker Development
Use `docker-compose.yml` for local containers.
Use `docker-compose.prod.yml` for production-style containers.

Example:
```bash
docker compose -f docker-compose.prod.yml up --build
```

## 10. Health and Monitoring
- API health endpoint: `GET /api/health`
- The health endpoint now checks:
  - API service status
  - PostgreSQL connectivity
  - Redis connectivity

## 11. Sentry
- Add `SENTRY_DSN` to both API and Web environments.
- API uses Sentry in the Nest bootstrap and error filters.
- Web captures client-side errors in the global `app/error.tsx` boundary.

## 12. CI/CD Notes
- GitHub Actions pipeline is configured in `.github/workflows/deploy.yml`.
- The pipeline runs lint, typecheck, tests, Prisma migrations, and deploys both apps.
- Secrets should include:
  - `DATABASE_URL`
  - `RAILWAY_API_KEY`
  - `RAILWAY_PROJECT_ID`
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
