# Pre-Launch Checklist (JanaGana v3)

Use this before treating the product as “live” for Namaste Boston and The Purple Wings.

## CRM introduction — verdict

**Do not start full CRM yet** (deals, pipelines, activities, email automation).

| Prerequisite | Status |
|--------------|--------|
| Release gates green locally | Run `npm run gate:release` |
| Real Clerk onboarding proven (create org + map existing) | Manual / `npm run test:real-clerk` |
| Both tenants mapped in Clerk + DB | `npm run verify:tenants` |
| Contact lifecycle beyond create/list | Partial — update added; no merge/dedup |
| Membership enrollment UI | Not built (`Membership` model only) |
| CI runs more than lint/typecheck | Postgres job + script tests in GitHub Actions |
| Production smoke on both portals | `docs/PRODUCTION_SMOKE_PLAN.md` |

**Recommended order:** stabilize foundation → prove two-org onboarding → production smoke → **CRM-lite** (contact detail, notes, interest tags) → full CRM.

---

## Two organizations (`purple-wings`, `namaste-boston`)

| Layer | Purple Wings | Namaste Boston |
|-------|--------------|----------------|
| Public portal `/portal/{slug}` | Required | Required |
| Lead capture `/portal/{slug}/contact` | Required | Required |
| Interest alias `/portal/{slug}/interest/investment` | Required | Required |
| Clerk org exists | Owner onboarding | Onboarding or `npm run setup:namaste` |
| Tenant row (`slug`, `clerkOrgId`) | DB + Clerk aligned | Same |
| Admin dashboard (same user, both orgs) | Manual: add user to both Clerk orgs | Same |
| Website CTA links | `docs/WEBSITE_LINK_READINESS.md` | Same |

Run: `npm run verify:tenants` — fails fast if either slug is missing or misconfigured.

---

## Onboarding

| Step | Automated? | Command / URL |
|------|------------|----------------|
| Sign-up → create organization | Partial (real Clerk only) | `/onboarding/create-organization` |
| Map existing Clerk org | Partial | “Existing organization setup” on same page |
| Select organization (multi-tenant) | E2E redirect only | `/select-organization` |
| Zero tenants → onboarding redirect | Foundation e2e | `npm run test:e2e:foundation` |

**Not automated:** submitting create-org or setup-existing forms in CI (requires real Clerk credentials).

Manual validation: `docs/MANUAL_DEMO_SCRIPT.md` and `npm run test:real-clerk`.

---

## People captured (dashboard semantics)

| Label | Meaning |
|-------|---------|
| **Contacts** | Everyone from portal registration, lead forms, or manual admin entry |
| **Event registrations** | Confirmed (or total) sign-ups for events — see Events → Registrations |
| **Formal memberships** | `Membership` enrollments — **0 is expected** until enrollment/payment is built |
| **“Members” (old UI)** | Was misleading; dashboard now says **Contacts** |

Creating an event alone does **not** increase contact count until someone registers (published event) or submits a contact form.

Run: `npm run test:dashboard:semantics`

---

## Production smoke (2026-05-28)

Automated (no secrets):

- [x] `npm run smoke:production` — GET routes on `https://janagana.namasteneedham.com`
- [x] Playwright production lead forms (newsletter + investment)
- [x] TPW/NB deployed sites link to correct portal URLs

Manual (owner sign-in required):

- [ ] Dashboard shows **Contacts**, **Event registrations**, **Formal memberships** (not misleading “Members”)
- [ ] Test leads from production smoke visible under correct tenant **Contacts**
- [ ] Switch orgs — no cross-tenant contact leak

---

## Before first real use

- [ ] `npm run gate:release` passes on your machine
- [ ] `npm run verify:tenants` passes
- [ ] `npm run inventory:tenants` — Clerk orgs match DB tenants
- [ ] Both websites point to correct portal URLs (`docs/WEBSITE_LINK_READINESS.md`)
- [ ] Owner can sign in, switch orgs, create event, see registration
- [ ] Public registration does not create Clerk orgs (`npm run test:portal`)
- [ ] Production env: Clerk live keys, `DATABASE_URL`, webhooks configured
- [ ] Run production smoke: `docs/PRODUCTION_SMOKE_PLAN.md`

---

## Intentionally deferred (do not block launch)

- Stripe / payments
- Full CRM (deals, pipelines)
- Donations, volunteering, comms automation
- Public events JSON API embed (v3.1)

---

## Quick commands

```bash
npm run verify:tenants
npm run gate:quick
npm run gate:release
npm run inventory:tenants
npm run test:real-clerk   # optional, needs CLERK_E2E_USER_* in .env.local
```
