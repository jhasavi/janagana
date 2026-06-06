# The Purple Wings — full integration (success criteria)

**Sequence:** TPW first → Namaste Boston → ICON/Raklet review.

**Repos:** JanaGana `~/janagana` · TPW site `~/tpw`  
**Production:** https://janagana.namasteneedham.com · https://www.thepurplewings.org  
**Tenant slug:** `purple-wings`

---

## What “TPW done” means

All boxes below checked — no new platform scope required.

### A. JanaGana operator (admin)

| # | Check | Command / where |
|---|--------|-----------------|
| A1 | Tenant `purple-wings` active, correct Clerk org | Dashboard → Portal & setup |
| A2 | Class roster imported (`class1.csv`, 11 contacts) | `npm run import:tpw-class` then Contacts → filter **Class interest** / tag `class1` |
| A3 | At least one **Published** class/event | Dashboard → Events |
| A4 | Register link copies and works (incognito test) | Events → Copy register link |
| A5 | Portal submissions land in Contacts only for Purple Wings | Incognito portal contact form |
| A6 | Weekly operator routine works | [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md) weekly table |

### B. TPW website → JanaGana

| # | Check | Where on TPW |
|---|--------|--------------|
| B1 | Homepage JanaGana block → events, community newsletter, membership interest, **join** | `/` |
| B2 | Nav **Classes & Events** → `/portal/purple-wings/events` | Header |
| B3 | `/events` embed shows JanaGana events; Register → portal register URL | `/events` |
| B4 | Footer **Classes & events** → JanaGana events | Footer |
| B5 | Weekly tips form → **TPW Supabase only** (not broken CRM API) | `/newsletter/subscribe` |
| B6 | Referral links → JanaGana join (not dead `/join` on TPW) | `/campaigns/referral-program` |

### C. Automated gates

```bash
# JanaGana
npm run verify:tpw
npm run verify:tenants
npm run test:tenant:contract
npm run test:e2e:dual-portal

# After import
npm run import:tpw-class -- --dry-run   # preview
npm run import:tpw-class               # apply (production DB)
```

TPW Vercel env (production):

```
NEXT_PUBLIC_JANAGANA_PORTAL_BASE_URL=https://janagana.namasteneedham.com
NEXT_PUBLIC_JANAGANA_API_URL=https://janagana.namasteneedham.com
NEXT_PUBLIC_JANAGANA_TENANT_SLUG=purple-wings
```

---

## Class roster import

CSV default path: `~/tpw/class1.csv`

```bash
cd ~/janagana
npm run import:tpw-class -- --dry-run
npm run import:tpw-class -- --class=class1
```

Imported contacts get:

- `source`: `tpw_class_import`
- `interestType`: `CLASS_INTEREST`
- `tags`: `imported`, `tpw-class`, `class1`

Re-import is safe (upsert by email per tenant).

---

## Intentional split (do not merge)

| Audience | System | Path |
|----------|--------|------|
| Weekly financial tips | TPW Supabase | `/api/newsletter/subscribe` |
| Classes, events, community list | JanaGana portal | `/portal/purple-wings/...` |

---

## After TPW sign-off

1. Repeat for `namaste-boston` using `docs/03-NB-TPW-WEBSITES.md` + NB CRM import (`npm run import:nb-crm`).
2. Only then schedule ICON/Raklet replacement review.
