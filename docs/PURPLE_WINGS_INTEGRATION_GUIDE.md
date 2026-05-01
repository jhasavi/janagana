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

### Upcoming Events — Public Embed API (no API key required)

```
GET https://janagana.namasteneedham.com/api/embed/events?tenantSlug=purple-wings&maxItems=10
```

Response shape per event includes all fields admins fill in:

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique event ID |
| `title` | string | Event title |
| `shortSummary` | string\|null | 1–2 sentence blurb shown on cards |
| `description` | string\|null | Full rich text description |
| `startDate` | ISO datetime | Event start |
| `endDate` | ISO datetime\|null | Event end (defaults to +1h in widgets) |
| `location` | string\|null | Venue name + address |
| `speakerName` | string\|null | e.g. `"Vikram - Investment Specialist"` |
| `attendeeCount` | number\|null | Post-event attendance count |
| `coverImageUrl` | string\|null | Card hero image URL |
| `tags` | string[] | Category labels, e.g. `["Investing"]` |
| `priceCents` | number | 0 = free |
| `isVirtual` | boolean | Computed from format + virtualLink |
| `detailsUrl` | string | Deep link to portal event card |
| `portalUrl` | string | Portal events page URL |

### Past Events — Public Embed API

```
GET https://janagana.namasteneedham.com/api/embed/past-events?tenantSlug=purple-wings&maxItems=20
```

Returns events with `status=COMPLETED` (or past-dated `PUBLISHED`) in reverse chronological order.
Same field shape as upcoming events, including `detailsUrl`, `registrationUrl`, `portalUrl`, and `isVirtual`.

### Recommended Source-of-Truth Model

For Purple Wings and future website integrations, use this pattern:

1. Upcoming events: render from `GET /api/embed/events`
2. Past events: render from `GET /api/embed/past-events`
3. Temporary fallback archive: keep local-only data behind a non-primary fallback path until migration is validated

This gives a single operational source of truth in JanaGana while preserving historical continuity during cutover.

### Migration and Rollback (Purple Wings)

Run from the JanaGana repo:

```bash
# Dry-run import from ../tpw/past-events-import.csv
npm run scripts:import-tpw-events

# Apply import (idempotent create/update)
npm run scripts:import-tpw-events -- --apply

# Dry-run rollback (only rows tagged tpw-migrated)
npm run scripts:rollback-tpw-events

# Apply rollback
npm run scripts:rollback-tpw-events -- --apply
```

Importer behavior:
- Uses tenant slug `purple-wings` by default
- Upserts by title + event date window (safe re-run)
- Marks imported rows with the `tpw-migrated` tag
- Stores historical records as `COMPLETED`
- Preserves speaker, attendance, location, description, image, and category/topic tags

### Example Implementation (Next.js — Upcoming Events)

```typescript
// app/events/page.tsx
interface JanaGanaEvent {
  id: string
  title: string
  shortSummary: string | null
  startDate: string
  endDate: string | null
  location: string | null
  speakerName: string | null
  attendeeCount: number | null
  coverImageUrl: string | null
  tags: string[]
  priceCents: number
  isVirtual: boolean
  detailsUrl: string
  portalUrl: string
}

async function getUpcomingEvents(): Promise<JanaGanaEvent[]> {
  const response = await fetch(
    'https://janagana.namasteneedham.com/api/embed/events?tenantSlug=purple-wings&maxItems=10',
    { next: { revalidate: 300 } } // Cache 5 minutes — no API key needed
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.data ?? []
}

async function getPastEvents(): Promise<JanaGanaEvent[]> {
  const response = await fetch(
    'https://janagana.namasteneedham.com/api/embed/past-events?tenantSlug=purple-wings&maxItems=20',
    { next: { revalidate: 3600 } }
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.data ?? []
}

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingEvents(), getPastEvents()])

  return (
    <main>
      <section>
        <h2>Upcoming Events</h2>
        {upcoming.length === 0 ? (
          <p>Check back soon for new events!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcoming.map((event) => (
              <article key={event.id} className="rounded-2xl border overflow-hidden shadow-sm">
                {event.coverImageUrl && (
                  <img src={event.coverImageUrl} alt={event.title} className="w-full h-44 object-cover" />
                )}
                <div className="p-5">
                  {event.tags.slice(0, 1).map((tag) => (
                    <span key={tag} className="text-xs font-bold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                  <h3 className="mt-2 font-bold text-lg">{event.title}</h3>
                  {event.shortSummary && <p className="text-sm text-slate-600 mt-1">{event.shortSummary}</p>}
                  <p className="text-sm mt-2">📅 {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  {event.location && <p className="text-sm">📍 {event.location}</p>}
                  {event.speakerName && <p className="text-sm font-medium mt-1">Speaker: {event.speakerName}</p>}
                  <div className="mt-4 flex gap-2">
                    <a href={event.detailsUrl} className="btn-primary">Register Free</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <h2>Our Past Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {past.map((event) => (
            <article key={event.id} className="rounded-2xl border overflow-hidden">
              {event.coverImageUrl && (
                <img src={event.coverImageUrl} alt={event.title} className="w-full h-44 object-cover" />
              )}
              <div className="p-5">
                {event.tags.slice(0, 1).map((tag) => (
                  <span key={tag} className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
                {event.attendeeCount && (
                  <span className="ml-2 text-xs text-slate-500">{event.attendeeCount} attended</span>
                )}
                <h3 className="mt-2 font-bold text-lg">{event.title}</h3>
                {event.shortSummary && <p className="text-sm text-slate-600 mt-1">{event.shortSummary}</p>}
                <p className="text-sm mt-2">📅 {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                {event.location && <p className="text-sm">📍 {event.location}</p>}
                {event.speakerName && <p className="text-sm font-medium mt-1">Speaker: {event.speakerName}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
```

### Admin Workflow — Creating Rich Event Cards

When creating or editing an event in JanaGana Dashboard, fill in these fields for the best card appearance:

| Field | Purpose | Example |
|---|---|---|
| **Title** | Card heading | `Basics of Finance` |
| **Short Summary** | 1–2 sentence teaser on card | `Essential intro to personal finance: banking, credit, budgeting.` |
| **Description** | Full event details (rich text) | Full agenda, what attendees will learn |
| **Cover Image URL** | Card hero image | Upload to `/images/` folder and paste URL |
| **Speaker Name** | Speaker credit line | `Bank of America Financial Education Team` |
| **Tags** | Category badge (first tag shown) | `Financial Basics`, `Investing`, `Real Estate` |
| **Attendee Count** | Post-event stat (fill after event) | `45` |
| **Status** | `PUBLISHED` = upcoming, `COMPLETED` = past | |
| **Location** | Venue + address | `High Rock School, 77 Ferndale Road, Needham, MA` |

### Migrating Hardcoded Past Events

To move Purple Wings historical events from hardcoded React data into JanaGana:

1. In JanaGana Dashboard → Events → **New Event**
2. Set `status = COMPLETED`
3. Fill in: title, shortSummary, speakerName, startDate, location, attendeeCount, coverImageUrl, tags
4. The past events component above will automatically fetch and render them

Once migrated, remove the hardcoded data array from the Purple Wings codebase.

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
