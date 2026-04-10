# OrgFlow Monitoring & Observability Guide

This guide covers how to monitor, observe, and troubleshoot the OrgFlow SaaS platform in production.

## Table of Contents

- [Sentry Dashboard](#sentry-dashboard)
- [Key Alerts](#key-alerts)
- [Log Files](#log-files)
- [Metrics](#metrics)
- [Incident Response](#incident-response)
- [Health Checks](#health-checks)
- [Audit Logs](#audit-logs)

---

## Sentry Dashboard

### Accessing Sentry

1. Go to [sentry.io](https://sentry.io)
2. Sign in with your OrgFlow account
3. Select the "OrgFlow" organization

### Projects

**API Project (`orgflow-api`)**
- Backend NestJS errors and performance
- Database query performance
- API response times
- Third-party service errors (Stripe, Resend, Clerk)

**Web Project (`orgflow-web`)**
- Frontend Next.js errors
- Client-side JavaScript errors
- Performance metrics
- User session replays

### Key Metrics to Monitor

**Error Rate**
- Target: < 1%
- Alert if: > 5% sustained for 5 minutes

**Response Time (P95)**
- Target: < 500ms
- Alert if: > 2s sustained for 5 minutes

**User Impact**
- Target: < 1% users affected
- Alert if: > 5% users affected

---

## Key Alerts

### Configure the following alerts in Sentry:

#### Critical Alerts (Immediate Notification)

1. **Error Rate Spike**
   - Condition: Error rate > 10%
   - Duration: 5 minutes
   - Channels: Slack, PagerDuty

2. **New Critical Error**
   - Condition: New error with severity >= error
   - Environment: production
   - Channels: Slack

3. **Performance Degradation**
   - Condition: P95 response time > 2s
   - Duration: 10 minutes
   - Channels: Slack

4. **Database Connection Failure**
   - Condition: Database connection error
   - Environment: production
   - Channels: PagerDuty, Slack

#### Warning Alerts (Within 1 hour)

1. **Increased Error Rate**
   - Condition: Error rate > 5%
   - Duration: 10 minutes
   - Channels: Slack

2. **Slow Response Times**
   - Condition: P95 response time > 1s
   - Duration: 15 minutes
   - Channels: Slack

3. **Third-Party Service Issues**
   - Condition: Stripe/Resend/Clerk API error rate > 5%
   - Duration: 10 minutes
   - Channels: Slack

#### Info Alerts (Daily Digest)

1. **Weekly Error Summary**
   - Condition: Weekly digest
   - Channels: Email

2. **Performance Trends**
   - Condition: Weekly performance report
   - Channels: Email

---

## Log Files

### Log Locations

**API Server (Railway)**
- Application logs: Railway dashboard
- Error logs: `logs/error-YYYY-MM-DD.log`
- Combined logs: `logs/combined-YYYY-MM-DD.log`
- Audit logs: `logs/audit.log`

**Web Server (Vercel)**
- Application logs: Vercel dashboard
- Build logs: Vercel dashboard
- Edge logs: Vercel dashboard

### Log Rotation

- **Retention**: 30 days
- **Max file size**: 20MB per file
- **Compression**: Enabled for files older than 7 days

### Log Format

**Production (JSON)**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request completed",
  "requestId": "req_abc123",
  "tenantId": "tenant_123",
  "userId": "user_456",
  "context": "HTTP",
  "method": "GET",
  "url": "/api/members",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Development (Pretty-print)**
```
2024-01-15T10:30:00.000Z [INFO] [req_abc123] [Tenant: tenant_123] [User: user_456] [HTTP]: Request completed
```

### Querying Logs

**Railway CLI**
```bash
railway logs
railway logs --tail
railway logs --filter "ERROR"
```

**Vercel CLI**
```bash
vercel logs
vercel logs --follow
vercel logs --filter "error"
```

**Log Aggregation (if using external service)**
- Datadog
- Loggly
- Papertrail

---

## Metrics

### Custom Metrics

The application tracks the following business metrics:

#### Counters

- `new_member_created` - New members added
- `member_deleted` - Members removed
- `event_registration` - Event sign-ups
- `event_cancellation` - Event cancellations
- `email_sent` - Emails delivered
- `email_failed` - Email delivery failures
- `payment_processed` - Successful payments
- `payment_failed` - Failed payments
- `stripe_webhook_received` - Stripe webhooks
- `clerk_webhook_received` - Clerk webhooks
- `club_created` - New clubs
- `club_member_joined` - Club memberships
- `club_member_left` - Club departures

#### Histograms

- `volunteer_hours_logged` - Volunteer hours distribution
- `api_response_time` - API response time distribution
- `payment_amount` - Payment amount distribution
- `database_query_duration` - Database query time

#### Gauges

- `active_users` - Current active users per tenant

### Accessing Metrics

**Prometheus Endpoint (Internal)**
```
GET /metrics
```

**Metrics Format (Prometheus-compatible)**
```
new_member_created{tenantId="tenant_123",tierId="premium"} 42
api_response_time{endpoint="/api/members",method="GET"} 150
api_response_time_p50{endpoint="/api/members",method="GET"} 120
api_response_time_p95{endpoint="/api/members",method="GET"} 250
api_response_time_p99{endpoint="/api/members",method="GET"} 500
```

### Key Performance Indicators

**API Performance**
- P50 response time: < 100ms
- P95 response time: < 500ms
- P99 response time: < 1s
- Error rate: < 1%

**Database Performance**
- Query P50: < 10ms
- Query P95: < 50ms
- Connection pool utilization: < 80%

**Cache Performance**
- Hit rate: > 80%
- Miss rate: < 20%

---

## Incident Response

### Incident Severity Levels

**P0 - Critical**
- System completely down
- Data loss
- Security breach
- Response time: < 15 minutes

**P1 - High**
- Major feature unavailable
- Significant performance degradation
- Response time: < 1 hour

**P2 - Medium**
- Minor feature unavailable
- Slight performance impact
- Response time: < 4 hours

**P3 - Low**
- Cosmetic issues
- Documentation errors
- Response time: < 24 hours

### Incident Response Playbook

#### 1. Detection

**Symptoms**
- Spike in error rate
- Performance degradation
- Health check failures
- User reports

**Verification**
- Check Sentry for errors
- Check health endpoint: `GET /health/ready`
- Check log files for errors
- Verify third-party service status

#### 2. Assessment

**Questions to Answer**
- What is the scope of the issue?
- How many users are affected?
- Is it a regression or new issue?
- Are there any recent deployments?

**Gather Information**
- Correlation ID from error page
- Request ID from logs
- User reports with timestamps
- Recent deployment history

#### 3. Containment

**Immediate Actions**
- Roll back recent deployment if needed
- Scale up resources if applicable
- Enable maintenance mode if necessary
- Notify stakeholders

#### 4. Resolution

**Fix Implementation**
- Apply hotfix
- Deploy fix to staging first
- Test thoroughly
- Deploy to production

#### 5. Recovery

**Post-Incident**
- Verify fix is working
- Monitor for recurrence
- Clear maintenance mode
- Notify users of resolution

#### 6. Post-Mortem

**Document**
- Root cause analysis
- Timeline of events
- What went well
- What could be improved
- Action items

**Template**
```markdown
# Post-Mortem: [Incident Title]

## Summary
[Brief description]

## Timeline
- [Time]: [Event]
- [Time]: [Event]

## Root Cause
[What caused the issue]

## Impact
[How many users affected, duration, etc.]

## Resolution
[How it was fixed]

## Follow-up Actions
- [ ] [Action item]
- [ ] [Action item]
```

---

## Health Checks

### Health Endpoints

**Liveness Check**
```bash
GET /health/live
```
Returns server is running.

**Readiness Check**
```bash
GET /health/ready
```
Returns detailed health status including:
- Database connection
- Redis connection
- Stripe connectivity
- Resend connectivity

**Basic Health**
```bash
GET /health
```
Returns basic health information.

### Response Format

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "uptime_formatted": "1d",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "latency": "15ms"
    },
    "redis": {
      "status": "up",
      "latency": "5ms"
    },
    "stripe": {
      "status": "up",
      "latency": "200ms"
    },
    "resend": {
      "status": "up",
      "latency": "150ms"
    }
  }
}
```

### Monitoring Health Checks

**Automated Monitoring**
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Check every 1 minute
- Alert on 2 consecutive failures

**Manual Checks**
```bash
# Quick health check
curl https://api.orgflow.app/health

# Detailed readiness check
curl https://api.orgflow.app/health/ready

# With timing
time curl https://api.orgflow.app/health
```

---

## Audit Logs

### What is Logged

Every sensitive action is logged with:
- Timestamp
- Actor (userId or "system")
- Action (e.g., "member.status_changed")
- Target entity type and ID
- Old value / New value
- IP address
- User agent
- Tenant ID

### Logged Actions

**Member Management**
- `member.created`
- `member.updated`
- `member.deleted`
- `member.status_changed`

**Event Management**
- `event.created`
- `event.updated`
- `event.deleted`

**Payments**
- `payment.processed`
- `payment.failed`

**Authentication**
- `auth.login`
- `auth.logout`

**Permissions**
- `permission.granted`
- `permission.revoked`

**API Access**
- `api.call` (for API keys)

### Querying Audit Logs

**Via API**
```bash
GET /api/audit-logs?tenantId=xxx&startDate=xxx&endDate=xxx
```

**Export for Compliance**
```bash
GET /api/audit-logs/export?tenantId=xxx&startDate=xxx&endDate=xxx
```

**Direct Database Query**
```sql
SELECT * FROM audit_log
WHERE tenant_id = 'xxx'
  AND timestamp >= '2024-01-01'
  AND timestamp <= '2024-01-31'
ORDER BY timestamp DESC;
```

### Audit Log File

**Location**: `logs/audit.log`

**Format**: JSON Lines (NDJSON)

**Example**
```json
{"timestamp":"2024-01-15T10:30:00.000Z","action":"member.created","entityType":"Member","entityId":"member_123","actor":"user_456","actorType":"user","oldValue":null,"newValue":{"email":"john@example.com"},"ipAddress":"192.168.1.1","userAgent":"Mozilla/5.0...","tenantId":"tenant_789","metadata":{}}
```

---

## Status Page

### Public Status Page

**URL**: `https://orgflow.app/status`

The status page shows:
- Overall system status
- Individual service status
- Uptime history (last 30 days)
- Recent incidents
- Subscribe to updates

### Status Page Configuration

The status page fetches data from the health endpoint:
```
https://api.orgflow.app/health/ready
```

### Updating Status Page

During incidents, update the status page to:
1. Add incident details
2. Set appropriate status (investigating, identified, monitoring, resolved)
3. Provide estimated resolution time
4. Communicate with subscribers

---

## Troubleshooting

### Common Issues

#### High Error Rate

**Symptoms**
- Spike in Sentry errors
- Users reporting errors
- Health check failing

**Steps**
1. Check Sentry for error patterns
2. Identify common error message
3. Check recent deployments
4. Verify database connectivity
5. Check third-party service status

#### Slow Performance

**Symptoms**
- Increased response times
- Timeouts
- User complaints

**Steps**
1. Check metrics for P95/P99 times
2. Check database query performance
3. Check cache hit rates
4. Check server CPU/memory usage
5. Check network latency

#### Database Issues

**Symptoms**
- Database connection errors
- Slow queries
- Connection pool exhaustion

**Steps**
1. Check health endpoint database status
2. Check Neon dashboard for issues
3. Review slow query logs
4. Check connection pool settings
5. Verify database migration status

#### Third-Party Service Issues

**Symptoms**
- Stripe/Resend/Clerk errors
- Webhook failures
- Payment processing failures

**Steps**
1. Check third-party service status pages
2. Verify API keys are valid
3. Check webhook endpoints are accessible
4. Review rate limits
5. Check service quotas

---

## Monitoring Tools

### Recommended Tools

**Application Monitoring**
- Sentry (Error tracking)
- Datadog (APM, if budget allows)
- New Relic (APM, if budget allows)

**Log Aggregation**
- Railway Logs (built-in)
- Vercel Logs (built-in)
- Datadog Logs (optional)
- Loggly (optional)

**Infrastructure Monitoring**
- Railway Metrics (built-in)
- Vercel Analytics (built-in)
- Datadog Infrastructure (optional)

**Uptime Monitoring**
- UptimeRobot (free tier)
- Pingdom (free tier)
- Better Uptime (free tier)

### Tool Configuration

**Sentry**
- DSN: Set in environment variables
- Environment: development/staging/production
- Release: Auto-detected from package.json
- Sample rates: Configured per environment

**Railway**
- Built-in metrics dashboard
- Log streaming
- Resource usage monitoring
- Auto-scaling configuration

**Vercel**
- Real-time logs
- Performance metrics
- Analytics dashboard
- Edge network monitoring

---

## Best Practices

### Development

1. **Always log with context**
   - Include tenant ID, user ID, request ID
   - Use structured logging
   - Log at appropriate levels

2. **Use correlation IDs**
   - Generate unique ID per request
   - Pass through all service calls
   - Include in error reports

3. **Monitor in development**
   - Enable Sentry in dev with 100% sampling
   - Test error reporting
   - Verify performance tracking

### Production

1. **Set appropriate sampling rates**
   - Development: 100%
   - Staging: 50%
   - Production: 10%

2. **Filter expected errors**
   - Ignore 404s
   - Ignore validation errors
   - Ignore client aborts

3. **Regular maintenance**
   - Review error reports weekly
   - Update alert thresholds
   - Clean up old logs
   - Review audit logs quarterly

4. **Security**
   - Never log sensitive data
   - Sanitize PII in logs
   - Use secure log storage
   - Implement log access controls

---

## Contact

**On-Call Rotation**
- Primary: [email]
- Secondary: [email]
- Escalation: [email]

**Slack Channels**
- #alerts-production - Critical alerts
- #monitoring - General monitoring
- #incidents - Incident response

**Emergency Contacts**
- Technical Lead: [email/phone]
- DevOps: [email/phone]
- CTO: [email/phone]
