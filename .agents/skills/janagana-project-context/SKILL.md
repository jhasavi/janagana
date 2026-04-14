---
name: janagana-project-context
description: >-
  Provides core Janagana project context, architecture rules, and structure
  guidance for working on any file in this repo.
---

# Janagana Project Skill

## What This Project Is
Janagana is a multi-tenant SaaS platform built with Next.js 14 for managing 
memberships, events, volunteers, clubs, and fundraising for non-profit and 
for-profit organizations. It is a simplified Next.js monolith (NOT a monorepo) 
deployed on Vercel with Neon PostgreSQL.

Live: https://janagana.namasteneedham.com

---

## Architecture Rules
- This is a Next.js 14 App Router project using Server Actions — NOT API routes 
  for data mutations
- All data mutations go through lib/actions.ts (Server Actions)
- Database access is ALWAYS through Prisma — never raw SQL
- Multi-tenant: every query MUST filter by tenantId for data isolation
- Authentication is handled by Clerk — never roll custom auth logic

---

## Project Structure
janagana/
├── app/
│   ├── (auth)/sign-in, sign-up     ← Clerk auth pages
│   ├── dashboard/                  ← Admin dashboard
│   │   ├── members/
│   │   ├── events/
│   │   ├── volunteers/
│   │   ├── clubs/
│   │   ├── fundraising/
│   │   └── settings/
│   ├── portal/                     ← Member-facing portal
│   ├── onboarding/                 ← New org setup wizard
│   └── api/webhooks/               ← Stripe/Clerk webhooks only
├── components/ui/                  ← shadcn/ui components only
├── lib/
│   ├── actions.ts                  ← ALL server actions live here
│   ├── prisma.ts                   ← Prisma client singleton
│   ├── email.ts                    ← Resend email service
│   ├── sms.ts                      ← Twilio SMS service
│   ├── upload.ts                   ← Cloudinary uploads
│   └── membership-card.ts          ← QR code / membership card
├── prisma/
│   ├── schema.prisma               ← 50+ models
│   └── seed.ts
├── e2e/tests/                      ← Playwright E2E tests
└── middleware.ts                   ← Clerk auth middleware

---

## Tech Stack (Never Substitute These)
- **Framework:** Next.js 14 App Router
- **Language:** TypeScript — always use strict types, never use `any`
- **Styling:** Tailwind CSS + shadcn/ui — never write custom CSS
- **Auth:** Clerk v5 (`@clerk/nextjs`) — never use NextAuth or custom sessions
- **Database:** Prisma ORM + PostgreSQL (Neon) — never use Drizzle or raw SQL
- **Forms:** React Hook Form + Zod — always validate with Zod schemas
- **State:** TanStack Query (React Query) for client-side data fetching
- **Icons:** Lucide React — never use other icon libraries
- **Payments:** Stripe
- **Email:** Resend
- **SMS:** Twilio
- **File Upload:** Cloudinary
- **Error Tracking:** Sentry
- **Deployment:** Vercel

---

## Coding Conventions

### Server Actions Pattern (lib/actions.ts)
```typescript
"use server";

export async function createMember(tenantId: string, data: MemberInput) {
  try {
    // Always validate with Zod first
    const validated = MemberSchema.parse(data);
    
    // Always include tenantId in every query
    const member = await prisma.member.create({
      data: { ...validated, tenantId }
    });
    
    return { success: true, data: member };
  } catch (error) {
    console.error("[createMember]", error);
    return { success: false, error: "Failed to create member" };
  }
}

// ALWAYS filter by tenantId — never query without it
const members = await prisma.member.findMany({
  where: { tenantId: tenant.id }  // ← required on every query
});

// Server components by default
// Add "use client" only when needed (interactivity, hooks, browser APIs)
// Use shadcn/ui components from components/ui/
// Use Lucide icons
// Tailwind for all styling

Error Returns
Server Actions return { success: true, data } or { success: false, error: string }
Never throw errors out of Server Actions to the client
Always log errors with context: console.error("[functionName]", error)
Zod Validation
Always define Zod schemas for form inputs
Validate at the Server Action level before touching the database
Reuse schemas for both form validation (React Hook Form) and server validation


// Singleton pattern — never create new PrismaClient instances
import { prisma } from "@/lib/prisma";

Key Models to Know
Tenant — top-level org record, every other model has tenantId
Member — org members with tenantId
Event + EventRegistration — events with member registrations
VolunteerOpportunity + VolunteerShift + VolunteerHours — volunteer system
Club + ClubPost + ClubComment — clubs with social features
DonationCampaign + Donation — fundraising
Subscription + Invoice + Payment — Stripe billing


npm run db:generate    # After schema changes
npm run db:migrate     # Create + apply migration
npm run db:push        # Dev only — no migration file
npm run db:studio      # GUI to browse data
npm run seed           # Load demo data

# Required
DATABASE_URL                          # Neon PostgreSQL
CLERK_SECRET_KEY                      # sk_test_... or sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY     # pk_test_... or pk_live_...
NEXT_PUBLIC_APP_URL                   # http://localhost:3000 or prod domain

# Clerk Redirects
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Optional Integrations
STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY / STRIPE_WEBHOOK_SECRET
RESEND_API_KEY / EMAIL_FROM / EMAIL_FROM_NAME
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN

Known Gotchas & Debugging Tips
Clerk redirect loop → Clear browser cookies, check Clerk Dashboard redirect URLs
Prisma client out of sync → Run npm run db:generate after any schema change
Vercel 500 on deploy → Check CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are set
Build errors → rm -rf .next then npm run build
Missing tenantId → Every DB query needs where: { tenantId } — most bugs come from missing this
"use client" overuse → Default to Server Components; only add "use client" for hooks/events
Wrong env vars → NEXT_PUBLIC_ prefix required for anything used in browser/client components
What Is In Progress (Roadmap)
⏳ Membership renewal reminders
⏳ Failed payment notifications
⏳ Job Boards
⏳ Discussion Boards/Forum
⏳ Form Builder
⏳ Member check-in system
⏳ Custom Reports / Advanced Analytics
⏳ Email Campaigns UI
⏳ Notification System UI
E2E Test Files (Playwright)
Located in e2e/tests/:

01-onboarding.spec.ts
02-member-management.spec.ts
03-event-flow.spec.ts
04-volunteer-flow.spec.ts
05-club-flow.spec.ts
06-member-portal.spec.ts
07-volunteer-shifts.spec.ts
08-event-registration.spec.ts
Run with: npm run test or npx playwright test --headed

Agent Instructions
Always include tenantId in every Prisma query
Always use TypeScript with proper types — never any
Always use existing shadcn/ui components before creating new ones
Always put data mutations in lib/actions.ts as Server Actions
Always validate inputs with Zod before database operations
Never create API routes for data mutations — use Server Actions
Never use raw SQL — always use Prisma
When suggesting new features, check the Roadmap section above first
When debugging, start with the Known Gotchas section above
