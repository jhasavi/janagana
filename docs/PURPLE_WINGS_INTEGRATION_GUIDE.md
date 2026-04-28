# Purple Wings Integration Guide

This guide walks through integrating JanaGana CRM, Membership, and Event management with The Purple Wings website (www.thepurplewings.org).

## Overview

The Purple Wings website will use JanaGana's REST API to:
- Create members when users sign up
- Display events from JanaGana
- Register users for events
- Sync member data to JanaGana CRM

## Prerequisites

- JanaGana production instance: https://janagana.namasteneedham.com
- Purple Wings website: https://www.thepurplewings.org
- JanaGana API key (generated from dashboard)

---

## Step 1: Get Your JanaGana API Key

### 1.1 Sign In to JanaGana

Go to https://janagana.namasteneedham.com and sign in using:
- Email/password, or
- Google OAuth (once configured in Clerk dashboard)

### 1.2 Navigate to API Keys

1. Go to Dashboard
2. Click "Settings" in the sidebar
3. Select "API Keys"

### 1.3 Generate Production API Key

1. Click "Generate New API Key"
2. Copy the API key (format: `jg_live_...`)
3. **Important:** Store this securely - you won't see it again

### 1.4 Note Your API URL

Your production API URL is:
```
https://janagana.namasteneedham.com/api/plugin
```

---

## Step 2: Configure Purple Wings Environment Variables

Add these to your Purple Wings environment variables (Vercel dashboard or `.env.local`):

```env
JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
JANAGANA_API_KEY=jg_live_your_actual_api_key_here
```

**For Vercel:**
1. Go to Vercel dashboard → Purple Wings project
2. Settings → Environment Variables
3. Add the two variables above
4. Redeploy the application

---

## Step 3: Test API Connection

### 3.1 Test Contacts API

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://janagana.namasteneedham.com/api/plugin/crm/contacts
```

Expected response:
```json
{
  "contacts": []
}
```

### 3.2 Test Events API

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://janagana.namasteneedham.com/api/plugin/events
```

Expected response:
```json
{
  "events": []
}
```

---

## Step 4: Implement Member Creation on Signup

When a user signs up on Purple Wings, create a member in JanaGana:

### API Endpoint
```
POST https://janagana.namasteneedham.com/api/plugin/crm/contacts
```

### Request Headers
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

### Request Body
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

### Example Implementation (Next.js)

```typescript
// lib/janagana.ts
const JANAGANA_API_URL = process.env.JANAGANA_API_URL!
const JANAGANA_API_KEY = process.env.JANAGANA_API_KEY!

export async function createMember(data: {
  email: string
  firstName: string
  lastName: string
  phone?: string
}) {
  const response = await fetch(`${JANAGANA_API_URL}/crm/contacts`, {
    method: 'POST',
    headers: {
      'x-api-key': JANAGANA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create member in JanaGana')
  }

  return response.json()
}

// Use in your signup handler
export async function handleSignup(formData: FormData) {
  const email = formData.get('email') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string

  try {
    // Create member in JanaGana
    await createMember({ email, firstName, lastName })
    
    // Continue with your existing signup logic (Supabase auth, etc.)
    // ...
  } catch (error) {
    console.error('Failed to sync to JanaGana:', error)
    // Don't block signup if JanaGana sync fails
  }
}
```

---

## Step 5: Display Events from JanaGana

### API Endpoint
```
GET https://janagana.namasteneedham.com/api/plugin/events?status=PUBLISHED
```

### Example Implementation (Next.js)

```typescript
// app/events/page.tsx
async function getEvents() {
  const response = await fetch(
    `${process.env.JANAGANA_API_URL}/events?status=PUBLISHED`,
    {
      headers: {
        'x-api-key': process.env.JANAGANA_API_KEY!,
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch events')
  }

  const data = await response.json()
  return data.events
}

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <div>
      <h1>Upcoming Events</h1>
      {events.length === 0 ? (
        <p>No events scheduled</p>
      ) : (
        <div className="grid">
          {events.map((event: any) => (
            <div key={event.id} className="event-card">
              <h2>{event.title}</h2>
              <p>{new Date(event.startDate).toLocaleDateString()}</p>
              <p>{event.location}</p>
              <button>Register</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Step 6: Implement Event Registration

### API Endpoint
```
POST https://janagana.namasteneedham.com/api/plugin/event-registrations
```

### Request Headers
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

### Request Body
```json
{
  "eventId": "event_id_here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

### Example Implementation (Next.js)

```typescript
// app/events/register/action.ts
'use server'

import { createMember } from '@/lib/janagana'

export async function registerForEvent(formData: FormData) {
  const eventId = formData.get('eventId') as string
  const email = formData.get('email') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string

  const response = await fetch(
    `${process.env.JANAGANA_API_URL}/event-registrations`,
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.JANAGANA_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        email,
        firstName,
        lastName,
        phone,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 409) {
      return { error: 'Already registered for this event' }
    }
    return { error: 'Failed to register for event' }
  }

  return { success: true }
}
```

---

## Step 7: Verify Integration

### 7.1 Test Member Creation

1. Sign up a new user on Purple Wings
2. Go to JanaGana Dashboard → Members
3. Verify the new member appears

### 7.2 Test Event Display

1. Create an event in JanaGana Dashboard → Events
2. Set status to "PUBLISHED"
3. Go to Purple Wings events page
4. Verify the event appears

### 7.3 Test Event Registration

1. Register for an event on Purple Wings
2. Go to JanaGana Dashboard → Events → View event
3. Verify the registration appears
4. Go to JanaGana Dashboard → CRM → Activities
5. Verify an activity record was created

---

## Step 8: Data Sync Behavior

### Automatic Syncs

JanaGana automatically syncs data:

1. **Member → Contact**: When a member is created, a Contact record is automatically created in the CRM
2. **Event Registration → Activity**: When a user registers for an event, an Activity record is automatically created in the CRM linked to their Contact

### Data Flow

```
Purple Wings Signup
    ↓
JanaGana Member Created
    ↓
JanaGana Contact Created (CRM)
    ↓
User Registers for Event
    ↓
JanaGana Event Registration Created
    ↓
JanaGana Activity Created (CRM)
```

---

## Troubleshooting

### API Returns 401 Unauthorized

- Check that `JANAGANA_API_KEY` is set correctly
- Verify the API key is active in JanaGana dashboard
- Check that the API key hasn't expired

### API Returns 404 Not Found

- Verify `JANAGANA_API_URL` is correct
- Check that the endpoint path is correct

### Member Not Created

- Check browser console for errors
- Verify network requests in DevTools
- Check JanaGana logs (if accessible)

### Events Not Displaying

- Verify events are set to "PUBLISHED" status in JanaGana
- Check that the API key has access to the tenant
- Verify the tenant slug matches

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** periodically
4. **Monitor API usage** in JanaGana dashboard
5. **Use HTTPS** for all API calls

---

## Support

For issues or questions:
- Check JanaGana documentation: `/docs`
- Review framework integration guides: `/docs/FRAMEWORK_INTEGRATION_GUIDES.md`
- Contact JanaGana support if needed
