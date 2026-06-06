# NB & TPW website integration

**Production JanaGana:** https://janagana.namasteneedham.com  
**Canonical slugs:** `namaste-boston`, `purple-wings` (see `lib/pilot/tenants.ts`)  
**TPW full integration checklist:** [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md) (complete TPW before NB)

## Namaste Boston

| Visitor action | Destination | JanaGana? |
|----------------|-------------|-----------|
| Investment analysis | `/portal/namaste-boston/contact?interest=investment-analysis` | Yes |
| Events | `/portal/namaste-boston/events` | Yes |
| Membership join | `/portal/namaste-boston/join` | Yes |
| Newsletter | `/portal/namaste-boston/contact?interest=newsletter` | Yes |
| General realtor inquiry | NB on-site `/contact` → Supabase | No (intentional) |

## The Purple Wings

| Visitor action | Destination | JanaGana? |
|----------------|-------------|-----------|
| Classes / events | `/portal/purple-wings/events` | Yes |
| Membership join | `/portal/purple-wings/join` | Yes |
| Newsletter | `/portal/purple-wings/contact?interest=newsletter` | Yes |
| Membership interest | `/portal/purple-wings/contact?interest=membership-interest` | Yes |
| TPW weekly tips newsletter | TPW `/api/newsletter/subscribe` | No (intentional) |

## Embed API (TPW)

- `GET /api/embed/events?tenantSlug=purple-wings`
- Portal URLs for registration and leads

## Verification

- Use unique test emails per tenant.
- Confirm rows in **Contacts & leads** for the correct tenant only.

Full CTA audit tables lived in legacy `WEBSITE_JANAGANA_VISITOR_PATHS.md` (content preserved above).
