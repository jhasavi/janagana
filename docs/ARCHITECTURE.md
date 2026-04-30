# JanaGana — Architecture Overview

## What It Is

JanaGana is a **multi-tenant SaaS platform** for managing memberships, events, and volunteers for non-profit and community organizations. 

Each organization ("tenant") is isolated — members, events, and volunteer data belong to one org and can never be seen by another.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Auth** | Clerk v6 (with Organizations) |
| **Database** | PostgreSQL via Neon |
| **ORM** | Prisma v6 |
| **Forms** | React Hook Form + Zod |
| **Payments** | Stripe |
| **Email** | Resend |
| **Deployment** | Vercel |
| **Tables** | TanStack Table |
| **Toast** | Sonner |

---

## Multi-Tenancy Model

Each tenant maps to a **Clerk Organization**. When a user signs up and completes onboarding:

1. A Clerk org is created (`orgId` stored in Clerk)
2. A `Tenant` record is created in the database linking to the Clerk org via `clerkOrgId`
3. All subsequent data (contacts, events, volunteers) is scoped with `tenantId`

```
Clerk User
  └── Clerk Organization (orgId)
        └── Tenant (clerkOrgId = orgId)
              ├── Contacts (People)
              ├── MembershipEnrollments
              ├── MembershipTiers
              ├── Events
              └── VolunteerOpportunities
```

**Every Prisma query MUST include `tenantId`** — this is the core multi-tenancy enforcement.

## Contact-First Architecture

JanaGana uses a **Contact-first data model** where Contact is the canonical master record for all individuals:

- **Contact (People)**: Master person record with identity info (name, email, phone, address)
- **MembershipEnrollment**: Links Contact to membership tiers (a person can have multiple enrollments over time)
- **EventRegistration**: Links Contact to events
- **VolunteerSignup**: Links Contact to volunteer opportunities
- **Donation**: Links Contact to donations

This separation allows:
- People to have multiple roles (member, donor, volunteer, etc.)
- Historical tracking of membership enrollments
- Shared family emails (multiple contacts can share an email)
- Clear separation between identity (Contact) and engagement (enrollments, registrations, etc.)

See [DATA_MODEL_MIGRATION_PLAN.md](./DATA_MODEL_MIGRATION_PLAN.md) for migration details.

---

## Authentication & Authorization Flow

```
Request → middleware.ts
            ├── Public route? → Allow through
            ├── No userId?   → Redirect to /sign-in
            ├── Onboarding?  → Allow through
            └── Dashboard without orgId? → Redirect to /onboarding

Dashboard pages → Server Component
                    → auth() from Clerk
                    → getTenantByClerkOrgId(orgId)
                    → All queries filtered by tenant.id
```

---

## Data Mutation Pattern (Server Actions)

All data mutations use **Next.js Server Actions** — never API routes for CRUD.

```typescript
// lib/actions/members.ts
"use server";

export async function createMember(tenantId: string, data: unknown) {
  // 1. Validate with Zod
  const validated = CreateMemberSchema.parse(data);
  
  // 2. Always include tenantId
  const member = await prisma.member.create({
    data: { ...validated, tenantId }
  });
  
  // 3. Invalidate cache
  revalidatePath('/dashboard/members');
  
  // 4. Return typed result
  return { success: true, data: member };
}
```

Actions live in:
- `lib/actions/tenant.ts` — org settings, dashboard stats, onboarding
- `lib/actions/members.ts` — member CRUD + tier management
- `lib/actions/events.ts` — event CRUD + registration management
- `lib/actions/volunteers.ts` — volunteer opportunities + signups

---

## Database Schema (Core Models)

```
Tenant ─── (1:N) ─── Member ─────────── (N:1) ─── MembershipTier
         │                └── (1:N) ── EventRegistration ←── Event
         │                └── (1:N) ── VolunteerSignup ←──── VolunteerOpportunity
         ├── (1:N) ─── Event
         ├── (1:N) ─── MembershipTier
         └── (1:N) ─── VolunteerOpportunity
```

All models use `cuid()` for IDs and have `createdAt` / `updatedAt` timestamps.

---

## Routing Structure

```
/                       → Landing page (public)
/sign-in                → Clerk sign-in (public)
/sign-up                → Clerk sign-up (public)
/onboarding             → Org setup wizard (authenticated, no org required)
/dashboard              → Stats overview (requires org)
/dashboard/members      → Member management
/dashboard/events       → Event management
/dashboard/volunteers   → Volunteer management
/dashboard/settings     → Org settings
/api/webhooks/stripe    → Stripe webhook handler
/api/webhooks/clerk     → Clerk webhook handler
```

---

## Webhook Handling

Webhooks live under `/api/webhooks/` and use route handlers (not Server Actions):

- `/api/webhooks/stripe` — Handles Stripe billing events
- `/api/webhooks/clerk` — Handles org/member sync from Clerk

Both verify signatures before processing:
- Stripe: `stripe.webhooks.constructEvent(body, sig, secret)`
- Clerk: Svix signature verification

---

## Caching Strategy

- **Server Components** fetch data directly — no client-side caching layer
- **`revalidatePath()`** called after every mutation to invalidate Next.js cache
- **No TanStack Query** in current version — all data via Server Components
- Static pages (if any) use `revalidate` export for ISR

---

## Security Principles

1. **Multi-tenant isolation** — every query filtered by `tenantId`
2. **Clerk middleware** — all dashboard routes protected before rendering
3. **Zod validation** — all inputs validated at the Server Action boundary
4. **No raw SQL** — Prisma ORM only
5. **No secrets in client** — all `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, etc. are server-only
6. **Webhook signature verification** — all webhooks verified before processing
