# JanaGana v3

**Documentation:** [docs/README.md](./docs/README.md) · **Improvement backlog:** [Todos.md](./Todos.md)

GitHub: https://github.com/jhasavi/janagana (main)  
Production: https://janagana.namasteneedham.com  
Local dev: http://localhost:3020

## What works

- Admin events, ticket quantities, check-in/no-show, paid Stripe checkout for tickets.
- Admin membership tiers, enrollment, renewals desk (including failed-payment / dunning visibility), Stripe subscriptions, renewal reminder job.
- Contact CRM: profiles, tags, filters, import, CSV export, unified per-contact activity timeline.
- Public join (side-by-side tier comparison), donate (one-time + recurring), and event registration flows with Stripe webhooks.
- Donor-covered processing fee toggle on donate, join, and paid events.
- Digital membership card + verify API on contact profiles.
- Payments ledger and receipts (printable receipt view + year-end giving summary CSV export).
- Communications admin UI — outbox with queued/sent/failed visibility and retry.
- Public portal for `purple-wings` and `namaste-boston`; embed events API.
- Multi-tenant isolation; owner onboarding; website CTAs on NB + TPW.

## Intentionally deferred

See [docs/07-ARCHITECTURE.md](./docs/07-ARCHITECTURE.md): households / group membership, authenticated member self-service portal, member directory, campaigns, refunds UI, analytics.

## Local start

```bash
npm install
cp .env.example .env.local
npm run check:env
npm run db:push
./start.sh
```

## Pre-launch

See [docs/04-PRODUCTION.md](./docs/04-PRODUCTION.md) and [docs/01-PILOT-RUNBOOK.md](./docs/01-PILOT-RUNBOOK.md).

```bash
npm run verify:tenants
npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com
```

## Test gates

```bash
npm run gate:quick      # or full: npm run gate:release
npm run build
npm run typecheck
npm run lint
```

Full gate list: [docs/06-DEVELOPMENT.md](./docs/06-DEVELOPMENT.md).

## Demo

15-minute script and go/no-go: [docs/14-PRODUCT-SHOWCASE.md](./docs/14-PRODUCT-SHOWCASE.md)

```bash
npm run seed:joinit-demo -- --confirm-joinit-demo   # local demo data
npm run verify:pilot-demo
```
