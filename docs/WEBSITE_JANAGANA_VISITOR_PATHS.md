# Public website → JanaGana visitor paths

**Milestone:** Website → JanaGana lead / event sync hardening  
**Date:** 2026-05-28  
**Production JanaGana:** https://janagana.namasteneedham.com

---

## Namaste Boston (`namastebostonhomes.com`)

| Visitor action | Where on site | Destination | Goes to JanaGana? |
|----------------|---------------|-------------|-------------------|
| Investment analysis | Homepage **Action center** | `/portal/namaste-boston/contact?interest=investment-analysis` | **Yes** |
| Events & registration | Homepage **Action center** | `/portal/namaste-boston` | **Yes** |
| Investor newsletter | Homepage **Action center** | `/portal/namaste-boston/contact?interest=newsletter` | **Yes** |
| Same three paths | `/contact` sidebar card | Same portal URLs (new tab) | **Yes** |
| General inquiry (buy/sell/mortgage) | Header/footer **Contact**, `/contact` form | `/contact` → NB Supabase (`/api/contact`) | **No** — intentional realtor intake |
| Investor packages / deal tools | `/invest`, hero CTAs | On-site pages + `/contact` | **No** unless user uses Action center |

**Env:** `NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL=https://janagana.namasteneedham.com` (NB Vercel)

**Note:** NB `lib/janagana-client.ts` legacy `/api/plugin/crm/*` sync is **not** used for the Action center; portal forms are the supported path.

---

## The Purple Wings (`thepurplewings.org`)

| Visitor action | Where on site | Destination | Goes to JanaGana? |
|----------------|---------------|-------------|-------------------|
| Classes & register | Homepage **JanaGana** block, nav **Classes & Events**, footer | `/portal/purple-wings` | **Yes** |
| Community updates / newsletter (org) | Homepage **JanaGana** block, dual newsletter section | `/portal/purple-wings/contact?interest=newsletter` | **Yes** |
| Membership interest | Homepage **JanaGana** block | `/portal/purple-wings/contact?interest=membership-interest` | **Yes** |
| Event list on TPW | `/events` | Fetches `GET /api/embed/events?tenantSlug=purple-wings`; cards link to portal register URLs | **Yes** (read API + portal) |
| Weekly financial tips | `/newsletter/subscribe`, footer **Weekly financial tips**, nav **Weekly Tips** | `/api/newsletter/subscribe` → TPW Supabase | **No** — intentional on-site tips list |
| General contact | `/contact` | TPW on-site | **No** |

**Env:** `NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL` or `NEXT_PUBLIC_JANAGANA_API_URL` → production JanaGana URL (TPW Vercel)

---

## JanaGana APIs used by websites

| Endpoint | Purpose |
|----------|---------|
| `GET /api/embed/events?tenantSlug=&maxItems=` | Upcoming published events JSON for TPW `/events` |
| `GET /api/embed/past-events?tenantSlug=` | Past events JSON for TPW |
| Portal `/portal/{slug}/…` | All lead capture and event registration |

CORS: `Access-Control-Allow-Origin: *` on embed routes (read-only).

---

## Tenant isolation

- URL slug is the only tenant resolver for public portal and embed API.
- Canonical slugs: `purple-wings`, `namaste-boston`.
- Test with unique emails per tenant; verify Contacts in admin for **one** org only.

---

## Pilot readiness from public websites

After deploying JanaGana (embed API) and TPW/NB clarity changes:

1. From **NB homepage** → investment analysis → submit test lead → appears under Namaste Boston only.
2. From **TPW homepage** → community updates → submit → appears under Purple Wings only.
3. From **TPW /events** → register on a published event → registration under Purple Wings only.
4. TPW **weekly tips** subscribe → does **not** require JanaGana (by design).

---

## QA contact cleanup

```bash
# Dry run + export (production DB URL required)
PRODUCTION_DATABASE_URL="..." npx tsx scripts/cleanup-qa-contacts.ts --export-csv=qa-contacts-dry-run.csv

# Delete only after reviewing CSV
PRODUCTION_DATABASE_URL="..." npx tsx scripts/cleanup-qa-contacts.ts --confirm --allow-production-qa-cleanup --export-csv=qa-contacts-deleted.csv
```

Matches: `qa-prod-*`, `qa-prod-vercel-*`, `qa-smoke-*`, `test-production-*` only.
