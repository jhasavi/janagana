# CRM Integration Guide

This document explains how the JanaGana CRM automatically integrates with other features to capture leads, track activities, and maintain up-to-date contact information.

## Overview

The CRM is designed to automatically capture and sync data from multiple touchpoints across the platform. This ensures that every interaction with your organization (Purple Wings or any other tenant) is tracked in the CRM without manual data entry.

## Integration Points

### 1. Member → Contact Sync

**When:** A member is created or their profile is updated

**What happens:**
- A Contact record is automatically created in the CRM when a member joins
- Member profile updates (name, phone, address) automatically sync to the Contact
- The Contact is linked to the Member via `memberId`

**Source:** `lib/crm-sync.ts` - `syncMemberToContact()`

**Use case:** When someone signs up for membership, they become a CRM contact automatically. No manual entry needed.

---

### 2. Event Registration → Activity Sync

**When:** A member registers for an event (via portal or admin)

**What happens:**
- An Activity record is created in the CRM
- Activity type: "MEETING"
- Title: "Registered for: [Event Name]"
- Description includes event date
- Marked as completed with timestamp

**Source:** `lib/crm-sync.ts` - `syncEventRegistrationToActivity()`

**Integration points:**
- Portal event registration (`lib/actions/portal.ts` - `portalRegisterForEvent()`)
- Plugin API event registration (`app/api/plugin/event-registrations/route.ts`)

**Use case:** When a member registers for an event through the portal, their CRM timeline shows this activity automatically.

---

### 3. Volunteer Signup → Activity Sync

**When:** A member signs up for volunteer work

**What happens:**
- An Activity record is created in the CRM
- Activity type: "TASK"
- Title: "Volunteer Signup: [Opportunity Name]"
- Description includes opportunity details
- Marked as completed with timestamp

**Source:** `lib/crm-sync.ts` - `syncVolunteerSignupToActivity()`

**Integration point:**
- Portal volunteer signup (`lib/actions/portal.ts` - `portalSignupForVolunteer()`)

**Use case:** When a member signs up to volunteer, their CRM timeline tracks this engagement automatically.

---

### 4. Donation → Activity Sync

**When:** A donation is made

**What happens:**
- An Activity record is created in the CRM
- Activity type: "OTHER"
- Title: "Donation: $[Amount]"
- Description includes campaign name (if applicable)
- If donor is a member, links to their Contact
- If donor is not a member, creates a new Contact with source "donation"

**Source:** `lib/crm-sync.ts` - `syncDonationToActivity()`

**Use case:** When someone donates (member or non-member), the CRM tracks this as an activity and creates/updates the contact.

---

### 5. Form Submission → Contact Sync

**When:** Someone submits a custom form

**What happens:**
- Checks if Contact already exists with the email
- If exists: Updates Contact with new information
- If not exists: Creates new Contact with source "form"

**Source:** `lib/crm-sync.ts` - `syncFormSubmissionToContact()`

**Parameters:**
- `tenantId`: Organization ID
- `email`: Required
- `firstName`, `lastName`, `phone`: Optional
- `formId`: Optional (for tracking which form)
- `source`: Optional (defaults to "form")

**Use case:** When someone fills out a contact form, survey, or any custom form, they're automatically added to CRM as a contact.

**Implementation example:**
```typescript
import { syncFormSubmissionToContact } from '@/lib/crm-sync'

await syncFormSubmissionToContact({
  tenantId: tenant.id,
  email: formData.email,
  firstName: formData.firstName,
  lastName: formData.lastName,
  phone: formData.phone,
  formId: form.id,
  source: 'contact_form',
})
```

---

### 6. Newsletter Subscription → Contact Sync

**When:** Someone subscribes to the newsletter

**What happens:**
- Checks if Contact already exists with the email
- If exists: Updates Contact and sets source to "newsletter"
- If not exists: Creates new Contact with source "newsletter"

**Source:** `lib/crm-sync.ts` - `syncNewsletterSubscriptionToContact()`

**Parameters:**
- `tenantId`: Organization ID
- `email`: Required
- `firstName`, `lastName`: Optional

**Use case:** When someone subscribes to your newsletter, they're automatically added to CRM as a lead.

**Implementation example:**
```typescript
import { syncNewsletterSubscriptionToContact } from '@/lib/crm-sync'

await syncNewsletterSubscriptionToContact({
  tenantId: tenant.id,
  email: subscriberEmail,
  firstName: subscriberFirstName,
  lastName: subscriberLastName,
})
```

---

### 7. Member Profile Editing → Contact Sync

**When:** A member edits their profile in the portal

**What happens:**
- Member record is updated with new information
- Changes automatically sync to the linked Contact record
- CRM contact information stays current

**Source:**
- Portal API: `app/api/portal/member/profile/route.ts`
- Calls: `syncMemberToContact()`

**Integration point:**
- Portal profile edit page: `app/portal/[slug]/profile/edit/page.tsx`

**Use case:** Members can update their own information through the portal, and the CRM stays in sync automatically.

---

## Portal Member Experience

### What Members Can Do

1. **View Profile** (`/portal/[slug]`)
   - See their membership status and tier
   - View QR code for event check-in
   - See activity summary (events registered, volunteer signups)

2. **Edit Profile** (`/portal/[slug]/profile/edit`)
   - Update personal information (name, phone, address)
   - Changes automatically sync to CRM
   - No admin intervention needed

3. **Register for Events** (`/portal/[slug]/events`)
   - Browse upcoming events
   - Register with one click
   - Registration automatically creates CRM activity

4. **Sign Up for Volunteer Work** (`/portal/[slug]/volunteers`)
   - Browse volunteer opportunities
   - Sign up for opportunities
   - Signup automatically creates CRM activity

5. **View Directory** (`/portal/[slug]/directory`)
   - See other members
   - Network within the organization

6. **Manage Membership** (`/portal/[slug]/membership`)
   - View membership details
   - Subscribe/renew membership

7. **Complete Surveys** (`/portal/[slug]/surveys`)
   - Participate in organization surveys
   - Responses can be synced to CRM (if implemented)

8. **View Member Card** (`/portal/[slug]/card`)
   - Digital membership card
   - QR code for check-in

---

## Lead Capture Flow

### Newsletter Subscription

```
Visitor → Subscribes to Newsletter
         ↓
syncNewsletterSubscriptionToContact()
         ↓
Contact created/updated in CRM
         ↓
Source marked as "newsletter"
         ↓
Admin can follow up in CRM
```

### Form Submission

```
Visitor → Fills out contact/survey form
         ↓
syncFormSubmissionToContact()
         ↓
Contact created/updated in CRM
         ↓
Source marked as "form"
         ↓
Admin can follow up in CRM
```

### Event Registration

```
Visitor → Registers for event (if member)
         ↓
portalRegisterForEvent()
         ↓
EventRegistration created
         ↓
syncEventRegistrationToActivity()
         ↓
Activity created in CRM
         ↓
Contact timeline shows event registration
```

### Volunteer Signup

```
Visitor → Signs up for volunteer work (if member)
         ↓
portalSignupForVolunteer()
         ↓
VolunteerSignup created
         ↓
syncVolunteerSignupToActivity()
         ↓
Activity created in CRM
         ↓
Contact timeline shows volunteer signup
```

---

## CRM Activity Timeline

The CRM automatically builds a timeline of each contact's engagement:

1. **Initial Contact Creation**
   - Source: "membership", "newsletter", "form", "donation", etc.
   - Timestamp: When they first engaged

2. **Event Registrations**
   - Activity type: "MEETING"
   - Shows which events they registered for
   - Timestamped

3. **Volunteer Signups**
   - Activity type: "TASK"
   - Shows volunteer opportunities they signed up for
   - Timestamped

4. **Donations**
   - Activity type: "OTHER"
   - Shows donation amounts and campaigns
   - Timestamped

5. **Profile Updates**
   - Contact information updated
   - Timestamped

---

## Implementation Guide

### Adding New Integrations

To add a new integration that syncs to CRM:

1. **Create a sync function in `lib/crm-sync.ts`**
   ```typescript
   export async function syncNewFeatureToCRM(params: {
     // your parameters
   }) {
     // Check if contact exists
     // Create or update contact
     // Create activity if needed
   }
   ```

2. **Call the sync function in your feature**
   ```typescript
   import { syncNewFeatureToCRM } from '@/lib/crm-sync'

   // After your feature's main action
   try {
     await syncNewFeatureToCRM({ /* params */ })
   } catch (error) {
     console.error('Failed to sync to CRM:', error)
     // Don't fail the main action if CRM sync fails
   }
   ```

3. **Test the integration**
   - Verify the contact is created/updated
   - Verify activities are created
   - Verify the main feature still works if CRM sync fails

---

## Error Handling

All CRM sync functions are designed to be non-blocking:

- If CRM sync fails, the main feature continues to work
- Errors are logged to console for debugging
- Users are not affected by CRM sync failures

This ensures that:
- Event registrations always succeed
- Volunteer signups always succeed
- Member profile updates always succeed
- Even if CRM is temporarily unavailable

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Member Portal                         │
├─────────────────────────────────────────────────────────────┤
│  • Register for Events    → EventRegistration             │
│  • Sign up for Volunteers → VolunteerSignup                │
│  • Edit Profile           → Member (updated)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ sync functions
┌─────────────────────────────────────────────────────────────┐
│                          CRM Sync Layer                      │
├─────────────────────────────────────────────────────────────┤
│  • syncEventRegistrationToActivity()                        │
│  • syncVolunteerSignupToActivity()                         │
│  • syncMemberToContact()                                    │
│  • syncFormSubmissionToContact()                           │
│  • syncNewsletterSubscriptionToContact()                    │
│  • syncDonationToActivity()                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                            CRM                              │
├─────────────────────────────────────────────────────────────┤
│  • Contact Records (people)                                │
│  • Activity Records (interactions)                          │
│  • Deal Records (opportunities)                             │
│  • Task Records (follow-ups)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Best Practices

1. **Always use try-catch** when calling sync functions
2. **Don't block main functionality** if CRM sync fails
3. **Log errors** for debugging
4. **Test integrations** with real data
5. **Document new integrations** in this file

---

## Future Enhancements

Potential integrations to add:

1. **Course Enrollment** → Activity sync
2. **Survey Responses** → Contact/Activity sync
3. **Job Applications** → Contact/Activity sync
4. **Forum Participation** → Activity sync
5. **Email Campaign Opens/Clicks** → Activity sync
6. **SMS Interactions** → Activity sync
7. **Club Joining** → Activity sync
8. **Chapter Joining** → Activity sync

---

## Support

For questions or issues with CRM integrations:
- Check the console logs for error messages
- Review the sync function in `lib/crm-sync.ts`
- Verify the contact exists in the CRM
- Check that the tenant context is correct
