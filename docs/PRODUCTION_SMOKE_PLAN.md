# Production Smoke Plan

Date: 2026-05-28 (updated)
Target: https://janagana.namasteneedham.com

## Latest automated smoke (2026-05-28)

**GitHub `main`:** `e32313f` — fix(dashboard): clarify contacts vs formal memberships for pilot

| Check | Result |
|-------|--------|
| GET `/api/health/ready` | 200 `{"ok":true}` |
| GET `/portal/purple-wings` | 200, tenant name present |
| GET `/portal/namaste-boston` | 200, tenant name present |
| GET `/portal/purple-wings/contact?interest=newsletter` | 200 |
| GET `/portal/namaste-boston/contact?interest=investment` | 200, Investment analysis label |
| Playwright lead submit (PW newsletter, NB investment) | Pass |
| TPW site CTA → JanaGana | Pass (`tpw-five.vercel.app`) |
| NB site CTA → JanaGana | Pass (`nb-mu-ten.vercel.app`) |

Commands:

```bash
npm run smoke:production
PRODUCTION_SMOKE=true npx playwright test --config=playwright.production-smoke.config.ts
```

**Manual only (requires owner Clerk sign-in):** dashboard Contacts / Event registrations / Formal memberships cards; tenant switch isolation; event registration attendee list.

## Preconditions

- GitHub push to main is complete.
- Vercel deployment has completed (check Vercel dashboard or deploy webhook).
- Production Clerk keys and DATABASE_URL are set as Vercel environment variables.
- NEXT_PUBLIC_APP_URL is set to https://janagana.namasteneedham.com.

## Required Vercel Environment Variables

Set these in the Vercel dashboard before first deployment:

| Variable | Note |
|---|---|
| DATABASE_URL | Production PostgreSQL connection string |
| NEXT_PUBLIC_APP_URL | https://janagana.namasteneedham.com |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Production pk_live_... key |
| CLERK_SECRET_KEY | Production sk_live_... key |
| CLERK_WEBHOOK_SECRET | Webhook secret from Clerk dashboard |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | /sign-in |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | /sign-up |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL | /dashboard |
| NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL | /onboarding/create-organization |

Do not carry over local development keys (pk_test_, sk_test_) into production.

## Smoke Test Checklist

### 1. Health check
- URL: https://janagana.namasteneedham.com/api/health/ready
- Expected: HTTP 200 JSON response
- Fail: 500 or non-JSON means env/DB issue

### 2. Home page redirect
- URL: https://janagana.namasteneedham.com/
- Expected: redirect to /sign-in
- Fail: 500 or white screen means middleware or env issue

### 3. Purple Wings portal
- URL: https://janagana.namasteneedham.com/portal/purple-wings
- Expected: portal page loads with correct tenant name
- Fail: 404 means tenant slug is not in production DB

### 4. Namaste Boston portal
- URL: https://janagana.namasteneedham.com/portal/namaste-boston
- Expected: portal page loads with correct tenant name
- Fail: 404 means tenant slug is not in production DB

### 5. Purple Wings lead capture
- URL: https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter
- Expected: form loads without auth prompt
- Action: submit a test email
- Expected: success confirmation, no 500

### 6. Namaste Boston lead capture
- URL: https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=investment
- Expected: form loads without auth prompt
- Action: submit a test email
- Expected: success confirmation, no 500

### 7. Admin sign-in
- URL: https://janagana.namasteneedham.com/sign-in
- Expected: Clerk sign-in page loads
- Action: sign in as owner admin
- Expected: redirect to /dashboard or /select-organization

### 8. Dashboard
- Expected: dashboard shows correct active tenant
- Action: navigate to Events
- Expected: event list loads without error

### 9. Public event registration
- Open a published event from the portal
- Submit a registration with a test attendee
- Expected: redirect to registered confirmation page

### 10. Admin attendee visibility
- In dashboard Events, open the event
- Expected: test registrant appears in attendee list

## Pass Criteria

- All 10 checks complete without 500 errors
- Lead capture creates contacts in production DB (visible via admin or DB query)
- No cross-tenant data leakage during manual spot check

## Known Production Limitations

- No email confirmation sent to registrants (deferred)
- No pagination on registrant list (deferred)
- No Stripe/payments (deferred)
- allowedDevOrigins warning will not appear in production (dev-only)
