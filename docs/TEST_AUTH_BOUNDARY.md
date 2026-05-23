# Test Auth Boundary

The app-level Playwright suite uses a test-only identity cookie (`JG_TEST_AUTH`) and an in-memory membership store in `lib/auth/test-auth-state.ts`.

Activation is only allowed when one of these is true:
- `NODE_ENV=test`
- `PLAYWRIGHT_TEST=true`
- `E2E_TEST_MODE=true`

Safety rules:
- Test auth is disabled in production by default.
- Test auth cannot run when `NODE_ENV=production`, even if test flags are set.
- The reset endpoint `/api/test-auth/reset` returns 404 outside test mode.
- Production auth continues to use Clerk.

The main state-machine suite uses only the test-auth boundary. The real Clerk smoke test is isolated in `e2e/tests/13-clerk-integration-smoke.spec.ts`.

## Onboarding Outcomes In Deterministic Tests

In the deterministic suite (`e2e/tests/12-auth-state-machine.spec.ts`), the zero-org onboarding scenario accepts two valid outcomes after profile submission:

- Wizard path: profile -> tier -> URLs -> first member -> first event -> dashboard.
- Fast path: profile -> dashboard directly (Launch Center flow).

Both outcomes are product-valid for app-level state-machine proof. The test should fail only if neither path reaches dashboard.
