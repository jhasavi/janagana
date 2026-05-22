# Auth → Org → Tenant → Onboarding → Dashboard State Machine

**Last updated:** 2026-05-21  
**Scope:** Janagana multi-tenant SaaS (Next.js 15 App Router + Clerk v6 + Prisma)

---

## 1. Source-of-Truth Rules

| Data | Authoritative source | Cache / secondary |
|---|---|---|
| User identity | Clerk session JWT | — |
| Org memberships | Clerk organization membership list | — |
| Active org (server) | `auth().orgId` from Clerk JWT session claims | `JG_ACTIVE_ORG` httpOnly cookie (1 h TTL, fallback only) |
| Tenant record | DB `Tenant` table (`clerkOrgId` is the join key) | `JG_TENANT_ID` httpOnly cookie (1 h TTL, fallback only) |
| Tenant-data isolation | `tenantId` column on every DB query | — |

**Priority when sources disagree:**

1. Clerk JWT `orgId` (highest trust — signed by Clerk)
2. `JG_ACTIVE_ORG` cookie — accepted **only after** `userBelongsToOrganization()` passes  
3. Auto-detected single membership (Clerk API call)  
4. null → redirect to org picker or onboarding

---

## 2. Route / State Table

| State | User arrives at | Server check | Result |
|---|---|---|---|
| Unauthenticated | any protected route | middleware: no `userId` | → `/sign-in` |
| Authenticated, no orgs | `/` → `/dashboard` | `getTenant()` = null, 0 memberships | → `/onboarding` |
| Authenticated, 1 org, no active cookie | `/` → `/dashboard` | `getTenant()` auto-selects single membership | → dashboard renders |
| Authenticated, 2+ orgs, no active cookie | `/` → `/dashboard` | `getTenant()` = null, memberships > 0 | → `/select-organization` |
| Authenticated, active cookie valid | `/dashboard` | `getTenant()` resolves via cookie | → dashboard renders |
| Authenticated, active cookie expired | `/dashboard` | `getTenant()`: cookie absent → membership check | 1 org → auto-select, 2+ → `/select-organization` |
| Authenticated, active cookie for wrong user's org | `/dashboard` | `userBelongsToOrganization()` fails → cookie ignored | → membership check path |
| Authenticated, Clerk org exists, DB tenant missing | `/dashboard` | `resolveTenantForAuthState` auto-creates tenant | → dashboard renders |
| Authenticated, DB tenant exists, Clerk org missing | `/dashboard` | `findUnique({ clerkOrgId })` = null; auto-create blocked (no Clerk org to read) | → `/select-organization` (has memberships) or `/onboarding` |
| Onboarding, existing org user lands here | `/onboarding` | `getTenant()` = null + memberships > 0 | → `/select-organization` |
| Onboarding, truly new user | `/onboarding` | `getTenant()` = null, 0 memberships | → shows create-org wizard |
| Org picker, user selects org | `/select-organization` | client: `POST /api/active-org` → sets cookies | → `/dashboard` |
| Sign-out | `UserButton` / `SignOutButton` | Clerk signs out → `afterSignOutUrl="/api/sign-out"` | → clears `JG_ACTIVE_ORG` + `JG_TENANT_ID` → `/sign-in` |
| Account switch (new user) | `/sign-in` → authenticated | Old user's cookie may still exist; `userBelongsToOrganization(newUserId, oldOrgId)` fails | Cookie ignored; new user's memberships used |

---

## 3. Redirect Rules

```
POST /login (Clerk)
    │
    ▼
/ (RootPage)
    │
    ├─ userId = null ──────────────────────────────► /sign-in
    │
    └─ userId present ─────────────────────────────► /dashboard
                                                        │
                                                        ▼
                                               DashboardLayout
                                               getTenant()
                                                        │
                              ┌─────────────────────────┤
                              │                         │
                         tenant found             tenant = null
                              │                         │
                              ▼              membership check (Clerk API)
                         dashboard renders               │
                                              ┌──────────┴──────────┐
                                              │                     │
                                        0 memberships         ≥ 1 membership
                                              │                     │
                                              ▼                     ▼
                                        /onboarding        /select-organization
                                     (create first org)           │
                                                          user selects org
                                                                   │
                                                         POST /api/active-org
                                                         (sets cookies)
                                                                   │
                                                                   ▼
                                                             /dashboard
```

---

## 4. Sign-Out Flow

```
User clicks sign out (UserButton or SignOutButton)
    │
    ▼
Clerk: invalidates session JWT + clears __session cookie
    │
    ▼
afterSignOutUrl = /api/sign-out  (GET handler)
    │
    ▼
Server: sets JG_ACTIVE_ORG = '' (maxAge=0)
        sets JG_TENANT_ID  = '' (maxAge=0)
    │
    ▼
Redirects to /sign-in
```

**Why this matters:** Without this step, a browser can have a valid `JG_ACTIVE_ORG` cookie for up to 1 hour after sign-out. The membership check (`userBelongsToOrganization`) was a partial mitigation, but explicit deletion is the correct fix.

---

## 5. Account Switching Behavior

When **User A** signs out and **User B** signs in on the same browser:

1. Sign-out clears `JG_ACTIVE_ORG` and `JG_TENANT_ID` (via `/api/sign-out`).
2. User B signs in; Clerk `auth().userId` = User B's ID.
3. Any residual `JG_ACTIVE_ORG` cookie (if cookie deletion raced) is validated via `userBelongsToOrganization(userBId, orgAId)` → **fails** → cookie ignored.
4. User B's own org memberships are fetched from Clerk.
5. 0 orgs → `/onboarding`, 1 org → auto-select, 2+ orgs → `/select-organization`.

User A's org data **never leaks** to User B.

---

## 6. Failure Cases and Repair Behavior

| Case | Detection | Behavior |
|---|---|---|
| Clerk org exists, DB tenant missing | `prisma.tenant.findUnique({ clerkOrgId })` = null | Auto-create tenant from Clerk org data (idempotent) |
| DB tenant exists, Clerk org missing | Clerk `getOrganization()` throws 404 | `getTenant()` returns null → org picker / onboarding depending on membership count |
| Duplicate tenant records (same `clerkOrgId`) | Prisma unique constraint violation | `findUnique` returns at most one; duplicate creation blocked by DB constraint |
| Stale `JG_ACTIVE_ORG` cookie | `userBelongsToOrganization()` fails | Cookie discarded; falls through to membership-count path |
| 2+ org memberships, no active cookie | `resolveTenantForAuthState` returns null | `/select-organization` (not create-org) |
| Membership verification Clerk API error | `catch` in `userBelongsToOrganization` | Warning logged; falls back to direct tenant lookup (partial trust) |

---

## 7. Cookie Design

| Cookie | Value | TTL | Purpose |
|---|---|---|---|
| `JG_ACTIVE_ORG` | Clerk org ID (`org_xxx`) | 1 hour | Server-side active org for SSR tenant resolution when Clerk JWT has no `orgId` |
| `JG_TENANT_ID` | DB Tenant UUID | 1 hour | Fast DB lookup — skips `findUnique({ clerkOrgId })` traversal |

**Rules:**
- Both cookies are `httpOnly`, `secure` (prod), `sameSite=lax`.
- They are **caches** only. Membership is always verified before a cookie is accepted.
- They are **cleared on sign-out** via `GET /api/sign-out`.
- They are **never the primary source of truth** — Clerk JWT `orgId` always wins when present.

---

## 8. Onboarding Contract

Onboarding (`/onboarding`) is shown **only when the user has zero Clerk org memberships**.

If the user already has org memberships, they are sent to `/select-organization` — never to the create-org wizard. This prevents:
- Duplicate org creation on re-login
- "Forced create org" loop for returning multi-org users

The `completeOnboarding` server action is idempotent: if a Clerk org with the same name already exists for the user, it reuses that org rather than creating a second one.

---

## 9. Dashboard Access Requirements

A user can render a dashboard page if and only if:

1. `auth().userId` is present (enforced by middleware).
2. `getTenant()` returns a non-null `Tenant` record (enforced by `DashboardLayout`).
3. That `Tenant.clerkOrgId` matches the resolved active org.
4. The user's `userId` has a membership in that Clerk org (`userBelongsToOrganization` inside `resolveTenantForAuthState`).

Every database query inside dashboard actions includes `tenantId` for data isolation.

---

## 10. Files Involved in Auth/Org/Tenant Logic

| File | Role |
|---|---|
| `middleware.ts` | Rejects unauthenticated requests; lets onboarding + select-org bypass tenant check |
| `app/page.tsx` | Root → always sends authenticated users to `/dashboard` |
| `app/(dashboard)/layout.tsx` | Resolves tenant; → `/select-organization` (has orgs) or → `/onboarding` (no orgs) |
| `app/onboarding/page.tsx` | Shows create-org wizard only when user has 0 org memberships |
| `app/select-organization/page.tsx` | Lists user's Clerk org memberships; auto-selects if only one |
| `app/select-organization/SelectOrgClient.tsx` | Client: calls `/api/active-org`, redirects to dashboard |
| `lib/tenant.ts` | `getTenant()` + `resolveTenantForAuthState()` — core resolution logic |
| `lib/actions/tenant.ts` | `completeOnboarding()` — idempotent org + tenant creation |
| `app/api/active-org/route.ts` | Sets `JG_ACTIVE_ORG` + `JG_TENANT_ID` cookies after membership verification |
| `app/api/sign-out/route.ts` | Clears `JG_ACTIVE_ORG` + `JG_TENANT_ID`; redirects to `/sign-in` |
| `components/dashboard/header.tsx` | `UserButton` with `afterSignOutUrl="/api/sign-out"` |
| `components/dashboard/organization-switcher-sync.tsx` | Syncs Clerk active org changes to server cookies in real time |
