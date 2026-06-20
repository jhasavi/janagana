# Tenant website integration (architect view)

**Audience:** Operators, tenant web developers, and future platform engineers.  
**Pilot tenants:** `namaste-boston`, `purple-wings`

---

## One sentence

**Operators use JanaGana dashboard; visitors use tenant-branded transaction pages on JanaGana (linked or embedded from the tenant site).**

---

## Two planes (never mix them)

```mermaid
flowchart LR
  subgraph operator["Operator plane — Clerk required"]
    A[Operator] --> B[janagana.namasteneedham.com/dashboard]
    B --> C[(Tenant data)]
  end

  subgraph visitor["Visitor plane — no Clerk"]
    V[Website visitor] --> W[thepurplewings.org / namasteneedham.com]
    W -->|CTA link or embed| P[/portal/{slug}/…]
    P --> C
  end
```

| Plane | Who | URL | Auth |
|-------|-----|-----|------|
| **Operator** | Board, staff, volunteers running CRM | `https://janagana.namasteneedham.com/dashboard` | Clerk org membership |
| **Visitor** | Members, leads, event registrants | `https://janagana.namasteneedham.com/portal/{slug}/…` | None |

Visitors should **never** see the dashboard or sign in with Clerk for newsletter, membership, or event registration.

---

## What lives where (pilot)

| Capability | Operator (dashboard) | Visitor (portal / website) |
|------------|----------------------|----------------------------|
| View contacts & leads | ✓ Contacts & leads | — |
| Create events, publish | ✓ Events | — |
| Export CSV | ✓ | — |
| Portal branding (logo, tagline) | ✓ Portal & setup | Shown on `/portal/{slug}` header |
| Event registration | — | `/portal/{slug}/register/{eventSlug}` |
| Newsletter / lead capture | — | `/portal/{slug}/contact?interest=…` |
| Membership join / checkout | — | `/portal/{slug}/join` |
| Event list on tenant site | — | Embed API or link to portal events |

**Dashboard → Portal & setup** lists the exact visitor URLs to wire into the tenant website.

---

## Integration maturity (how “native” it feels)

### Level 1 — Link-out (pilot today) ✓

Tenant site buttons open JanaGana portal in same tab or new tab. After submit, `returnTo` sends visitors back to the tenant site (e.g. `/events?registration=registered`).

- **Pros:** Fastest to deploy; one JanaGana deploy serves all tenants.
- **Cons:** URL bar shows `janagana.namasteneedham.com` briefly.

### Level 2 — Embed + return (pilot today) ✓

- **Event cards:** `GET /api/embed/events?tenantSlug=purple-wings` — tenant site renders its own UI.
- **Forms in iframe:** append `?embed=1` to portal URLs for minimal chrome (no “third product” nav).

Example iframe src:

```html
<iframe
  title="Register for class"
  src="https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter&embed=1&returnTo=https%3A%2F%2Fwww.thepurplewings.org%2Fevents"
  class="w-full min-h-[520px] rounded-xl border-0"
></iframe>
```

### Level 3 — Path or domain proxy (post-pilot)

Examples: `www.thepurplewings.org/register/...` or `portal.thepurplewings.org` → reverse proxy to JanaGana `/portal/purple-wings/...`. Visitor never sees the platform hostname.

### Level 4 — Headless API (post-pilot)

Tenant site posts leads/registrations via API keys; JanaGana is backend only. Highest engineering cost.

**Recommendation for NB/TPW pilot:** Level 1 + 2. Level 3 when a tenant requests custom domain.

---

## Deploy a tenant (checklist)

### A. Platform (once per tenant — admin / ops)

1. Clerk production org exists.
2. `Tenant` row: `slug`, `clerkOrgId`, `status=ACTIVE` (`pilot:seed` or `pilot:bootstrap`).
3. Operators added to Clerk org → can open dashboard and switch if multi-tenant.
4. Membership tiers preserved or created in dashboard.

### B. Operator (per tenant — no code)

1. Sign in → select community → **Portal & setup**.
2. Set logo, tagline, contact email (visitor portal header).
3. Copy **Website links** into tenant site CTAs.
4. Publish at least one event; copy register link for outreach.
5. Run one incognito registration; confirm Contacts + Registrations.

### C. Tenant website (developer)

1. Replace legacy CRM/register URLs with **Portal & setup** links.
2. Use `returnTo` on links (TPW helpers in `janagana-portal.ts` already do this).
3. Optional: embed event list via `/api/embed/events`.
4. Optional: iframe forms with `?embed=1`.
5. Keep tenant-native flows that stay on tenant (e.g. TPW weekly tips → Supabase).

### D. Verify

- Unique test email per flow.
- Data appears only under correct tenant in dashboard.
- Visitor returns to tenant site after registration (when `returnTo` set).

---

## NB vs TPW intentional split

| Flow | Namaste Boston | The Purple Wings |
|------|----------------|------------------|
| Community/event newsletter (JanaGana CRM) | Portal contact | Portal contact |
| Weekly tips email | On-site if applicable | TPW `/newsletter/subscribe` (Supabase) — **not** JanaGana |
| Investment analysis | Portal contact | — |
| Classes / events | Portal events | Portal events + embed on `/events` |

Two newsletter paths on TPW is **by design**, not a bug.

---

## What a principal architect would **not** do in pilot

- Put operator dashboard on tenant domain (security + Clerk complexity).
- Build full page builder inside JanaGana before CRM/events are stable.
- Force every visitor flow through Clerk.
- Duplicate contact data on tenant DB and JanaGana for the same lead (pick one source of truth per flow).

---

## Related docs

- [03-NB-TPW-WEBSITES.md](./03-NB-TPW-WEBSITES.md) — CTA table
- [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) — TPW sign-off checklist
- [02-AUTH-TENANT.md](./02-AUTH-TENANT.md) — Clerk vs tenant vs slug
