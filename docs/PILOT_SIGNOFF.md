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

| # | Step | PW | NB |
|---|------|----|----|
| B1 | **Events** → create or open a **Published** event | ☐ | ☐ |
| B2 | Open public register URL (from event or portal events list) in incognito | ☐ | ☐ |
| B3 | Register with a real test email you control | ☐ | ☐ |
| B4 | **Contacts** shows new person; **Events → Registrations** shows row | ☐ | ☐ |

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
