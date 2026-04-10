# E2E Tests for OrgFlow API

This directory contains comprehensive end-to-end integration tests for the NestJS API.

## Prerequisites

- PostgreSQL running locally
- Test database: `orgflow_test`
- Dependencies installed (run `npm install` in apps/api)

## Setup

1. Ensure PostgreSQL is running:
   ```bash
   # Using Docker
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16
   ```

2. The test setup will automatically create the `orgflow_test` database and run migrations.

3. Environment variables are loaded from `.env.test` (not required to be set manually).

## Running Tests

### Run all E2E tests
```bash
cd apps/api
npm run test:e2e
```

### Run E2E tests in watch mode
```bash
cd apps/api
npm run test:e2e:watch
```

### Run specific test file
```bash
cd apps/api
npx jest test/members.e2e-spec.ts --config jest.e2e.config.ts
```

## Test Structure

- `setup.ts` - Test database setup, helper functions, global hooks
- `members.e2e-spec.ts` - Member CRUD, import, stats
- `events.e2e-spec.ts` - Event creation, registration, tickets, waitlist
- `volunteers.e2e-spec.ts` - Opportunities, applications, shifts, hours
- `clubs.e2e-spec.ts` - Club creation, memberships, posts
- `auth.e2e-spec.ts` - Authentication, authorization, tenant isolation
- `payments.e2e-spec.ts` - Stripe webhooks, refunds, revenue stats

## Helper Functions

Available in `setup.ts`:

- `createTestTenant(overrides)` - Create a test organization
- `createTestUser(tenantId, role)` - Create a test user
- `createTestMember(tenantId)` - Create a test member
- `createTestEvent(tenantId)` - Create a test event
- `createTestVolunteerOpportunity(tenantId)` - Create a volunteer opportunity
- `createTestClub(tenantId)` - Create a test club
- `getAuthToken(userId, tenantId)` - Generate mock JWT token
- `getAdminHeaders(tenantId, userId)` - Get authenticated headers
- `cleanDatabase()` - Clear all data between tests

## Mocking

- **Stripe**: All Stripe SDK calls are mocked using `jest.mock()`
- **Clerk**: JWT tokens are generated with a test secret key
- **External APIs**: All external service calls are mocked

## Test Database

The tests use a separate `orgflow_test` database to avoid affecting development data.

- Database is created before all tests
- Migrations are run automatically
- Data is cleaned between each test
- Database is dropped after all tests complete

## Timeout

Tests have a 30-second timeout to accommodate database operations.

## Troubleshooting

### Database connection errors
- Ensure PostgreSQL is running on localhost:5432
- Check that the password is `password` (or update `.env.test`)

### Migration errors
- Delete the test database: `dropdb orgflow_test`
- Re-run tests (they will recreate the database)

### Port conflicts
- Ensure no other process is using port 5432
- Or update the port in `.env.test`
