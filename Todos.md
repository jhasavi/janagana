# Production readiness backlog (July 2026)

## Implemented (this pass)

| # | Item | Deliverable |
|---|------|-------------|
| 1 | Pilot sign-off automation | `npm run verify:pilot-signoff` + docs/04 sign-off template |
| 2 | Production env verification | `npm run verify:production-env -- --strict` + check-env RESEND/CRON warnings |
| 3 | Production smoke orchestration | `npm run verify:production-ready` |
| 4 | TPW integration gate | `npm run verify:tpw` (existing, wired into orchestrator) |
| 5 | Renewal reminder cron | `vercel.json` cron + `/api/cron/renewal-reminders` |
| 6 | Full release gate | `npm run gate:release` (run before deploy) |
| 7 | NB tenant parity gate | `npm run verify:nb` |
| 8 | Multi-admin RBAC | Clerk org role → `canWrite`; view-only banner; write actions guarded |
| 9 | Refunds workflow | Mark refunded on `/dashboard/payments` |
| 10 | Monitoring + alerts | `/api/health/ready` DB metrics + `OPS_ALERT_WEBHOOK_URL` on failures |
| 11 | Authenticated member self-service portal | `/portal/[tenantSlug]/account` — magic-link sign-in, profile edit, renew, activity timeline |

## Manual owner steps (cannot automate)

- [ ] Complete Part A/B in `docs/01-PILOT-RUNBOOK.md` for PW + NB (signed-in admin + incognito registration)
- [ ] Set Vercel env: `CRON_SECRET`, `RESEND_API_KEY`, live Stripe keys, `OPS_ALERT_WEBHOOK_URL`
- [ ] Record sign-off line in `docs/04-PRODUCTION.md`

## Commands

```bash
npm run verify:production-ready
npm run gate:release
curl https://janagana.namasteneedham.com/api/health/ready
```

## Phase 2 (not prod blockers)

- Households / group membership
