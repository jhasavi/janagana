# Product improvement backlog — quality review (July 2026)

Last gate run: `npm run gate:quick` ✓ · `npm run build` ✓ · `npm run test:dashboard:semantics` ✓

**Status:** 8 of 10 items shipped. Items **6** and **9** remain Phase 2 (explicitly deferred in demo script).

---

## Done

| # | Item | Notes |
|---|------|-------|
| 1 | Fix failing release gate (contact interest E2E) | `getByTestId("portal-flow-description")` |
| 2 | Communications admin UI | `/dashboard/communications` — queue/sent/failed + retry |
| 3 | Printable receipts + year-end giving summary | `/dashboard/payments/receipts/{id}`, `/api/export/giving-summary` |
| 4 | Failed payment / past-due on renewals desk | Dunning banner + `payment_failed` filter |
| 5 | Unified contact activity timeline | `ContactTimeline` on profile |
| 7 | Documentation drift | README + docs consolidated (see `docs/README.md`) |
| 8 | Portal `/join` tier comparison UX | Side-by-side plan cards |
| 10 | Demo script + Join It/Zeffy battlecard | `docs/14-PRODUCT-SHOWCASE.md`, `docs/18-JOIN-IT-ZEFFY-DEMO-PLAN.md` |

---

## Phase 2 (not blocking ship)

| # | Item | Notes |
|---|------|-------|
| 6 | Authenticated member self-service portal | No member sign-in on portal yet |
| 9 | Households / group membership | `/dashboard/families` still placeholder |

---

## Test gates

```bash
npm run gate:quick
npm run test:dashboard:semantics
npm run verify:pilot-demo -- --base-url=https://janagana.namasteneedham.com
npm run seed:joinit-demo -- --confirm-joinit-demo
```

## Doc index

See [docs/README.md](./docs/README.md).
