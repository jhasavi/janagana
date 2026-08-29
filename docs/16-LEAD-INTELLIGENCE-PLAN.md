# Lead intelligence (scoring, segmentation, UTM/lifecycle fields)

**Status:** proposed, not started. Written after comparing JanaGana's Contact/lead model against `~/tpw`'s `crm-fields.ts` / `lead-scoring.ts` / `crm-segmentation.ts` / `crm-workflows.ts` (2026-08-28 review).

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

## 2. Attribution capture

Extend `PublicLeadCaptureSchema` and the public registration/join/donate schemas in `lib/actions/public-portal.ts` (and equivalents in `lib/actions/public-donations.ts` if separate) with optional `utmSource` / `utmMedium` / `utmCampaign` / `referrerUrl`. These come from the client (portal pages read `?utm_source=...` from `useSearchParams()` and `document.referrer`, pass them through the existing form POST). Store on both `create` and `update` in `capturePublicLead` — first-touch attribution: only set on `create`, never overwritten on `update`, matching standard marketing-attribution practice (first source that brought them in, not the last).

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
  activityCount: number;       // count of AuditLog rows for this contact
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
| `activityCount` (AuditLog rows) | +5 per event, capped at +20 |
| `source` known/trusted (`portal_contact`, `tpw_class_import`, etc.) vs unknown | +5 / 0 |
| Recency: `lastActivityAt` within 7 days | +10; within 30 days +5; over 90 days stale, −10 |

Exact weights are a starting point — tune after looking at real distribution once it's wired up. Keep the table in this doc in sync if weights change.

## 4. Where scoring runs

Call `recomputeLeadScore(contactId)` (new function in `lib/leads/scoring-actions.ts`, wraps `computeLeadScore` + a `prisma.contact.update`) after any action that changes a contact's engagement signal:

- `capturePublicLead` (lib/actions/public-portal.ts)
- `registerForEvent` / public event registration success path
- Donation success webhook (`lib/actions/public-donations.ts` or its webhook handler)
- Membership enrollment/renewal success
- Manual admin edits to a contact (so re-tagging shows up immediately)

Keep this call **fire-and-forget within the same transaction** where the action already writes `lastActivityAt` — no new cron needed for the common case. Only add a nightly recompute job if the recency-decay factor (the −10 for staleness) needs to apply to contacts with no new activity; that's a small addition to the existing renewal-reminder cron pattern in `app/api/cron/`.

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
