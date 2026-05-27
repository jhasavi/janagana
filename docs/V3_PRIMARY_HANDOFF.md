# V3 Primary Handoff

Date: 2026-05-27
Repository: janagana-v3 (to become ~/janagana)
Latest commit: ccfdb0b

## What Works

- v3 foundation and quality gates are green.
- Clerk auth + tenant spine works for admin.
- The Purple Wings tenant dashboard works.
- Admin can create members/contacts, tiers, and events.
- Public portal works at /portal/purple-wings.
- Public portal shows only published events.
- Public visitor can register with first name, last name, email, phone.
- Registration path creates/reuses Contact and creates EventRegistration in same tenant.
- Duplicate registration is handled without duplicate rows.
- Admin events page shows registration counts.
- Admin can view event registration details (name, email, phone, status, timestamp).

## Manual Demo Result

Manual demo completed with one known local issue:
- Sign-out redirected to https://127.0.0.1:3021 instead of localhost:3020.

Manual checks confirmed:
- Admin sign-in and The Purple Wings dashboard access.
- Published event visible in public portal.
- Public registration flow works end to end.
- Admin sees registration count and attendee details.
- Public registration does not create Clerk org/user.
- Re-login returns to The Purple Wings dashboard without onboarding loop.

## Deferred Scope (Not Included)

- CRM features
- Stripe/payment flows
- Donations/fundraising
- Volunteering
- Communications/automation
- Analytics/reporting
- NB/TPW external integration
- Deployment/push automation

## Known Limitations

- No capacity limit enforcement at registration submit time.
- No attendee edit/cancel admin workflow yet.
- No email confirmations.
- No pagination/filtering on registration list.
- Local sign-out redirect host/port can be wrong if app URL env points to another origin.
- Playwright warns about allowedDevOrigins for 127.0.0.1 in Next.js dev mode.

## Local Start

1. Install deps:
   - npm install
2. Start app on local dev port:
   - PORT=3020 npm run dev
3. Open:
   - http://localhost:3020

## Test Commands

- npm run build
- npm run typecheck
- npm run lint
- npm run prisma:validate
- npm run check:env
- npm run check:db:test
- npm run test:actions
- npm run test:portal
- npm run test:e2e:foundation
- npm run test:e2e:env
- npm run test:e2e:portal

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
