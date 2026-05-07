# JanaGana Production Readiness Checklist

**Updated:** May 5, 2026

---

## ✅ COMPLETED (This Session)

| # | Item | Status | Details |
|---|------|--------|---------|
| 1 | Production build blocker (getTenantProfile at module scope) | ✅ FIXED | Converted to lazy initialization in 5 files |
| 2 | Sentry instrumentation setup | ✅ FIXED | Created `instrumentation.ts` + `instrumentation-client.ts` |
| 3 | Gallery lint warnings (Image component) | ✅ FIXED | Renamed Lucide Image to ImageIcon |
| 4 | Build verification | ✅ PASSED | Clean build with no blocking errors |
| 5 | DATABASE_URL connection pooling | ✅ CONFIGURED | Added `pgbouncer=true&connection_limit=1` to Neon URL |
| 6 | Vercel env vars setup | ✅ COMPLETE | SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING set |
| 7 | Vercel build command | ✅ CONFIGURED | `npm run bootstrap:validate-env && npm run build` |
| 8 | Health check endpoint | ✅ ENHANCED | DB timeout (5s), latency metrics, detailed status |
| 9 | Vercel Analytics & Speed Insights | ✅ ADDED | Installed + integrated into root layout |
| 10 | Required env vars documentation | ✅ CREATED | [docs/REQUIRED_ENV.md](docs/REQUIRED_ENV.md) |
| 11 | Pre-push git hooks guide | ✅ CREATED | [docs/PRE_PUSH_HOOKS.md](docs/PRE_PUSH_HOOKS.md) |
| 12 | Optimistic updates example | ✅ CREATED | [lib/examples/optimistic-updates.example.tsx](lib/examples/optimistic-updates.example.tsx) |
| 13 | Loading skeleton components | ✅ CREATED | [components/ui/skeletons.tsx](components/ui/skeletons.tsx) |

---

## 🟡 RECOMMENDED NEXT STEPS (Implementation)

| # | Item | Effort | Priority | Notes |
|---|------|--------|----------|-------|
| 14 | Add pagination to list pages | 2-3 days | HIGH | Use cursor-based pagination with TanStack Table server mode |
| 15 | Add React Email templates | 1-2 days | HIGH | Replace HTML string emails with type-safe templates |
| 16 | Implement optimistic updates in member/event forms | 1 day | MEDIUM | Use examples in `lib/examples/optimistic-updates.example.tsx` |
| 17 | Add Suspense + skeleton loaders to dashboard | 1-2 days | MEDIUM | Wrap data fetches in Suspense with skeletons |
| 18 | Set up Trigger.dev for background jobs | 1-2 days | MEDIUM | Move bulk operations (email campaigns, CSV imports) to background |
| 19 | Implement pagination in CSV imports | 4 hours | MEDIUM | Batch imports in 100-record chunks to avoid timeouts |
| 20 | Setup Resend Audiences API sync | 1 day | LOW | Offload email management to Resend instead of managing manually |

---

## 🔴 CRITICAL FOR PRODUCTION

**Before deploying to production:**

1. **Run E2E tests** — `npm run test:e2e`
   ```bash
   # Specific test for onboarding redirect race condition
   npm run test:e2e:headed -- e2e/tests/01-onboarding.spec.ts
   ```

2. **Verify Clerk org setup** — Ensure users complete onboarding and reach `/dashboard`
   - Test locally: `npm run restart` then sign up
   - Test on Vercel preview deployment

3. **Database backups** — Set up automated backups in Neon console
   - Enable backup schedule: daily or more frequent
   - Test restore process once

4. **Error tracking** — Verify Sentry is receiving errors
   - Trigger a test error at `/api/health/onboarding`
   - Check Sentry dashboard for errors

5. **Monitoring** — Verify Vercel Analytics and Speed Insights are tracking
   - Visit `/insights` on Vercel dashboard
   - Confirm real user metrics are flowing

6. **Rate limiting** — Verify rate-limit middleware is active
   - Test with `npm run test:unit:safety`

---

## 📋 Quick Links

- **Environment Setup:** [docs/REQUIRED_ENV.md](docs/REQUIRED_ENV.md)
- **Pre-Push Hooks:** [docs/PRE_PUSH_HOOKS.md](docs/PRE_PUSH_HOOKS.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Setup Guide:** [docs/SETUP.md](docs/SETUP.md)
- **Deployment:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🚀 Deployment Commands

```bash
# Local validation
npm run bootstrap:validate-env
npm run typecheck
npm run lint
npm run test:e2e

# Vercel deployment (auto-runs build command)
git push origin main

# Monitor post-deployment
vercel logs --follow
```

---

## 📞 Support

If build fails:
1. Check Vercel build logs for env var errors
2. Run `npm run bootstrap:validate-env` locally
3. Verify DATABASE_URL includes `pgbouncer=true&connection_limit=1`
4. Confirm all TENANT_* vars are set

If onboarding fails:
1. Check `/api/health/onboarding` endpoint
2. Verify Clerk org was created (check Clerk dashboard)
3. Run Playwright test: `npm run test:e2e:headed -- e2e/tests/01-onboarding.spec.ts`
4. Check browser console and Sentry for errors
