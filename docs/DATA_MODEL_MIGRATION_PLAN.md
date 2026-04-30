# Phase B: Data Model Migration Plan
## Contact-First Architecture Migration

### Current State Analysis

#### Issues Identified

**1. Member-First Architecture**
- Member model is the master person record (lines 215-269)
- Contact is optional CRM overlay (lines 1124-1158)
- All foreign keys point to Member, not Contact
- Contact has optional 1:1 relation to Member

**2. Email Uniqueness Constraints**
- Member: `@@unique([tenantId, email])` (line 266)
- Contact: `@@unique([tenantId, email])` (line 1154)
- Prevents shared family emails and no-email records

**3. Volunteer/Jobs Mixing**
- JobType enum includes VOLUNTEER (lines 129-135)
- Volunteer opportunities should be separate from paid careers

**4. No Membership Enrollment Entity**
- Membership data stored directly on Member
- No historical enrollment tracking
- Cannot support multiple enrollments over time

**5. Foreign Key Dependencies**
All these models reference Member instead of Contact:
- EventRegistration (line 334)
- VolunteerSignup (line 384)
- Donation (line 510)
- ClubMembership (line 450)
- ClubPost (line 466)
- Notification (line 592)
- MemberCustomFieldValue (line 713)
- MemberDocument (line 896)
- ChapterMember (line 1295)
- VolunteerShiftSignup (line 552)

### Target Architecture

#### Canonical Contact Model
```prisma
model Contact {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Identity
  externalIds Json?    // { stripeCustomerId: "...", externalSystemId: "..." }
  emails      String[] // Primary email at index 0, support multiple
  phones      String[]
  firstName   String
  lastName    String
  avatarUrl   String?
  dateOfBirth DateTime?
  
  // Address
  address     String?
  city        String?
  state       String?
  postalCode  String?
  country     String   @default("US")
  
  // Household
  householdId String?
  household   Household? @relation(fields: [householdId], references: [id], onDelete: SetNull)
  
  // CRM fields
  source      String?  // "website", "referral", "event", "import"
  lifecycleStage String? // "Prospect", "Engaged", "Member", "Donor", "Volunteer"
  tags        String[] @default([])
  notes       String?  @db.Text
  
  // Portal auth
  clerkUserId String?  @unique
  
  // Relationships
  companyId   String?
  company     Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
  
  enrollments MembershipEnrollment[]
  donations   Donation[]
  eventRegistrations EventRegistration[]
  volunteerSignups VolunteerSignup[]
  clubMemberships ClubMembership[]
  clubPosts    ClubPost[]
  notifications Notification[]
  customFieldValues ContactCustomFieldValue[]
  jobPostings JobPosting[]
  forumThreads ForumThread[]
  forumReplies ForumReply[]
  documents   ContactDocument[]
  chapterMemberships ChapterMember[]
  
  // CRM relationships
  deals       Deal[]
  activities  Activity[]
  tasks       Task[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Soft uniqueness - allow shared emails
  @@index([tenantId])
  @@index([tenantId, emails])
  @@index([clerkUserId])
  @@index([householdId])
}
```

#### Membership Enrollment Model
```prisma
model MembershipEnrollment {
  id          String       @id @default(cuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  contactId   String
  contact     Contact      @relation(fields: [contactId], references: [id], onDelete: Cascade)
  
  tierId      String?
  tier        MembershipTier? @relation(fields: [tierId], references: [id])
  
  status      MemberStatus @default(ACTIVE)
  startDate   DateTime     @default(now())
  endDate     DateTime?
  renewalDate DateTime?
  
  // Billing
  stripeCustomerId     String?
  stripeSubscriptionId String?
  paymentStatus        String?  // "active", "past_due", "canceled"
  
  // Membership-specific
  memberNumber String?
  benefits    String[] @default([])
  notes       String?  @db.Text
  
  // Chapter (if applicable)
  chapterId   String?
  chapter     Chapter?   @relation(fields: [chapterId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([contactId, tierId, startDate])
  @@index([tenantId])
  @@index([contactId])
  @@index([tenantId, status])
}
```

#### Household Model
```prisma
model Household {
  id             String   @id @default(cuid())
  tenantId       String
  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  name           String
  primaryContactId String?
  primaryContact Contact? @relation(fields: [primaryContactId], references: [id])
  
  contacts       Contact[]
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([tenantId])
}
```

### Migration Steps

#### Step 1: Schema Preparation
1. Add new models (Contact, MembershipEnrollment, Household)
2. Add migration fields to existing models
3. Create foreign key relationships
4. Run `prisma migrate dev --name prepare-contact-first`

#### Step 2: Data Migration
1. **Migrate Member → Contact**
   - Create Contact record for each Member
   - Copy personal data (name, email, phone, address)
   - Set Contact.clerkUserId = Member.clerkUserId
   - Map Contact.source = "migration"
   - Set Contact.lifecycleStage based on Member.status

2. **Migrate Member → MembershipEnrollment**
   - Create MembershipEnrollment for each Member
   - Link to new Contact
   - Copy tier, status, dates from Member
   - Preserve billing info (stripeCustomerId, stripeSubscriptionId)

3. **Update Foreign Keys**
   - EventRegistration: memberId → contactId
   - VolunteerSignup: memberId → contactId
   - Donation: memberId → contactId
   - ClubMembership: memberId → contactId
   - ClubPost: memberId → contactId
   - Notification: memberId → contactId
   - MemberCustomFieldValue → ContactCustomFieldValue
   - MemberDocument → ContactDocument
   - ChapterMember: memberId → contactId
   - VolunteerShiftSignup: memberId → contactId

4. **Handle Volunteer Jobs**
   - Find all JobPosting with jobType = VOLUNTEER
   - Create VolunteerOpportunity records
   - Migrate signups to VolunteerSignup
   - Remove VOLUNTEER from JobType enum

#### Step 3: Validation
1. Verify all data migrated correctly
2. Check foreign key integrity
3. Validate contact uniqueness handling
4. Test enrollment history preservation
5. Verify volunteer opportunity migration

#### Step 4: Cleanup
1. Remove old Member model
2. Remove Contact.memberId relation
3. Update all references in codebase
4. Remove unique email constraints
5. Run final migration

### Risk Mitigation

**Data Loss Prevention**
- Create database backup before migration
- Use transaction for atomic operations
- Keep Member table as read-only during migration
- Validate counts before/after migration

**Rollback Plan**
- Keep original Member table until validation complete
- Document rollback procedure
- Test rollback in staging environment

**Performance Considerations**
- Run migration during low-traffic period
- Batch process large datasets
- Monitor database performance during migration
- Consider temporary indexes for migration queries

### Code Changes Required

**Update All Actions**
- `getMembers()` → `getContacts()` with enrollment joins
- `createMember()` → `createContact()` + `createMembershipEnrollment()`
- Update all foreign key references in queries

**Update UI Components**
- Member forms → Contact forms + Enrollment forms
- Update table columns and filters
- Update help text and labels

**Update API Endpoints**
- `/api/members` → `/api/contacts`
- Add `/api/memberships` endpoints
- Update webhook event names

### Testing Strategy

**Unit Tests**
- Contact creation and validation
- Membership enrollment lifecycle
- Foreign key relationship integrity
- Email uniqueness handling

**Integration Tests**
- End-to-end member signup flow
- Event registration with contact
- Volunteer signup flow
- Donation processing

**Migration Tests**
- Test with sample data
- Verify data integrity
- Test rollback procedure
- Performance testing with large datasets

### Timeline Estimate

- **Schema Preparation**: 2-3 days
- **Data Migration Script**: 3-4 days
- **Code Updates**: 5-7 days
- **Testing & Validation**: 3-4 days
- **Total**: 2-3 weeks

### Dependencies

- Must complete Phase A terminology updates (DONE)
- Database backup procedure
- Staging environment for testing
- Communication plan for users about changes
