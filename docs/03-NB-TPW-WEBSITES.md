# NB & TPW website integration

**Production JanaGana:** https://janagana.namasteneedham.com  
**Canonical slugs:** `namaste-boston`, `purple-wings` (see `lib/pilot/tenants.ts`)  
**TPW full integration checklist:** [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md)

_Corrected 2026-11-19 to match the websites' actual code._

## Namaste Boston — NOT integrated

Namaste Boston Homes runs its own CRM (Mission Control on Supabase) plus Brevo for
email. Its website has **no links to JanaGana** (removed from the homepage and
`/contact`; `src/lib/janagana-portal.ts` and `janagana-client.ts` were deleted).
All NB leads go through NB `captureLead`.

The `namaste-boston` tenant here is a demo tenant only. Do not point NB visitors,
forms or CRM sync at it unless NB launches a paid-membership or paid-event line,
and decide that explicitly first.

## The Purple Wings — the real tenant

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

- Use unique test emails.
- Confirm rows in **Contacts & leads** for the Purple Wings tenant only.
