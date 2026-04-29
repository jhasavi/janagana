# JanaGana User Types Guide

This guide explains the different types of users in JanaGana and how they relate to each other.

## Overview

JanaGana has four main user types, each serving a different purpose in the system:

1. **Organization Admins** - Manage the organization
2. **Organization Members** - People who sign up for the organization
3. **Volunteers** - Members who volunteer their time
4. **CRM Contacts** - People tracked in the CRM system

---

## 1. Organization Admins

**What they are:**
- Clerk users who create and manage organizations
- Have full access to the JanaGana Dashboard
- Can configure settings, manage billing, invite other admins

**How they access:**
- Sign in via Google OAuth or email/password at https://janagana.namasteneedham.com/sign-in
- Access the full Dashboard after authentication

**What they can do:**
- Create and manage organizations
- Configure organization settings
- Manage billing and subscriptions
- Invite other admins
- View and manage all data (members, events, CRM, etc.)

**Storage:**
- Stored in Clerk (authentication provider)
- Not stored in the JanaGana Member table

---

## 2. Organization Members

**What they are:**
- People who have signed up for your organization
- May have paid memberships (with Stripe subscriptions)
- Can participate in events, clubs, and volunteer opportunities
- Can access the Portal for self-service actions

**How they access:**
- Sign up through your website (integrated via JanaGana API)
- Sign up through the Portal (if enabled)
- Can access the Portal at https://janagana.namasteneedham.com/portal/[org-slug]

**What they can do:**
- View their profile
- Register for events
- Sign up for volunteer opportunities
- Join clubs
- Update their information
- Manage their membership (if paid)

**Storage:**
- Stored in the `Member` table in JanaGana database
- Optionally linked to a `Contact` record in the CRM (1:1 relationship)

**Key fields:**
- `email`, `firstName`, `lastName` - Basic contact info
- `status` - ACTIVE, INACTIVE, PENDING, BANNED
- `tierId` - Membership tier (free, paid, etc.)
- `stripeSubscriptionId` - If they have a paid subscription
- `clerkUserId` - For portal authentication

---

## 3. Volunteers

**What they are:**
- A subset of Organization Members
- Members who sign up for volunteer opportunities
- Can log volunteer hours and get approval

**How they access:**
- Same as Organization Members
- Additional access to volunteer-specific features

**What they can do:**
- Sign up for volunteer opportunities
- Log volunteer hours
- View their volunteer history
- Get approval/rejection for logged hours

**Storage:**
- Stored in the `Member` table (as a member)
- Volunteer signups stored in `VolunteerSignup` table
- Hours tracked in `VolunteerSignup.hoursLogged` and `hoursApproved`

**Key fields:**
- `status` - CONFIRMED, CANCELED, COMPLETED
- `hoursLogged` - Hours claimed by volunteer
- `hoursApproved` - Hours approved by admin
- `hoursStatus` - PENDING, APPROVED, REJECTED

---

## 4. CRM Contacts

**What they are:**
- People tracked in the CRM system
- Can be members, donors, or external people
- Used for tracking interactions, activities, and deals
- Broader than just members - includes anyone you want to track

**How they access:**
- They don't directly access JanaGana
- They are tracked by admins for relationship management

**What they represent:**
- Members (if CRM sync is enabled)
- Donors (people who donated but may not be members)
- External contacts (partners, vendors, etc.)
- Anyone you want to track interactions with

**Storage:**
- Stored in the `Contact` table in JanaGana database
- Optionally linked to a `Member` record (1:1 relationship)
- Linked to `Activity` records for tracking interactions
- Linked to `Deal` records for sales/fundraising opportunities

**Key fields:**
- `email`, `firstName`, `lastName` - Basic contact info
- `memberId` - Optional link to a Member record
- `companyId` - Optional link to a Company record
- `source` - Where the contact came from (website, referral, event, etc.)
- `jobTitle`, `linkedinUrl` - Professional information

---

## Data Flow

### Website Visitor → Organization Member → CRM Contact

```
1. Visitor signs up on your website
   ↓
2. Organization Member created in JanaGana (Member table)
   ↓
3. If CRM sync is enabled, Contact record created (Contact table)
   ↓
4. Member linked to Contact (1:1 relationship)
```

### Donor → CRM Contact (without being a Member)

```
1. Someone donates through your website
   ↓
2. Donation recorded in JanaGana (Donation table)
   ↓
3. Contact record created in CRM (Contact table)
   ↓
4. Activity record created to track the donation
```

### Event Registration → Activity

```
1. Member registers for an event
   ↓
2. EventRegistration created (EventRegistration table)
   ↓
3. Activity record created in CRM (Activity table)
   ↓
4. Activity linked to the member's Contact
```

---

## Key Differences

| Feature | Organization Members | CRM Contacts |
|---------|---------------------|--------------|
| **Purpose** | People who signed up for the organization | Anyone you want to track (members, donors, external) |
| **Access** | Can access Portal | No direct access |
| **Subscription** | Can have paid memberships | No subscription concept |
| **Events** | Can register for events | Activities tracked for them |
| **Volunteering** | Can sign up to volunteer | Volunteer hours tracked |
| **Relationship** | Can be linked to Contact (1:1) | Can be linked to Member (1:1) |
| **Scope** | Organization-specific | Broader CRM scope |

---

## When to Use Each

### Use Organization Members when:
- Someone signs up for your organization
- Someone pays for a membership
- Someone needs to access the Portal
- Someone participates in events or clubs
- Someone volunteers

### Use CRM Contacts when:
- You want to track interactions with anyone
- Someone donates but doesn't sign up as a member
- You're managing external relationships (partners, vendors)
- You need to track activities and deals
- You want a broader view of all contacts

---

## Best Practices

1. **Enable CRM sync for members** - Automatically create Contact records when Members are created
2. **Track all donations** - Create Contact records for donors even if they're not members
3. **Use Activities for engagement** - Track all interactions (event registration, donations, communications)
4. **Keep Contact data current** - Update Contact records when Member information changes
5. **Use source tracking** - Tag Contacts with where they came from (website, referral, event)

---

## API Integration

When integrating JanaGana with your website:

1. **Create Member on signup** - Use the `/api/plugin/crm/contacts` endpoint to create a Contact
2. **The Contact can be linked to a Member** - If the person becomes a member, the system will create the link
3. **Track event registrations** - Use `/api/plugin/event-registrations` to register members for events
4. **Activities are auto-created** - Event registrations and donations automatically create Activity records

See the Purple Wings Integration Guide for detailed API integration steps.
