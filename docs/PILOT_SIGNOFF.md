# Pilot sign-off (owner checklist)

**Goal:** Confirm production is usable for The Purple Wings and Namaste Boston **before any new code**.

**App:** https://janagana.namasteneedham.com  
**Automated checks (agent):** Re-run before you start: `npm run smoke:production`

---

## Part A — Admin smoke (~15 min, requires your Clerk login)

Use the same steps as `docs/ADMIN_PRODUCTION_SMOKE.md`. Record pass/fail.

| # | Check | PW | NB |
|---|--------|----|----|
| A1 | Sign in → `/dashboard` loads | ☐ | ☐ |
| A2 | **Organizations** → select tenant; header shows correct org name | ☐ | ☐ |
| A3 | **Public portal ↗** link is `/portal/purple-wings` or `/portal/namaste-boston` (not long Clerk slug) | ☐ | ☐ |
| A4 | **Overview:** Contacts ≥ 1; **Formal memberships** = 0 | ☐ | ☐ |
| A5 | **Contacts:** find latest QA email (see below) | ☐ | ☐ |
| A6 | Other tenant’s QA emails **not** in this list | ☐ | ☐ |
| A7 | Sign out → sign in → same tenant still works | ☐ | ☐ |

**Latest automated QA emails** (search in Contacts):

- Purple Wings: `qa-prod-vercel-pw-pilot-1779985765@example.com`
- Namaste Boston: `qa-prod-vercel-nb-pilot-1779985765@example.com`

Also valid from earlier repair run:

- `qa-prod-vercel-pw-postrepair-1779985239@example.com`
- `qa-prod-vercel-nb-postrepair-1779985239@example.com`

**If Contacts is empty:** submit once on the JanaGana portal (not TPW newsletter):

- PW: https://janagana.namasteneedham.com/portal/purple-wings/contact?interest=newsletter
- NB: https://janagana.namasteneedham.com/portal/namaste-boston/contact?interest=investment-analysis

---

## Part B — One real loop per org (~15 min each)

### Incognito flow (yes — your interpretation is correct)

1. Stay signed into JanaGana **admin** in your normal browser (Chrome/Safari profile you already use).
2. In a **private/incognito** window, open only the **public portal** URLs (you are not testing admin there).
3. Complete registration with a **real test email you control** (e.g. `you+pilot-pw-20260528@gmail.com`).
4. Return to the **admin** browser, correct org selected, and verify below.

You do **not** need to sign out of admin first. Incognito is only so the public form behaves like a visitor (no admin session on the portal).

### How to get the exact register URL

In **admin** → **Events**, use the **Slug** column for a **PUBLISHED** event (Namaste already has some; pick one per org).

| Org | Events list (incognito) | Register form (incognito) |
|-----|-------------------------|---------------------------|
| Purple Wings | `https://janagana.namasteneedham.com/portal/purple-wings/events` | `https://janagana.namasteneedham.com/portal/purple-wings/register/{eventSlug}` |
| Namaste Boston | `https://janagana.namasteneedham.com/portal/namaste-boston/events` | `https://janagana.namasteneedham.com/portal/namaste-boston/register/{eventSlug}` |

Replace `{eventSlug}` with the slug from the admin table (e.g. if slug is `spring-meetup`, use `/register/spring-meetup`).

**Easiest path:** incognito → events list → **View details** on a published event → **Register** button → submit form.  
(Code: register lives at `app/portal/[tenantSlug]/register/[eventSlug]/page.tsx`.)

After submit you should see **“Registration successful.”** (or “already registered” if you repeat the same email).

### Where to verify in admin (both places)

| Check | Where | What you should see |
|-------|--------|---------------------|
| B4a | **Contacts** | New row with your test email; type **Event registrant** (not only a lead) |
| B4b | **Events** → **Registrations** link on that event’s row | Your name/email with **CONFIRMED** status |
| B4c (optional) | **Overview** | **Event registrations** count increased by 1 |

**Contacts alone is not enough** for a full Part B pass — confirm **Events → Registrations** for that specific event.

| # | Step | PW | NB |
|---|------|----|----|
| B1 | **Events** → at least one **PUBLISHED** event (create one if needed) | ☐ | ☐ |
| B2 | Incognito: open events list or `/register/{eventSlug}` for that event | ☐ | ☐ |
| B3 | Submit registration with unique test email | ☐ | ☐ |
| B4 | Admin: **Contacts** + **Events → Registrations** for that event | ☐ | ☐ |

---

## Part C — Sign-off

When all boxes in A and B are checked for **both** orgs:

1. Check the manual items in `docs/PRE_LAUNCH_CHECKLIST.md` (Production smoke → Manual section).
2. Add one line to `docs/PRODUCTION_RELEASE_STATUS.md`:  
   `Pilot sign-off: <date> by <name> — admin + dual-tenant validated.`

**Pilot-ready means:** you can run events + public registration + lead capture for both orgs without engineering changes.

---

## If something fails

| Symptom | Likely cause | Do not |
|---------|----------------|--------|
| 0 contacts after portal submit | Wrong site (TPW newsletter) or wrong tenant selected | Add CRM |
| Long slug in dashboard link | Slug repair not applied or stale deploy | Create new Clerk org |
| Same contacts on both tenants | Cross-tenant bug — note emails | Delete production data |
| Redirect to wrong URL after sign-in | `NEXT_PUBLIC_APP_URL` / Clerk redirect URLs | Broad refactor |

Report: which step (A1–B4), which org, screenshot of dashboard header + Contacts row count.

---

## Deferred (not part of this milestone)

- CRM, Stripe, membership enrollment UI, email automation
- TPW/NB website changes
- QA contact cleanup (`scripts/cleanup-qa-contacts.ts`) unless you explicitly approve
