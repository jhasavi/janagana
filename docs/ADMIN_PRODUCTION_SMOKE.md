# Admin production smoke (manual)

Use **production** only: `https://janagana.namasteneedham.com`  
Sign in with your **Clerk production** admin account.

## Before you start

- **Contacts** = people from portal lead/registration forms or admin entry. **Formal memberships** staying at **0** is expected until enrollment exists.
- **TPW site newsletter** (`tpw-five.vercel.app/newsletter/subscribe` and exit popup) writes to **TPW Supabase**, **not** JanaGana. For Purple Wings leads in admin, use the **JanaGana portal** URL (below).
- QA Playwright submissions use emails like `qa-prod-*@example.com` on the **JanaGana** portal.
- **Pilot sign-off QA (latest):**  
  `qa-prod-vercel-pw-pilot-1779985765@example.com` (Purple Wings),  
  `qa-prod-vercel-nb-pilot-1779985765@example.com` (Namaste Boston).  
  Older repair run: `qa-prod-vercel-pw-postrepair-1779985239@example.com`, `qa-prod-vercel-nb-postrepair-1779985239@example.com`.
- **Full checklist:** `docs/PILOT_SIGNOFF.md`
- Dashboard **Public portal** link should show `/portal/purple-wings` and `/portal/namaste-boston` (not long Clerk slugs).

## Tenant map

| Org (Clerk) | Tenant slug | Public portal |
|-------------|-------------|---------------|
| The Purple Wings | `purple-wings` | `/portal/purple-wings` |
| Namaste Boston | `namaste-boston` | `/portal/namaste-boston` |

## Checklist

### 1. Sign in and land on dashboard

1. Open `https://janagana.namasteneedham.com/sign-in`
2. Complete Clerk login
3. Confirm redirect to `/dashboard` (not a stale preview URL)

### 2. Purple Wings — QA contacts / newsletter lead

1. Use org switcher (or **Select tenant**) → **The Purple Wings** / `purple-wings`
2. Sidebar → **Contacts** (not “Formal memberships”)
3. Dashboard card **Contacts** should be ≥ 1 if QA ran on production portal
4. Search or scan for `qa-prod` in email column
5. Open a row: type should be lead/other (newsletter interest), not a formal member

**If zero:** submit once on  
`https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter`  
(use a `qa-prod-…@example.com` email), then repeat step 2–4.

### 3. Namaste Boston — investment lead

1. Switch tenant → **Namaste Boston** / `namaste-boston`
2. **Contacts** → look for `qa-prod` or investment interest notes
3. Confirm **no** Purple Wings-only QA emails appear here

**If zero:** submit on  
`https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=investment-analysis`  
then re-check.

### 4. Tenant switching

1. While on Purple Wings, note contact count (or a distinctive QA email)
2. Switch to Namaste Boston — list should change
3. Switch back — Purple Wings QA rows return
4. Optional: **Events** and **Event registrations** differ per tenant

### 5. No cross-tenant leakage

1. On Namaste Boston **Contacts**, search `purple-wings` or PW-only QA emails → **none**
2. On Purple Wings **Contacts**, search Namaste-only QA emails → **none**
3. Create/view an event on one tenant; confirm it does not appear under the other tenant’s **Events**

### 6. Formal memberships = 0 (expected)

1. Dashboard → **Formal memberships** card = **0**
2. Do **not** treat this as “no members in CRM”; pilot uses **Contacts** + **Event registrations**

## Optional CLI (read-only QA list)

```bash
PRODUCTION_DATABASE_URL='postgresql://…' npx tsx scripts/list-production-contacts-qa.ts
```

Never commit the URL. Script prints host/database name only, not credentials.

## Optional QA cleanup (do not run without approval)

```bash
npx tsx scripts/cleanup-qa-contacts.ts   # dry run
# Only after explicit approval:
npx tsx scripts/cleanup-qa-contacts.ts --confirm --allow-production-qa-cleanup
```

## Pass criteria

- [ ] Both tenants reachable in admin after Clerk login
- [ ] QA or real portal leads visible under correct tenant **Contacts**
- [ ] Tenant switch changes data; no cross-tenant rows
- [ ] **Formal memberships** = 0 on both tenants
- [ ] You understand TPW on-site newsletter ≠ JanaGana contacts

## Related

- `docs/PRODUCTION_SMOKE_PLAN.md` — automated HTTP/Playwright public smoke
- `docs/PRODUCTION_RELEASE_STATUS.md` — deploy and env notes
