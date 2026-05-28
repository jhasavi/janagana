# NB / TPW Integration Guide

**Janagana v3** ← integration → **Namaste Boston** (`~/nb`) and **The Purple Wings** (`~/tpw`)

This guide defines how to connect the NB and TPW websites to Janagana v3 portal pages.

**Do not modify `~/nb` or `~/tpw` until Phase 1 of this plan is proven.**

---

## Phase 1 — Simple Links (Immediate)

The fastest integration. No code changes to Janagana.

### For Namaste Boston (`~/nb`)

Add links from NB pages to the Janagana portal:

```html
<!-- Events page link -->
<a href="https://janagana.namasteneedham.com/portal/namaste-boston/events">
  View all events and register
</a>

<!-- Specific event link -->
<a href="https://janagana.namasteneedham.com/portal/namaste-boston/events/spring-yoga-class">
  Register for Spring Yoga Class
</a>
```

**Test steps:**
1. Verify `/portal/namaste-boston` loads (no auth required)
2. Verify event list page shows published events
3. Verify registration form accepts a visitor without Clerk auth
4. Verify clicking "Complete registration" shows success message
5. Verify registration appears in Janagana admin dashboard

**Rollback:** Remove the links from NB pages. No Janagana changes required.

### For The Purple Wings (`~/tpw`)

Add links to the TPW portal:

```html
<a href="https://janagana.namasteneedham.com/portal/purple-wings/events">
  Events &amp; Registration
</a>
```

**Tenant requirement:** TPW must have a Tenant record in Janagana with slug `purple-wings`.
Create via: sign in as TPW owner → `/onboarding/create-organization` (slug `purple-wings`), or map an existing Clerk org on the same page.

---

## Phase 2 — Embeddable Event List Widget (After Phase 1 is stable)

A lightweight JavaScript snippet that NB/TPW can embed to show upcoming events inline.

**Janagana v3 API endpoint (to be built in v3.1):**

```
GET /api/public/tenants/[tenantSlug]/events
→ JSON: { events: [ { title, slug, startsAt, location, priceCents } ] }
```

**Embed snippet (example):**
```html
<div id="jg-events"></div>
<script>
  fetch('https://janagana.namasteneedham.com/api/public/tenants/namaste-boston/events')
    .then(r => r.json())
    .then(({ events }) => {
      document.getElementById('jg-events').innerHTML = events.map(e =>
        `<div><a href="https://janagana.namasteneedham.com/portal/namaste-boston/events/${e.slug}">${e.title}</a></div>`
      ).join('');
    });
</script>
```

**Test steps:**
1. Verify API returns only PUBLISHED events for the tenant
2. Verify API does not return other tenants' events
3. Verify widget renders correctly on NB/TPW pages
4. Verify CORS headers are set correctly (`Access-Control-Allow-Origin`)

**Rollback:** Remove the embed script from NB/TPW. No Janagana API changes affect existing portal pages.

---

## Phase 3 — API Integration (After Phase 2 is stable)

Direct API calls for tighter integration: membership status checks, event availability, etc.

API key authentication required (to be designed in v3.2).

---

## Route Recommendations

| Janagana route | NB link text | TPW link text |
|---|---|---|
| `/portal/namaste-boston` | Community Portal | — |
| `/portal/namaste-boston/events` | Events & Classes | — |
| `/portal/purple-wings` | — | Community Portal |
| `/portal/purple-wings/events` | — | Events & Programs |
| `/portal/purple-wings/contact?interest=newsletter` | — | Newsletter signup |
| `/portal/namaste-boston/interest/investment` | Investment interest | — |

---

## Critical Security Check: Public Registration Must Never Create Clerk Org

Before any NB/TPW integration goes live, verify this invariant:

**Test script:**
```bash
# 1. Submit a registration via the portal form
# 2. Check Clerk dashboard: number of orgs must not increase
# 3. Check DB: Contact is created, EventRegistration is created
# 4. Check DB: No new Tenant record is created
```

This check is automated in `e2e/public-registration.test.ts` — run it against
the live portal before each NB/TPW integration phase goes live.

---

## Rollback Steps

For any phase:

1. Remove the links/embed from NB/TPW
2. NB/TPW sites return to their pre-integration state
3. Janagana portal pages remain unchanged — they are additive only
4. No DB rollback is required for Phase 1/2

For Phase 3 (API keys), revoke the API key if integration causes issues.
