# Local Test Database

This guide sets up a safe non-production database for v3 action isolation tests.

Never run database write tests against production.

## Required permissions for action tests

The test runner needs the DB role to:
- connect to the target database
- create, update, and delete rows in these tables: Tenant, Contact, MembershipTier, Event
- read information_schema tables for readiness checks

The tests only write rows prefixed with E2E_ISOLATION_ and only delete rows with the same prefix.

## Option A: Neon dev or test database

1. Create a dedicated Neon project or dedicated non-production branch for tests.
2. Copy the non-production pooled connection string.
3. Put it in .env.local as DATABASE_URL.
4. Apply schema:
   - npx prisma db push
   or
   - npx prisma migrate deploy (if migrations are in use for that DB)
5. Run readiness preflight:
   - npm run check:db:test
6. Run isolation test:
   - npm run test:actions

Notes:
- Keep production and test branches separate.
- Do not reuse production role credentials.

## Option B: Local Postgres

1. Start local Postgres.
2. Create a dedicated local DB, for example janagana_v3_test.
3. Set .env.local DATABASE_URL using placeholders:
   - postgresql://DB_USER:DB_PASSWORD@localhost:5432/janagana_v3_test?schema=public
4. Apply schema:
   - npx prisma db push
5. Run readiness preflight:
   - npm run check:db:test
6. Run isolation test:
   - npm run test:actions

If preflight reports permission denied / access denied:

```bash
# Example only: adapt user/password/db to your local setup.
psql -h localhost -U postgres -d postgres -c "CREATE ROLE janagana LOGIN PASSWORD 'janagana';"
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE janagana_v3 OWNER janagana;"
psql -h localhost -U postgres -d janagana_v3 -c "GRANT ALL PRIVILEGES ON SCHEMA public TO janagana;"
npm run db:push
npm run check:db:test
```

## Safety flags in tenant isolation test

- Refuses to run when NODE_ENV=production.
- Refuses production-like database targets unless ALLOW_DEV_DB_TESTS=true is explicitly set.
- Uses only E2E_ISOLATION_ prefixed records.
- Performs best-effort cleanup on success and failure.
