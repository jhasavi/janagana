# Lead intelligence (scoring, segmentation, UTM/lifecycle fields)

**Status:** implemented (2026-09-06). Schema, scoring engine, segmentation, UTM/referrer first-touch capture (all 4 public forms: contact, register, join, donate), nightly stale-lead reconciliation cron, and dashboard/CSV surfacing are all live. Written after comparing JanaGana's Contact/lead model against `~/tpw`'s `crm-fields.ts` / `lead-scoring.ts` / `crm-segmentation.ts` / `crm-workflows.ts` (2026-08-28 review).

**Scope guard:** this plan covers scoring, segmentation, and attribution fields only. Full workflow automation (trigger → send_email / create_task / create_deal) stays out of scope — it's already an explicit post-pilot deferral in [07-ARCHITECTURE.md](./07-ARCHITECTURE.md#L24). Don't expand into that without a separate sign-off.

## Why

TPW's local CRM-adjacent code (never activated server-to-server against JanaGana — see [11-TPW-INTEGRATION.md](./11-TPW-INTEGRATION.md#L86)) models three things JanaGana's `Contact` doesn't have today:

1. **Attribution** — UTM source/medium/campaign, referrer, lifecycle stage.
2. **Lead scoring** — a numeric score + grade (A–F) + category (Hot/Warm/Cool/Cold).
3. **Segmentation** — declarative rules that react to score/activity by tagging or advancing lifecycle stage.

JanaGana today only has `source` (freeform string), `interestType` (fixed enum), and `tags` (freeform array) on `Contact` — no scoring, no structured attribution, no rule engine.

## 1. Schema changes (`prisma/schema.prisma`)

Add to `Contact`:

```prisma
model Contact {
  // ...existing fields...
  utmSource        String?
  utmMedium        String?
  utmCampaign      String?
  referrerUrl      String?
  lifecycleStage   LifecycleStage @default(NEW)
  leadScore        Int            @default(0)
  leadScoreUpdatedAt DateTime?

  @@index([tenantId, lifecycleStage])
  @@index([tenantId, leadScore])
}

enum LifecycleStage {
  NEW
  ENGAGED
  QUALIFIED
  CONVERTED
  LOST
}
```

Grade (A–F) and category (Hot/Warm/Cool/Cold) are **derived from `leadScore`**, not stored — same approach as TPW's `lead-scoring.ts`, avoids a second source of truth going stale. Put the score→grade/category mapping in `lib/leads/scoring.ts` (see below) so it's one function everywhere (list view, detail view, exports).

Migration: `npx prisma migrate dev --name add_lead_intelligence_fields`. Backfill is a no-op (`leadScore` defaults to 0, `lifecycleStage` to `NEW`) — existing contacts don't need historical scores computed retroactively; scores accrue from new activity going forward. Optional one-time backfill script if you want a baseline (`scripts/backfill-lead-scores.ts`) — see step 5.

## 2. Attribution capture — implemented

`PublicLeadCaptureSchema`, `PublicRegistrationSchema`, and the membership/donation checkout schemas (`lib/actions/public-portal.ts`, `public-memberships.ts`, `public-donations.ts`) all accept optional `utmSource` / `utmMedium` / `utmCampaign` / `referrerUrl`.

Capture is entirely server-side, no client JS needed — `?utm_source=` etc. arrive in each portal page's own `searchParams` (Next.js Server Component prop), read once via `readUtmParams()` (`lib/portal/utm.ts`) and threaded through as hidden `<input>` fields into the existing form POST/server-action, mirroring the pre-existing `returnTo` hidden-field pattern. The referrer comes from the HTTP `Referer` header (`readRefererHeader()`, best-effort, mirrors the existing `headers()` usage in `registerPublicEvent`) rather than `document.referrer`.

Wired into all 4 public entry points: contact/lead capture, event registration, membership join, and donation checkout (`app/portal/[tenantSlug]/{contact,register/[eventSlug],join,donate}/page.tsx` + `app/api/public/donate/route.ts`).

First-touch only: set on `create`, never overwritten on `update` — verified by a manual check where a second capture with different UTM values left the contact's original attribution untouched.

## 3. Scoring engine — `lib/leads/scoring.ts` (new file)

Pure functions, no DB writes, so they're independently testable:

```ts
export type LeadGrade = "A" | "B" | "C" | "D" | "F";
export type LeadCategory = "Hot" | "Warm" | "Cool" | "Cold";

export function gradeForScore(score: number): LeadGrade { ... }   // e.g. 80+=A, 60+=B, 40+=C, 20+=D, else F
export function categoryForScore(score: number): LeadCategory { ... } // 70+=Hot, 45+=Warm, 20+=Cool, else Cold

export interface ScoringInputs {
  interestType: string | null;
  source: string | null;
  utmSource: string | null;
  activityCount: number;       // count of EventRegistration + CommunicationMessage rows for this contact
  lastActivityAt: Date | null;
  hasMembership: boolean;
  hasDonation: boolean;
}

export function computeLeadScore(inputs: ScoringInputs): number { ... }
```

Rubric (mirrors TPW's four factor groups — engagement, behavior, source, recency — tuned down to what JanaGana can actually observe):

| Factor | Points |
|---|---|
| `interestType = MEMBERSHIP_INTEREST` | +25 |
| `interestType = CLASS_INTEREST` or `INVESTMENT_ANALYSIS` | +15 |
| `interestType = NEWSLETTER` | +5 |
| Has an existing `Membership` row | +30 |
| Has at least one `Donation`/payment | +25 |
| `activityCount` (event registrations + communications) | +5 per event, capped at +20 |
| `source` known/trusted (`portal_contact`, `tpw_class_import`, etc.) vs unknown | +5 / 0 |
| Recency: `lastActivityAt` within 7 days | +10; within 30 days +5; over 90 days stale, −10 |

Exact weights are a starting point — tune after looking at real distribution once it's wired up. Keep the table in this doc in sync if weights change.

## 4. Where scoring runs — implemented

`recomputeLeadScore(contactId)` (`lib/leads/scoring-actions.ts`, row-locked via `SELECT ... FOR UPDATE` inside a transaction so concurrent triggers on the same contact can't race) is called from:

- `capturePublicLead` (lib/actions/public-portal.ts)
- `registerPublicEvent` (lib/actions/public-portal.ts)
- Free-tier membership signup (`lib/actions/public-memberships.ts`)
- Donation, membership, and event Stripe webhook finalize functions (`lib/payments/stripe-webhooks.ts`) — parallelized with receipt issuance via `Promise.all` so it doesn't add to the webhook's sequential critical path
- Manual admin contact create/update (`lib/actions/contacts.ts`)

Plus a nightly cron (`app/api/cron/recompute-stale-leads`, `lib/jobs/recompute-stale-leads.ts`) that re-evaluates contacts gone quiet for 90+ days — needed because every call site above sets `lastActivityAt` to "now" right before scoring runs, so the recency-decay/`LOST` transition can never fire from those call sites alone.

## 5. Segmentation — `lib/leads/segmentation.ts` (new file)

Small, hardcoded rule set for v1 (not a tenant-configurable rule builder — that's real scope creep beyond what TPW itself ships as a generic engine; TPW's `crm-segmentation.ts` rules are also effectively hardcoded per-org, not admin-editable UI). Rules run inside `recomputeLeadScore` right after the score is written:

```ts
export function applySegmentationRules(contact: ContactWithScore): { tags: string[]; lifecycleStage: LifecycleStage } {
  // e.g.:
  // score >= 70 && lifecycleStage === NEW  -> lifecycleStage = ENGAGED, add tag "hot-lead"
  // hasMembership || hasDonation           -> lifecycleStage = CONVERTED
  // score === 0 && lastActivityAt older than 90d -> lifecycleStage = LOST, add tag "cold-lead"
}
```

Merge resulting tags into the existing `tags` array (dedupe, same pattern already used in `import-icon-members.ts`'s `mergedTags`). Write `lifecycleStage` only forward (never regress `CONVERTED` back to `ENGAGED`, for example) — encode that ordering explicitly in the function rather than relying on caller discipline.

## 6. UI changes

- **Contacts list** (`app/dashboard/contacts`): add a Score/Grade column (small colored badge, reuse existing badge component) and a Lifecycle Stage filter dropdown alongside the existing type/tag filters.
- **Contact detail page**: show score, grade, category, lifecycle stage, and the UTM/referrer fields (if present) in the existing metadata panel — no new page, just new fields on the existing layout.
- **CSV export**: add `leadScore`, `leadGrade`, `lifecycleStage`, `utmSource`, `utmMedium`, `utmCampaign` columns to the existing contact export (`lib/actions/contacts.ts` or wherever export column list lives).

## 7. Sequencing / effort estimate

| Step | Effort |
|---|---|
| 1. Schema migration | 0.5 day |
| 2. Attribution capture (UTM plumbing through public forms) | 1 day |
| 3. `lib/leads/scoring.ts` + unit tests | 1 day |
| 4. Wire `recomputeLeadScore` into the 4–5 call sites | 1 day |
| 5. `lib/leads/segmentation.ts` + tests | 0.5 day |
| 6. UI (list column, filter, detail fields, export columns) | 1 day |
| 7. `npm run verify:*` gate coverage + manual QA pass | 0.5 day |

Total: **~5.5 days**, no external dependencies (no new services, no Stripe/webhook changes). Safe to build entirely behind the existing tenant-scoped write guard (`requireActiveTenantForWriteActions`) with no schema risk to already-live tenants (all new fields are optional/defaulted).

## Explicitly deferred (do not build in this pass)

- Tenant-configurable segmentation rule builder UI.
- Workflow automation actions (send_email / create_task / create_deal / notify_team) — stays in [07-ARCHITECTURE.md](./07-ARCHITECTURE.md#L24)'s deferred list.
- Ambassador/referral-program tracking (separate, smaller gap — worth its own short plan if prioritized).
