# JanaGana — Monitoring & Observability

---

## Sentry

### Projects

Set up one Sentry project of type **Next.js** and use a **single DSN** for both server and client:
- `SENTRY_DSN` — server-side (Server Actions, API routes)
- `NEXT_PUBLIC_SENTRY_DSN` — client-side (browser errors, caught boundaries)

### Configuration files

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser error capture, replay |
| `sentry.server.config.ts` | Server-side error capture, tracing |
| `sentry.edge.config.ts` | Edge runtime (middleware) |

### Key metrics to monitor

| Metric | Target | Alert threshold |
|--------|--------|-----------------|
| Error rate | < 1% | > 5% for 5 min |
| P95 response time | < 500 ms | > 2 s for 5 min |
| % of users affected | < 1% | > 5% |
| Database errors | 0 | Any |

### Key alerts to configure

**Critical (page immediately):**
- Error rate spike > 10% for 5 min
- New error with severity `fatal` or `error` in `production`
- P95 latency > 2 s for 10 min
- Database connection errors

**Warning (Slack, within 1 hour):**
- Error rate > 5% for 10 min
- Stripe / Resend / Clerk API errors > 5%
- P95 latency > 1 s for 15 min

**Info (daily digest):**
- New issues summary
- Weekly error & performance digest

---

## Structured Logging

All Server Actions and API routes log with this pattern:

```typescript
console.error('[actionName]', { tenantId, clerkId, error })
console.log('[actionName] success', { tenantId, resourceId })
```

Key log events to watch:
- `[getTenant] no activeOrgId` — org session not established; investigate onboarding race
- `[getTenant] resolved via cookie` — cookie fallback used (normal after fresh onboarding)
- `[completeOnboarding]` errors — org/tenant creation failures
- `[stripe webhook]` errors — payment processing failures
- `[clerk webhook]` errors — organization sync failures

### Log format (production — JSON)

```json
{
  "timestamp": "2026-04-16T10:30:00.000Z",
  "level": "error",
  "message": "[createMember] Failed to create member",
  "tenantId": "tenant_abc123",
  "clerkId": "user_xyz456",
  "error": "Unique constraint failed: member.email"
}
```

---

## Health Checks

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health/onboarding` | DB connectivity + Clerk config presence |

### Monitor via uptime service

Recommended: Vercel Cron + Sentry crons, or a simple external uptime monitor (Better Uptime, UptimeRobot).

Add a heartbeat cron that hits `/api/health/onboarding` every 5 minutes and alerts if it returns non-200.

---

## Audit Logs

In-app audit logs are stored in the `AuditLog` Prisma model and viewable at `/dashboard/settings/audit`. Fields:

| Field | Description |
|-------|-------------|
| `action` | `CREATE`, `UPDATE`, `DELETE` |
| `resourceType` | `Member`, `Event`, `VolunteerOpportunity`, etc. |
| `resourceId` | ID of the affected record |
| `actorClerkId` | Clerk user who performed the action |
| `tenantId` | Tenant scope |
| `metadata` | JSON diff or extra context |

---

## Incident Response

### Onboarding broken (user stuck on /onboarding)

1. Check server logs for `[getTenant]` — look for missing `activeOrgId`.
2. Check if `JG_ACTIVE_ORG` cookie is being set by `/api/active-org`.
3. Run repair script dry-run: `CLERK_SECRET_KEY=sk_... npx tsx scripts/repair-orphan-tenants.ts --output=out.json`
4. If tenant exists but `clerkOrgId` is null, run with `--commit` after backup.

### Payment webhook not processing

1. Check Stripe Dashboard → Webhooks → recent events for delivery failures.
2. Check server logs for `[stripe webhook]` errors.
3. Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret.
4. Test with: `stripe trigger checkout.session.completed`

### Database connection failure

1. Check Neon console for project status and connection limits.
2. Verify `DATABASE_URL` in environment.
3. Check Prisma connection pool — ensure `prisma.$connect()` isn't timing out.

### Email not delivering

1. Check Resend Dashboard → Logs for bounce/block.
2. Verify `RESEND_API_KEY` and `EMAIL_FROM` domain is verified in Resend.
3. Check `[sendEmail]` logs in server output.

---

## Vercel Logs

```bash
# Tail production logs (Vercel CLI)
vercel logs --follow

# Filter errors
vercel logs --filter "ERROR"
```

---

## Key Business Metrics to Track (Sentry Custom Performance)

- `new_member_created` — new members per tenant per day
- `event_registration` — registrations per event
- `payment_processed` — successful Stripe payments
- `payment_failed` — failed payments (alert if > 0)
- `email_sent` / `email_failed` — Resend delivery ratio
- `webhook_delivered` / `webhook_failed` — outbound webhook delivery ratio
