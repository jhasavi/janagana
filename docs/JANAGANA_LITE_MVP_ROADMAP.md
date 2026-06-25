# JanaGana Lite — MVP Roadmap

**Status:** June 2026  
**Principle:** Workflows over feature count. Ship slices a volunteer admin can use weekly.

---

## Phase 0 — Foundation (done)

Pilot infrastructure that must not break:

- [x] Multi-tenant auth (Clerk org ↔ Tenant)
- [x] Active tenant cookie + resolver contract
- [x] Public portal (slug-only resolution)
- [x] Contacts + spreadsheet import
- [x] Events + registrations + ticket types
- [x] Membership tiers + admin enrollment
- [x] Payment ledger + receipts + Stripe webhooks
- [x] Communication outbox (schema + queue helpers)
- [x] NB / TPW tenant mappings and website integration
- [x] Release gates, e2e smoke, dashboard semantics tests

---

## Phase 1 — Community OS shell (current slice)

**Goal:** App feels like JanaGana Lite even when modules are placeholders.

- [x] Product plan docs
- [x] Grouped admin navigation (People / Programs / Operations)
- [x] Community OS dashboard with six headline metrics
- [x] Placeholder pages with clear empty states (Families, Donations, Sponsors, Volunteers, Communications)
- [x] Payments list (read-only from existing ledger)
- [x] Community-specific language ("Contacts," "Families," "Members")

**Preserves:** All existing routes (`/dashboard/members`, `/dashboard/tiers`, etc.)

---

## Phase 2 — Membership operations

**Goal:** Replace Raklet dues workflow for ICON-style orgs.

### Slice A — Membership renewals desk ✅ (June 2026)

**Implemented:**

- `/dashboard/memberships/renewals` — renewals desk with summary cards, filters, and table
- Expiration buckets: active, 30/60/90-day windows, expired, recently paid, needs reminder, no email
- Queue `RENEWAL_REMINDER` to communications outbox (no auto-send; delivery requires Resend)
- 7-day duplicate reminder cooldown per membership
- Dashboard cards: “Expiring this month”, “Expired members”, links to renewals desk
- Nav item: Renewals under Programs; CTA from `/dashboard/tiers`
- Test: `npm run test:membership-renewals`

**Expiration assumption:** Uses `Membership.expiresAt` when set at enrollment. `ONE_TIME` tiers may have `null` expiresAt → shown as “No expiration date” (not counted in expiring windows).

**Remains for Phase 2:**

| Task | Status |
|------|--------|
| Public membership checkout polish | Open |
| Communications outbox admin UI (view queued reminders) | Open |
| Member directory filter (active vs lapsed) on contacts | Open |
| CSV export of members | Open |
| Bulk renewal reminder actions | Open |

**Schema:** No migration — uses existing `Membership`, `MembershipTier`, `PaymentRecord`, `CommunicationMessage`.

---

## Phase 3 — Donations + receipts

**Goal:** Accept and track donations without building Zeffy clone.

| Task | Value |
|------|-------|
| Public donation page on portal | High |
| Admin donation recording (offline + Stripe) | High |
| Donor receipt + outbox delivery | Medium |
| Donation list on dashboard (replace placeholder) | Medium |
| Optional donor-covered processing fee (Zeffy-style) | Low (deferred) |

**Schema:** `PaymentPurpose.DONATION` already exists.

---

## Phase 4 — Families + volunteers

**Goal:** Household-centric ops for community orgs.

| Task | Value |
|------|-------|
| `Household` model + link contacts | High |
| Family view on dashboard | High |
| Volunteer roster from `ContactType.VOLUNTEER` | Medium |
| Event volunteer slots / sign-up | Medium |
| Open volunteer needs on dashboard | Medium |

---

## Phase 5 — Sponsors + communications UI

| Task | Value |
|------|-------|
| Sponsor entity + pledge tracking | Medium |
| Communications outbox admin UI | Medium |
| Event reminder scheduling | Medium |
| Basic follow-up notes on contacts | Low (notes exist) |

---

## Recommended next 3 build slices

### Slice B — Donations portal page (1–2 weeks) ← **recommended next**

1. `/portal/{slug}/donate` with amount + Stripe
2. Admin donations page (replace placeholder)
3. Receipt + outbox on completion

**Why second:** Ledger ready; high visibility for nonprofits.

### Slice C — Households MVP (2 weeks)

1. `Household` + `householdId` on Contact
2. Families admin page (replace placeholder)
3. Dashboard: families count, members per household

**Why third:** Unlocks "which families have children/volunteers" without AI.

---

## Validation commands

Run before merging each slice:

```bash
npm run lint
npm run typecheck
npm run prisma:validate
npm run test:membership-renewals
npm run test:dashboard:semantics
npm run gate:quick   # when DB available
```

---

## Tenant safety rules

1. Never delete production data in migrations
2. No destructive migrations without explicit confirmation
3. All admin queries scoped by `tenantId`
4. Preserve NB, TPW, ICON slug mappings
5. Public flows never create Clerk organizations

---

## Related

- [JANAGANA_LITE_PRODUCT_PLAN.md](./JANAGANA_LITE_PRODUCT_PLAN.md)
- [01-PILOT-RUNBOOK.md](./01-PILOT-RUNBOOK.md)
- [PARKING-LOT.md](./PARKING-LOT.md)
