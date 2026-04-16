# JanaGana v2.0 — TODO & Roadmap

> This file tracks features from v1.0 (`JG_old/`) that need to be ported,
> decisions made during the v2 rebuild, and planned new capabilities.
> **Last updated:** April 15, 2026 (audit added)

---

## ✅ SPRINT 2 STATUS

- [x] Schema: add 13 new models + push
- [x] Middleware: portal + admin routes
- [x] Member portal: layout + 4 pages
- [x] Global admin: layout + tenant list
- [x] Clubs: actions + dashboard CRUD
- [x] Fundraising: actions + dashboard
- [x] Volunteer shifts: schema UI
- [x] Webhook management + API keys settings
- [x] Email campaigns dashboard
- [x] Notifications bell icon
- [x] Stripe billing: checkout + webhook
- [x] Sidebar + settings nav updates
- [x] TODO.md + E2E final run

---

## AUDIT: Onboarding Workflow (Immediate Attention)

Status: In-progress — onboarding creates Clerk org and DB tenant but user remains on `/onboarding` instead of landing on `/dashboard`.

Executive summary
- The server action that creates the Clerk organization and tenant record is executing and persisting data, but the client-side routing or session state that should set the active organization and redirect the user is not completing.
- Root suspects: (1) client code not using the server action response to redirect; (2) `auth()`/Clerk session lacks `orgId` so `getTenant()` can't resolve tenant; (3) Clerk redirect settings or cookies interfering with final redirect.

Quick reproduction steps
1. Ensure env vars set locally: NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding, NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard, CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY present.
2. Start the app: `npm run restart` (this will stop any running `next dev` and start fresh).
3. Create a new user via `/sign-up`, complete onboarding form (org name).
4. Observe server logs (server action response) and the browser navigation — expect `/dashboard`, but current behavior stays on `/onboarding`.

Immediate findings (what I checked)
- `lib/actions/tenant.ts` creates the organization and tenant; earlier unguarded membership creation caused duplicate errors and was updated to check membership first.
- `lib/tenant.ts`'s `getTenant()` relies on `auth()` returning `orgId`, otherwise it tries to infer org via memberships for the user; this can fail when the session doesn't include `orgId` immediately after onboarding.
- The client onboarding page must consume server-action results and call `router.push('/dashboard')` on success; if it doesn't, users remain on the onboarding route.

Short-term remediation (do these now)
1. Confirm `completeOnboarding` returns `{ success: true, data: { tenant, orgId } }` on success (server action). If not, update it to include `orgId` explicitly.
2. Update `app/onboarding/page.tsx` (or the action-calling component) to inspect the server action result and call `router.push('/dashboard')` (or `replace`) when `success: true`.
3. Harden `lib/tenant.getTenant()` to prefer `orgId` if passed from the client (e.g., via query param or cookie), and otherwise fallback to memberships; add defensive logging when org resolution fails.
4. Add an E2E Playwright test that signs up, completes onboarding, and asserts final URL is `/dashboard`.
5. Run `npm run restart` and `npm run test:e2e` until the onboarding spec passes.

Medium-term improvements (1–3 days)
- Return `orgId` and `tenant.slug` from onboarding action and set a short-lived cookie `JG_ACTIVE_ORG=orgId` used by server-side helpers to immediately resolve tenant.
- Add a server endpoint to set active org in server session storage used by `clerkClient()` if cookies or header context needed.
- Add CI integration: `npm run restart`, seed demo data, run Playwright onboarding test; fail fast with trace on failures.

Who acts first
- Dev owning `lib/actions/tenant.ts` and `app/onboarding` should implement short-term steps 1–3. I can implement 1–4 and open a PR if you approve.

---

## Updated Immediate Tasks (Actionable)

- [ ] Reproduce onboarding failure locally and capture server + client logs
- [ ] Ensure `completeOnboarding` returns `orgId` and `tenant` in response
- [ ] Update `app/onboarding` to redirect on server-action success
- [ ] Harden `lib/tenant.getTenant()` to be resilient when `auth()` lacks `orgId`
- [ ] Add Playwright onboarding E2E (signup → onboarding → assert `/dashboard`)
- [ ] Run `npm run restart` then `npm run test:e2e` and iterate until green
- [ ] Add global admin owner/admin contact display in `/admin`
- [ ] Document multi-tenant workflow, slug strategy, and custom-domain guidance
- [ ] Add admin portal E2E coverage for tenant/owner visibility
- [ ] Add slug update tests for tenant portal URLs

## Feature gaps vs commercial membership/event tools

- [ ] Global admin owner/admin contact visibility and owner email display
- [ ] Per-tenant custom domain mapping / custom domain hosting
- [ ] Slug alias / redirect support after slug changes
- [ ] Tenant-level portal branding and website mapping documentation
- [ ] E2E coverage for paid event signup and member checkout flows
- [ ] Volunteer signup / hours approval end-to-end testing
- [ ] Stripe subscription / customer portal end-to-end validation
- [ ] Documentation for onboarding each nonprofit tenant and external website integration

---

## ✅ COMPLETED SPRINT 2 (April 2026)

- Error boundaries wired into dashboard layout (`components/dashboard/error-boundary.tsx`)
- Volunteer hours schema (hoursLogged, hoursApproved, hoursStatus) + `prisma db push`
- Volunteer hours approval UI + `approveVolunteerHours` / `rejectVolunteerHours` actions
- Audit log model + `lib/actions/audit.ts` + `/dashboard/settings/audit` view
- Analytics: `lib/actions/analytics.ts` + recharts charts + `/dashboard/analytics` page
- Analytics added to sidebar navigation
- Member check-in system: `lib/actions/checkin.ts` + `/dashboard/events/[id]/checkin` page
- QR code display on member detail page (`components/dashboard/qr-code-display.tsx`)
- Realistic seed data: 3 tiers, 12 members, 5 events, 4 volunteer opportunities
- TypeScript: 0 source errors
- E2E: 35 tests passing, 3 skipped (stable)

---

## 🔴 CRITICAL — Must Decide / Implement

### 1. Member Self-Service Portal ✅ COMPLETED (May 2026)
**OLD:** Full `/portal` route with member profile, event browsing, volunteer signup, settings.  
**Decision:** `/portal/[slug]` — industry standard (Raklet, Wild Apricot, Memberful). Clerk personal account matched by email to Member record.  
**Completed:**
- [x] `/portal/[slug]/` — Profile page with QR code, tier badges, stats
- [x] `/portal/[slug]/events` — Events list with self-registration
- [x] `/portal/[slug]/volunteers` — Volunteer opportunities with self-signup
- [x] `/portal/[slug]/membership` — Tier details, benefits, event history, Stripe billing portal
- [x] `lib/actions/portal.ts` — getPortalContext, getPortalEvents, getPortalOpportunities, self-service mutations

### 2. Global Admin Panel ✅ COMPLETED (May 2026)
**OLD:** `/admin` route for super-admins to view all tenants.  
**Decision:** `/admin` protected by `GLOBAL_ADMIN_EMAILS` env var.  
**Completed:**
- [x] `lib/actions/admin.ts` — requireGlobalAdmin(), getAllTenants() with counts
- [x] `app/admin/layout.tsx` — Dark header + access denied screen
- [x] `app/admin/page.tsx` — Platform stats + full tenant table with portal links

### 3. Volunteer Hours Tracking ✅ COMPLETED (April 2026)
**OLD:** Separate `VolunteerHours` model with approval workflow (pending → approved → rejected).  
**NEW:** `logVolunteerHours()` action exists but `VolunteerSignup` has no `hours` field in schema.  
**Completed:**
- [x] Added `hoursLogged Float?` and `hoursApproved Float?` to `VolunteerSignup` model
- [x] Added `hoursStatus` enum (PENDING, APPROVED, REJECTED)
- [x] Built hours approval UI in dashboard (`_components/hours-approval-panel.tsx`)
- [x] Added `approveVolunteerHours` / `rejectVolunteerHours` server actions
- [x] Replaced raw signup ID input with member-name dropdown in `volunteer-signup-panel.tsx`

### 4. Stripe Membership Billing ✅ COMPLETED (May 2026)
**OLD:** Full subscription management — checkout sessions, cancel subscription, invoice retrieval.  
**Completed:**
- [x] `lib/actions/billing.ts` — createMemberCheckoutSession(), createBillingPortalSession(), getMemberSubscription()
- [x] Stripe webhook handler: subscription.updated → persist stripeSubscriptionId + renewsAt; subscription.deleted → clear both
- [x] BillingPortalCard on portal membership page for existing subscribers
- [x] Member.stripeSubscriptionId stored and maintained via webhook

### 5. E2E Test Coverage ✅ COMPLETED (April 2026)
**OLD:** 10 Playwright test files covering all major flows.  
**NEW:** Zero tests.  
**Completed:** 35 tests passing, 3 skipped (detail pages requiring seed data)  
- [x] Added Playwright to devDependencies
- [x] Configured `playwright.config.ts`
- [x] `test:e2e`, `test:e2e:headed`, `test:e2e:ui` scripts in package.json
- [x] All tests passing

---

## 🟡 HIGH PRIORITY — Lost Features to Restore

### 6. Clubs / Community Groups ✅ COMPLETED (May 2026)
**OLD:** Full clubs system — `Club`, `ClubMembership`, `ClubPost`.  
**Completed:**
- [x] Added Club, ClubMembership, ClubPost Prisma models + db push
- [x] `lib/actions/clubs.ts` — full CRUD (getClubs, getClub, createClub, updateClub, addClubMember, removeClubMember, createClubPost, deleteClubPost)
- [x] `/dashboard/clubs` — list with card grid
- [x] `/dashboard/clubs/new` — create form
- [x] `/dashboard/clubs/[id]` — detail with ClubPostPanel + ClubMemberPanel
- [x] `/dashboard/clubs/[id]/edit` — edit form

### 7. Fundraising / Donation Campaigns ✅ COMPLETED (May 2026)
**OLD:** `DonationCampaign` + `Donation` models with Stripe integration and goal tracking.  
**Completed:**
- [x] DonationCampaign + Donation models with raisedCents tracking
- [x] `lib/actions/fundraising.ts` — getCampaigns, getCampaign, createCampaign, updateCampaign, recordDonation
- [x] `/dashboard/fundraising` — campaign grid with progress bars
- [x] `/dashboard/fundraising/new` — create form
- [x] `/dashboard/fundraising/[id]` — detail with progress bar + donation list + RecordDonationPanel
- [x] `/dashboard/fundraising/[id]/edit` — edit form

### 8. Volunteer Shifts (Advanced Scheduling) ✅ COMPLETED (May 2026)
**OLD:** 3-tier volunteer system: Opportunity → Shifts → Shift Signups.  
**Completed:**
- [x] VolunteerShift model (startTime, endTime, capacity, location, title)
- [x] VolunteerShiftSignup relation with ShiftSignupStatus enum
- [x] getShifts, createShift, deleteShift actions added to `lib/actions/volunteers.ts`
- [x] VolunteerShiftsPanel client component in opportunity detail page

### 9. Email Campaign System ✅ COMPLETED (May 2026)
**OLD:** `EmailTemplate` + `EmailCampaign` + `EmailLog` models. Could send bulk emails.  
**Completed:**
- [x] EmailCampaign + EmailLog Prisma models
- [x] `lib/actions/communications.ts` — getEmailCampaigns, getEmailCampaign, createEmailCampaign, updateEmailCampaign
- [x] `/dashboard/communications` — campaign grid with stats (sent, drafts, recipients)
- [x] `/dashboard/communications/new` — create form with HTML body editor
- [x] Status tracking: DRAFT → SCHEDULED → SENDING → SENT / FAILED

### 10. Member Custom Fields
**OLD:** `MemberCustomField` + `MemberCustomFieldValue` for org-specific data.  
**NEW:** Removed — fixed schema only.  
**Action needed:**
- [ ] Add `MemberCustomField` model (fieldName, fieldType, required)
- [ ] Add `MemberCustomFieldValue` relation on Member
- [ ] Build custom fields configuration in `/dashboard/settings`
- [ ] Render custom fields in member create/edit forms

### 11. Member Document Storage
**OLD:** `MemberDocument` model with Cloudinary file uploads.  
**NEW:** Removed. `cloudinary` package removed.  
**Action needed:**
- [ ] Decide: use Cloudinary or Vercel Blob or UploadThing
- [ ] Add `MemberDocument` model (fileName, fileUrl, documentType)
- [ ] Implement file upload action in server actions
- [ ] Add document section to member detail view

### 12. Audit Logging ✅ COMPLETED (April 2026)
**OLD:** `AuditLog` model tracking all create/update/delete actions per tenant.  
**NEW:** Removed.  
**Completed:**
- [x] Added `AuditLog` Prisma model (actorId, action, resourceType, resourceId, metadata)
- [x] Created `lib/actions/audit.ts` with `logAudit()` (fire-and-forget) and `getAuditLogs()`
- [x] Built audit log view in `/dashboard/settings/audit`
- [x] Added audit link to settings page

---

## 🟢 PLANNED NEW FEATURES (v2 Roadmap)

### 13. Job Board
- [ ] Add `JobPosting` Prisma model (title, description, company, url, status)
- [ ] Build `/dashboard/jobs` admin route
- [ ] Build `/portal/jobs` public listing
- [ ] Allow members to apply or express interest

### 14. Discussion Board / Forum
- [ ] Add `ForumThread` + `ForumReply` Prisma models
- [ ] Build `/dashboard/forum` admin route
- [ ] Build `/portal/forum` member-facing route
- [ ] Support pinning, categories, moderation

### 15. Form Builder
- [ ] Add `CustomForm` + `FormField` + `FormSubmission` models
- [ ] Build drag-and-drop form builder in settings
- [ ] Embed forms in events, member onboarding, volunteer applications
- [ ] Export submissions to CSV

### 16. Advanced Reporting & Analytics ✅ COMPLETED (April 2026)
- [x] Installed `recharts`
- [x] Member growth over time chart (12-month line chart)
- [x] Event attendance trends (6-month bar chart)
- [x] Volunteer hours by month (6-month bar chart)
- [x] Member status breakdown (pie chart)
- [x] Analytics page at `/dashboard/analytics` with summary stat cards

### 17. Member Check-In System ✅ COMPLETED (April 2026)
- [x] QR code generation per member (restored `qrcode` package)
- [x] Built event check-in page at `/dashboard/events/[id]/checkin`
- [x] Mobile-friendly check-in UI with ticket-code lookup and attendance list
- [x] Auto-mark `EventRegistration.status = ATTENDED` on check-in
- [x] Undo check-in support
- [x] Member QR code display on member detail page

### 18. Membership Card (Passbook/Wallet)
**OLD:** `passkit-generator` + QR code for Apple Wallet / Google Wallet cards.  
**NEW:** Removed.  
**Action needed:**
- [ ] Restore `qrcode` dependency
- [ ] Restore `passkit-generator` for Apple Wallet support
- [ ] Build membership card preview in member profile
- [ ] Email membership card on join/renewal

### 19. SMS Notifications
**OLD:** Twilio integration for opt-in SMS alerts (event reminders, renewal notices).  
**NEW:** Removed.  
**Action needed:**
- [ ] Add `twilio` back as optional dependency
- [ ] Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` env vars
- [ ] Implement `sendSMSNotification()` server action
- [ ] Add opt-in SMS flag to Member model
- [ ] Use for: event reminders, membership renewals, volunteer shift reminders

### 20. Webhook Management (Outbound) ✅ COMPLETED (May 2026)
**OLD:** `WebhookSubscription` model — orgs could register URLs to receive events.  
**Completed:**
- [x] WebhookEndpoint + WebhookDelivery Prisma models
- [x] `lib/actions/webhooks.ts` — getWebhookEndpoints, createWebhookEndpoint (HMAC secret), toggleWebhookEndpoint, deleteWebhookEndpoint
- [x] `/dashboard/settings/webhooks` — endpoint list + create form with event multi-select
- [x] Signed secrets via crypto.randomBytes(`whsec_...`)

### 21. API Keys (Programmatic Access) ✅ COMPLETED (May 2026)
**OLD:** `ApiKey` model with SHA-256 hashed keys, rate limiting.  
**Completed:**
- [x] ApiKey Prisma model (keyHash, keyPrefix, permissions, isActive, lastUsedAt, expiresAt)
- [x] `lib/actions/api-keys.ts` — createApiKey (crypto.randomBytes + SHA-256), getApiKeys, revokeApiKey, deleteApiKey
- [x] `/dashboard/settings/api-keys` — key list with one-time reveal banner + revoke/delete

### 22. Notification System (In-App) ✅ COMPLETED (May 2026)
**OLD:** `Notification` + `Announcement` models for in-app alerts.  
**Completed:**
- [x] Notification Prisma model (title, body, type, isRead, actionUrl, resourceType/Id)
- [x] getAdminNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead in `lib/actions/communications.ts`
- [x] NotificationsBell client component in dashboard header with unread badge + dropdown

---

## 🔧 TECHNICAL DEBT

### 23. Prisma Schema — Volunteer Hours Fix ✅ COMPLETED (April 2026)
- [x] `VolunteerSignup` has `hoursLogged Float?`, `hoursApproved Float?`, `hoursStatus HoursStatus?`
- [x] `prisma db push` applied — DB in sync

### 24. Test Scripts in package.json ✅ COMPLETED (April 2026)
- [x] `"test:e2e": "playwright test"` added
- [x] `"test:e2e:headed"` added
- [x] `"test:e2e:ui"` added

### 25. Seed Script Completeness ✅ COMPLETED (April 2026)
- [x] `prisma/seed.ts` creates full realistic demo data
- [x] 3 tiers (Free/Standard/Premium)
- [x] 12 members with mix of ACTIVE/PENDING/INACTIVE statuses
- [x] 5 events (past + upcoming + draft) with registrations
- [x] 4 volunteer opportunities with signups

### 26. Environment Variables Documentation
- [ ] Create `.env.example` in root (currently missing)
- [ ] Document all required vs optional env vars

### 27. Error Tracking
**OLD:** `@sentry/nextjs` for error tracking.  
**NEW:** Removed.  
- [ ] Evaluate: add Sentry back or use Vercel observability
- [ ] At minimum: add error boundaries in dashboard layout

### 28. TanStack Query (Client-Side Data)
**OLD:** `@tanstack/react-query` for client-side data fetching and caching.  
**NEW:** Removed — all data via Server Components.  
- [ ] Assess: are there places needing real-time updates or optimistic UI?
- [ ] If yes: add `@tanstack/react-query` back

---

## ✅ CONFIRMED COVERED in v2

| Feature | v1 Status | v2 Status |
|---------|-----------|-----------|
| Member CRUD | ✅ | ✅ |
| Membership Tiers | ✅ | ✅ |
| Event CRUD + Status | ✅ | ✅ |
| Event Registration | ✅ | ✅ |
| Volunteer Opportunities | ✅ | ✅ |
| Volunteer Direct Signup | ✅ | ✅ |
| Clerk Auth + Organizations | ✅ | ✅ (upgraded to Clerk Orgs) |
| PostgreSQL + Prisma | ✅ | ✅ |
| Vercel Deployment | ✅ | ✅ |
| Next.js App Router | ✅ | ✅ (upgraded 14→15) |
| React Hook Form + Zod | ✅ | ✅ |
| shadcn/ui Components | ✅ | ✅ |
| Onboarding Flow | ✅ | ✅ (improved) |
| Resend Email (transactional) | ✅ | ✅ |
| Stripe (tenant billing) | ✅ | ✅ |
| Dashboard Stats | ✅ | ✅ |
| Tailwind CSS | ✅ | ✅ |
| Server Actions pattern | ✅ | ✅ (now modular) |
| Turbopack dev builds | ❌ | ✅ |

---

## 📦 DEPENDENCIES TO RE-EVALUATE

| Package | Old | New | Action |
|---------|-----|-----|--------|
| `@sentry/nextjs` | ✅ | ❌ | Add back for production error tracking |
| `recharts` | ✅ | ❌ | Add back when building analytics |
| `twilio` | ✅ | ❌ | Add back for SMS feature |
| `cloudinary` | ✅ | ❌ | Add back for file uploads |
| `qrcode` | ✅ | ❌ | Add back for check-in / membership cards |
| `passkit-generator` | ✅ | ❌ | Add back for Apple Wallet cards |
| `@tanstack/react-query` | ✅ | ❌ | Add back if client-side caching needed |
| `papaparse` | ✅ | ❌ | Add back for CSV import/export |
| `next-themes` | ✅ | ❌ | Add for dark mode support |
| `@playwright/test` | ✅ | ❌ | **Add now** for E2E tests |
| `tsx` (devDep) | ✅ | ✅ | Already present |
