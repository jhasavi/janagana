# Production Release Status

**Date:** 2026-05-28 (Vercel CLI re-verification)  
**Release engineer:** jhasavi (team: `sanjeevs-projects-e08bbbfb`)

---

## Deployed Commits

| Project | GitHub `main` HEAD | Production deploy (Vercel CLI) | Notes |
|---------|-------------------|-------------------------------|--------|
| janagana | `577d720` | Ready ~7m ago; alias `janagana.namasteneedham.com` | Includes `e32313f` dashboard semantics + QA docs |
| tpw | `5a77dec` | Ready ~7m ago; `tpw-five.vercel.app` | Exit-intent / wizard suppress fix |
| nb | `3982e8a` | Ready ~17h ago; `nb-mu-ten.vercel.app` | Includes `b90e655` JanaGana portal CTAs; live HTML verified |

Commit SHA not exposed in `vercel inspect` JSON on this account; deploy freshness inferred from deployment age vs git push.

**2026-05-28 automated verification:** GET smoke + Playwright leads on custom domain passed. QA emails submitted: `qa-prod-vercel-pw-1779983847@example.com`, `qa-prod-vercel-nb-1779983847@example.com`. Admin dashboard still requires owner Clerk login.

---

## Deployment URLs

| Project | Vercel URL | Production Domain |
|---------|------------|-------------------|
| janagana | https://janagana-api.vercel.app | https://janagana.namasteneedham.com |
| tpw | https://tpw-five.vercel.app | — |
| nb | https://nb-mu-ten.vercel.app | — |

**Smoke-tested Vercel alias:** `https://janagana-sanjeevs-projects-e08bbbfb.vercel.app`

---

## Custom Domain Status

- **Domain:** `janagana.namasteneedham.com`
- **Status:** ✅ LIVE — attached to Vercel janagana project as production alias
- **DNS:** Resolves to `216.198.79.65` (Vercel edge)
- **Verification:** `socket.gethostbyname('janagana.namasteneedham.com')` → 200 on all smoke routes
- **No manual DNS action required** — domain was already pointing to Vercel

---

## Env Variable Status (Production)

Variables present in Vercel production environment (values not shown):

**Active / required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` ← added this session
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` ← added this session
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

**Stale / legacy (from old project architecture — not used by v3 code, non-breaking):**
- `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_DOMAIN`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `CLOUDINARY_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING`
- `RESEND_API_KEY`
- `TENANT_SLUG`, `TENANT_BRAND_NAME`, `TENANT_BRAND_PRIMARY_COLOR`
- `TENANT_DEFAULT_LOCALE`, `TENANT_DEFAULT_TIMEZONE`
- `TENANT_ONBOARDING_DEFAULT_*`, `ONBOARDING_DEFAULT_API_KEY_NAME`

**2026-05-28 env pull check (values not logged):** `NEXT_PUBLIC_APP_URL` matches `https://janagana.namasteneedham.com`. Clerk publishable key is **live** (`pk_live_*`). `DATABASE_URL` is present in Vercel production (encrypted; not included in CLI pull file). `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` present in Vercel (added ~18h ago).

---

## Smoke Test Results — 2026-05-27

### JanaGana — Vercel URL (`janagana-sanjeevs-projects-e08bbbfb.vercel.app`)

| Route | Expected | Result |
|-------|----------|--------|
| `/api/health/ready` | 200 | ✅ 200 |
| `/` | 200 (auth redirect) | ✅ 200 |
| `/portal/purple-wings` | 200 | ✅ 200 |
| `/portal/namaste-boston` | 200 | ✅ 200 |
| `/portal/purple-wings/contact?interest=newsletter` | 200 | ✅ 200 |
| `/portal/namaste-boston/contact?interest=investment` | 200 | ✅ 200 |

### JanaGana — Custom Domain (`janagana.namasteneedham.com`)

| Route | Expected | Result |
|-------|----------|--------|
| `/api/health/ready` | 200 | ✅ 200 |
| `/` | 200 (auth redirect) | ✅ 200 |
| `/portal/purple-wings` | 200 | ✅ 200 |
| `/portal/namaste-boston` | 200 | ✅ 200 |
| `/portal/purple-wings/contact?interest=newsletter` | 200 | ✅ 200 |
| `/portal/namaste-boston/contact?interest=membership-interest` | 200 | ✅ 200 |
| `/portal/namaste-boston/contact?interest=investment-analysis` | 200 | ✅ 200 |
| `/portal/namaste-boston/contact?interest=newsletter` | 200 | ✅ 200 |

**Overall JanaGana status:** Production smoke passed on both Vercel URL and custom domain.

---

## CTA Verification

### TPW (`tpw-five.vercel.app`) → JanaGana

Links found in live homepage HTML:

| CTA | Target URL |
|-----|-----------|
| Portal home | `https://janagana.namasteneedham.com/portal/purple-wings` |
| Newsletter | `https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter` |
| Membership interest | `https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=membership-interest` |

✅ All TPW CTAs point to custom domain. All targets return 200.

### NB (`nb-mu-ten.vercel.app`) → JanaGana

Links found in live homepage HTML:

| CTA | Target URL |
|-----|-----------|
| Portal home | `https://janagana.namasteneedham.com/portal/namaste-boston` |
| Investment analysis | `https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=investment-analysis` |
| Newsletter | `https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=newsletter` |

✅ All NB CTAs point to custom domain. All targets return 200.

---

## Test Lead / Contact Verification

**Status:** NOT TESTED programmatically.

The contact form uses Next.js server actions (not a REST endpoint), which cannot be invoked from Python/curl without proper `Next-Action` headers and CSP tokens.

**Required manual test:**
1. Open https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter in a browser
2. Submit with first name: `Test`, last name: `Lead`, email: `test-purple-newsletter@example.com`, phone: optional
3. Open https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=investment-analysis
4. Submit with email: `test-namaste-investment@example.com`
5. Verify both contacts appear in JanaGana dashboard under the correct tenant
6. Clean up test contacts from dashboard or DB after verification

---

## Known Limitations

### JanaGana
- `NEXT_PUBLIC_APP_URL` in Vercel production was set 46 days ago — value may be old project URL, not `https://janagana.namasteneedham.com`. Non-blocking for portal routes but may affect sign-in redirects.
- Vercel production env contains ~15 stale vars from old architecture (Stripe, Cloudinary, Sentry, etc.). Non-breaking; recommend cleanup once stable.
- Vercel SSO protection was disabled globally (not per-route) — all deployment URLs are publicly accessible.

### TPW
- **171 pre-existing lint errors** — all `react/no-unescaped-entities` throughout codebase. Not introduced by this session's changes. Vercel build does not run lint, so these do not block deployment. See lint debt note below.
- Deployment URL is `tpw-five.vercel.app` — no custom domain attached.

### NB
- Deployment URL is `nb-mu-ten.vercel.app` — no custom domain attached.
- Lint is now 0 errors (fixed this session).

---

## TPW Lint Debt

- **Error count:** 171 errors (run `npm run lint` in `~/tpw`)
- **Rule:** `react/no-unescaped-entities` (apostrophes and quotes in JSX without HTML entity encoding)
- **Source:** Pre-existing across entire `src/` directory, not introduced by this session
- **Blocking:** No — Vercel build does not run lint
- **Fix approach when ready:** Run `npx eslint src/ --fix` (auto-fixable for apostrophes), then review and commit
- **Priority:** Low

---

## Next Manual Action Required

1. **Update `NEXT_PUBLIC_APP_URL`** in Vercel production to `https://janagana.namasteneedham.com`
   - CLI: `vercel env rm NEXT_PUBLIC_APP_URL production` → `vercel env add NEXT_PUBLIC_APP_URL production`
   - Value: `https://janagana.namasteneedham.com`
   - Then redeploy: `vercel --prod` or push a commit to trigger auto-deploy

2. **Manual lead form test** — see "Test Lead / Contact Verification" above

3. **Clean up stale Vercel env vars** (low priority, non-blocking) — remove legacy vars listed in env section

---

## Rollback Notes

### JanaGana
- Previous working state: commit `a3b1560` (vercel.json with build command only, no prisma generate)
- To rollback: `git revert 0d1ed92 && git push origin main` — Vercel will auto-deploy
- Database: Neon (Postgres). No schema migrations were run in this session. Rollback requires no DB changes.
- Env: `.env.local` was rebuilt from scratch. See session summary for key fingerprints.

### NB
- Previous state: commit `b90e655` (before lint fixes)
- Rollback: `git revert 3982e8a && git push origin main`

### TPW
- Previous state: commit `24b3bfd` (before ESLint flat config)
- Rollback: `git revert 628aa82 && git push origin main`
- Note: Rolling back TPW would re-break `npm run lint` (reverts eslint.config.js and package.json lint script)

---

## Recommended Next Milestone

**Milestone: Auth Flow + Onboarding Production Validation**

1. Sign up a real user account via `https://janagana.namasteneedham.com/sign-up`
2. Complete organization onboarding at `/onboarding/create-organization`
3. Verify tenant row created in DB with correct slug
4. Verify dashboard is accessible post-onboarding
5. Update `NEXT_PUBLIC_APP_URL` first (step 1 in manual actions above)

Do not start Stripe, CRM-lite, or automation work before this milestone is validated.
