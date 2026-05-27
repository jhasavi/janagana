# V3 Primary Handoff

Date: 2026-05-27
Repository: ~/janagana (v3 primary)
Latest commit: 62a0094

## What Works

- v3 foundation and local quality gates are green.
- Clerk auth + tenant spine works for admin.
- Purple Wings tenant workflow works end to end.
- Public registration enforces capacity by confirmed registrations only.
- Duplicate registration returns friendly already-registered result without duplicate rows.
- Admin can cancel and re-confirm registrations from event attendee page.
- Event list shows confirmed registration counts clearly.
- Local sign-out redirect is stable on localhost:3020.
- Second-tenant hardening code path is present:
   - dashboard switch link to /select-organization
   - active tenant cookie validated against mapped Clerk memberships
   - two-tenant isolation scripts pass for portal and registration behavior

## Manual Demo Result

Manual demo completed for Purple Wings loop:
- Admin creates event
- Public registers
- Admin sees attendee
- Capacity/cancel/re-confirm operations work

Second-tenant status:
- Namaste Boston Clerk organization is not yet present in Clerk for this local environment.
- Explicit owner onboarding is required before final Namaste mapping proof.

## Deferred Scope (Not Included)

- CRM features
- Stripe/payment flows
- Donations/fundraising
- Volunteering
- Communications/automation
- Analytics/reporting
- NB/TPW external website integration
- Deployment/push automation

## Known Limitations

- Namaste Boston final multi-tenant live switch proof is blocked until Namaste Clerk org is explicitly created by owner onboarding.
- No email confirmations.
- No pagination/filtering on registration list.
- Playwright warns about allowedDevOrigins for 127.0.0.1 in Next.js dev mode.

## Local Start

1. Install deps:
   - npm install
2. Start app on local dev port:
   - ./start.sh
3. Open:
   - http://localhost:3020

## Namaste Boston Setup (Local)

1. Run inventory:
   - npm run inventory:tenants
2. If Namaste org exists in Clerk, run setup:
   - npm run setup:namaste
3. If Namaste org does not exist, owner must create it first:
   - sign in and open /onboarding/create-organization
   - create Name: Namaste Boston
   - create Slug: namaste-boston
   - rerun npm run setup:namaste

## Test Commands

- npm run build
- npm run typecheck
- npm run lint
- npm run prisma:validate
- npm run check:env
- npm run check:db:test
- npm run test:actions
- npm run test:portal
- npm run test:registration:ops
- npm run test:second-tenant
- npm run test:e2e:foundation
- npm run test:e2e:env
- npm run test:e2e:portal
- npm run smoke:local-redirects

## Environment Requirements

Required env vars:
- NEXT_PUBLIC_APP_URL
- DATABASE_URL
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET

Recommended local values:
- NEXT_PUBLIC_APP_URL=http://localhost:3020
- Keep all secrets scoped to non-production/test Clerk + non-production DB.

## DB Reset Warning

- This repo includes local/dev safety scripts that can reset or clean app data.
- Never run reset/repair scripts against production-like databases.
- Verify DATABASE_URL target before running DB mutation scripts.

## Rollback Plan

If folder swap causes issues:

1. cd ~
2. mv janagana janagana-v3
3. mv janagana-old janagana

No data/folder deletion is required.

## Old Project Status (Captured Pre-Swap)

Old repo path: ~/janagana

- git status --short: clean
- branch: recovery-fix-signin-500 (ahead 1)
- recent commits:
  - a69041f quick_push
  - c763113 chore: improve existing website workflows with help guidance and onboarding clarity
  - 27d92e1 fix: add marketing homepage and improve dashboard onboarding/setup routing
  - 1be0860 fix(stripe): tenant-aware membership readiness messaging and add prod-ready Stripe setup workflow; include regression coverage
  - 788da7b fix(launch-center): card outer element is now the Link — full-area click navigation; fix spec 17 BUG-001/002 test reliability (15s timeout, card.click position)
