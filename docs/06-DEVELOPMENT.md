# Local development

## Start

```bash
npm install
cp .env.example .env.local
npm run check:env
npm run db:push
./start.sh   # or npm run dev
```

## Tests

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript |
| `npm run test:e2e:foundation` | Health, portal slug smoke |
| `npm run test:tenant:contract` | Tenant label contract |
| `npm run test:portal` | Public registration scripts |
| `npm run gate:quick` | Release gate subset |

## Database

- Local/test DB: see legacy `LOCAL_TEST_DATABASE.md` notes in git history.
- E2E seed: `npm run seed:e2e`
- Demo tenants: `npm run seed:demo:local`

## Foundation scope (pilot)

**In scope:** contacts/leads, events, public registration, tenant isolation, operator dashboard.

**Deferred:** CRM pipeline UI, donation checkout, online event checkout, refund operations, email automation.

## Release gate

`npm run gate:release` — full checklist before major releases.
