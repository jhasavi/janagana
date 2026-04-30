# Codebase Migration Guide: Contact-First Architecture

## Overview

This guide outlines the code changes required to migrate the JanaGana codebase from Member-first to Contact-first architecture. These changes should be implemented **after** the data migration is complete and validated.

## Migration Strategy

### Phase 1: Compatibility Layer (During Transition)

During the transition period, use dual foreign keys to support both Member and Contact:

```typescript
// Example: Get people (works with both Member and Contact)
export async function getPeople(params?: {
  search?: string
  status?: string
  tierId?: string
}) {
  const tenant = await requireTenant()
  
  // During transition: query both Member and Contact
  // After migration: query only Contact with enrollments
  const [members, contacts] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId: tenant.id, contact: null }, // Only members without Contact
      include: { tier: true },
    }),
    prisma.contact.findMany({
      where: { tenantId: tenant.id },
      include: {
        enrollments: { include: { tier: true } },
      },
    }),
  ])
  
  // Merge results
  const people = [
    ...members.map(m => ({ ...m, source: 'member' })),
    ...contacts.map(c => ({ ...c, source: 'contact' })),
  ]
  
  return { success: true, data: people }
}
```

### Phase 2: Full Contact-First (After Migration)

After data migration is complete, update all functions to use Contact + MembershipEnrollment:

```typescript
// Final state: Contact-first queries
export async function getPeople(params?: {
  search?: string
  status?: string
  tierId?: string
}) {
  const tenant = await requireTenant()
  
  const where: Record<string, unknown> = { tenantId: tenant.id }
  
  if (params?.status) {
    where.enrollments = { some: { status: params.status } }
  }
  if (params?.tierId) {
    where.enrollments = { some: { tierId: params.tierId } }
  }
  if (params?.search) {
    const q = params.search
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { emails: { has: q } },
    ]
  }
  
  const contacts = await prisma.contact.findMany({
    where,
    include: {
      enrollments: { include: { tier: true } },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
  
  return { success: true, data: contacts }
}
```

## File-by-File Changes

### 1. `lib/actions/members.ts`

**Current Functions to Update:**

#### `getMembers()` → `getPeople()`
- Change from querying `prisma.member` to `prisma.contact`
- Include `enrollments` relation instead of `tier`
- Update search to use `emails` array
- Update filters to use enrollment status/tier

#### `getMember(id)` → `getPerson(id)`
- Query `prisma.contact` instead of `prisma.member`
- Include `enrollments` with tier
- Update related data queries to use `contactId`

#### `createMember(input)` → `createPerson(input)`
- Create `Contact` record first
- If tier specified, create `MembershipEnrollment`
- Remove email uniqueness check (now allows shared emails)

#### `updateMember(id, input)` → `updatePerson(id, input)`
- Update `Contact` record
- If tier changed, update/create `MembershipEnrollment`
- Handle enrollment status changes

#### `deleteMember(id)` → `deletePerson(id)`
- Delete `MembershipEnrollment` records
- Delete `Contact` record
- Handle cascade of related data

#### `getMemberStats()` → `getPeopleStats()`
- Count `Contact` records
- Count active enrollments
- Group by enrollment tier

#### `exportMembersCSV()` → `exportPeopleCSV()`
- Query `Contact` with enrollments
- Flatten enrollment data for CSV
- Update column names

#### `importMembersCSV()` → `importPeopleCSV()`
- Create `Contact` records
- Create `MembershipEnrollment` if tier specified
- Handle duplicate email logic (soft uniqueness)

#### `sendRenewalSmsReminders()`
- Query `Contact` with active enrollments
- Use enrollment renewal dates
- Send to contact phone numbers

### 2. `lib/actions/events.ts`

**Changes:**
- Update `EventRegistration` queries to use `contactId`
- Update event registration to link to Contact
- Update participant lists to show Contact data

### 3. `lib/actions/volunteers.ts`

**Changes:**
- Update `VolunteerSignup` queries to use `contactId`
- Update volunteer signup to link to Contact
- Update volunteer lists to show Contact data

### 4. `lib/actions/documents.ts`

**Changes:**
- Update `MemberDocument` → `ContactDocument`
- Update document upload to link to Contact
- Update document queries to use `contactId`

### 5. `lib/actions/custom-fields.ts`

**Changes:**
- Update `MemberCustomField` → `ContactCustomField`
- Update `MemberCustomFieldValue` → `ContactCustomFieldValue`
- Update custom field operations to use Contact

### 6. `lib/actions/communications.ts`

**Changes:**
- Update email/sms targeting to use Contact
- Update recipient queries to use Contact
- Handle multiple emails per Contact

### 7. `lib/actions/portal.ts`

**Changes:**
- Update portal member profile to use Contact
- Update self-service actions to work with Contact
- Update authentication to use Contact.clerkUserId

### 8. API Routes

**Files to Update:**
- `app/api/portal/member/profile/route.ts` → Use Contact
- `app/api/plugin/event-registrations/route.ts` → Use contactId
- `app/api/webhooks/stripe/route.ts` → Update to use Contact enrollment

### 9. UI Components

**Pages to Update:**
- `app/(dashboard)/dashboard/members/page.tsx` → Update to show People with enrollments
- `app/(dashboard)/dashboard/crm/page.tsx` → Already uses Contact, ensure consistency
- Update all member tables to show Contact data
- Update member forms to Contact + Enrollment forms

## API Changes

### Webhook Events

Update webhook event names to reflect Contact-first:

```typescript
// Old
member.created
member.updated
member.deleted

// New
contact.created
contact.updated
contact.deleted
enrollment.created
enrollment.updated
enrollment.deleted
```

### API Endpoints

Update API endpoint paths:

```typescript
// Old
GET /api/members
POST /api/members
PUT /api/members/:id
DELETE /api/members/:id

// New
GET /api/contacts
POST /api/contacts
PUT /api/contacts/:id
DELETE /api/contacts/:id
GET /api/contacts/:id/enrollments
POST /api/contacts/:id/enrollments
PUT /api/contacts/:id/enrollments/:id
DELETE /api/contacts/:id/enrollments/:id
```

## Testing Checklist

After implementing code changes:

- [ ] All member-related actions work with Contact
- [ ] Event registration creates Contact link
- [ ] Volunteer signup creates Contact link
- [ ] Documents upload to Contact
- [ ] Custom fields work with Contact
- [ ] Email/SMS targeting works with Contact
- [ ] Portal member profile works with Contact
- [ ] CSV export/import works with Contact
- [ ] Stats calculations work with Contact
- [ ] Webhooks fire with correct event names
- [ ] Stripe integration works with enrollments

## Rollback Plan

If issues arise after code migration:

1. Revert code changes to use Member model
2. Run rollback script to delete Contact/Enrollment data
3. Restore from database backup if needed

## Timeline Estimate

- **Phase 1 (Compatibility Layer)**: 3-4 days
- **Phase 2 (Full Contact-First)**: 5-7 days
- **Testing & Validation**: 2-3 days
- **Total**: 2-3 weeks

## Dependencies

- Data migration must be complete and validated
- Database backup must be available
- Staging environment must be tested first
- Communication plan for API changes to external integrations
