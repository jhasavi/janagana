# The Purple Wings - JanaGana Integration Guide

## Architecture Overview

**JanaGana** is now your centralized backend service providing:
- **CRM** (Contact, Deal, Activity, Task management)
- **Membership Management** (Member profiles, tiers, subscriptions)
- **Event Management** (Events, registrations, volunteer opportunities)

**The Purple Wings (TPW)** is your public-facing website that:
- Handles user authentication (Supabase)
- Displays courses and content
- Integrates with JanaGana API for backend services

```
┌─────────────────┐         API          ┌─────────────────┐
│   TPW Website   │ ◄──────────────────► │   JanaGana      │
│ (thepurplewings) │                     │ (localhost:3000)│
│                 │                     │                 │
│ - Supabase Auth │                     │ - CRM           │
│ - Course Display│                     │ - Memberships   │
│ - Event Display │                     │ - Events        │
└─────────────────┘                     └─────────────────┘
```

## Your Setup

You already have:
- ✅ JanaGana organization created: "The Purple Wings"
- ✅ API key generated: `jg_live_4f62e0e1eac249c4c0446c988b84ac65e1b11794a65fdb425dacf0e962f77d25`
- ✅ Database migrated with CRM models
- ✅ Dev server running: `http://localhost:3000`

## Integration Flow

### 1. User Signs Up on TPW

**Current Flow:**
- User goes to `thepurplewings.org/auth`
- Signs up with Google or email/password
- Supabase creates user account
- User can browse courses

**New Flow (with JanaGana integration):**
- User goes to `thepurplewings.org/auth`
- Signs up with Google or email/password
- Supabase creates user account
- **TPW backend calls JanaGana API to create Member record**
- JanaGana automatically creates Contact record
- User is now tracked in JanaGana CRM

### 2. Admin Tracks Members

**Admin Dashboard (JanaGana):**
- Go to `http://localhost:3000/dashboard`
- Sign in as `jhasavi@gmail.com`
- Select "The Purple Wings" organization
- View:
  - Members list (all TPW users)
  - CRM Contacts (auto-synced from members)
  - Deals and pipeline
  - Activities and tasks
  - Events and registrations

### 3. Creating Events

**In JanaGana Dashboard:**
1. Go to `http://localhost:3000/dashboard`
2. Navigate to Events section
3. Create new event:
   - Title: "Financial Literacy Workshop"
   - Date/Time: Select date
   - Location: Physical or virtual
   - Capacity: Max attendees
   - Description: Event details

**Events automatically available to TPW via API**

### 4. Members Sign Up for Events

**On TPW Website:**
- User views events page (fetched from JanaGana API)
- Clicks "Register" for an event
- TPW calls JanaGana API to create registration
- JanaGana automatically creates Activity record
- Admin sees registration in JanaGana dashboard

## Implementation Steps

### Step 1: Add JanaGana API Configuration to TPW

Create `/Users/Sanjeev/tpw/.env.local` (if not exists):

```env
JANAGANA_API_URL=http://localhost:3000/api/plugin
JANAGANA_API_KEY=jg_live_4f62e0e1eac249c4c0446c988b84ac65e1b11794a65fdb425dacf0e962f77d25
```

### Step 2: Create JanaGana API Client in TPW

Create `/Users/Sanjeev/tpw/src/lib/janagana.ts`:

```typescript
const API_URL = process.env.JANAGANA_API_URL || 'http://localhost:3000/api/plugin'
const API_KEY = process.env.JANAGANA_API_KEY

async function janaganaRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`JanaGana API error: ${response.statusText}`)
  }

  return response.json()
}

// Create a member when user signs up
export async function createMember(data: {
  email: string
  firstName: string
  lastName: string
  phone?: string
}) {
  return janaganaRequest('/crm/contacts', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      source: 'thepurplewings',
    }),
  })
}

// Fetch events for display
export async function getEvents() {
  return janaganaRequest('/events') // You'll need to create this endpoint
}

// Register for an event
export async function registerForEvent(eventId: string, memberId: string) {
  return janaganaRequest('/event-registrations', {
    method: 'POST',
    body: JSON.stringify({ eventId, memberId }),
  })
}
```

### Step 3: Integrate Member Creation on Signup

Modify `/Users/Sanjeev/tpw/src/app/auth/page.tsx`:

After successful signup, call JanaGana API:

```typescript
const handleEmailSignup = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)
  setMessage(null)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName }
    }
  })
  
  if (error) {
    // ... existing error handling
  } else {
    // NEW: Create member in JanaGana
    try {
      const nameParts = fullName.split(' ')
      await createMember({
        email,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
      })
    } catch (err) {
      console.error('Failed to create JanaGana member:', err)
      // Don't block signup if JanaGana fails
    }
    
    setMessage('Account created! Check email to confirm, or sign in now.')
    setTimeout(() => setMode('login'), 2000)
  }
}
```

### Step 4: Create Events API Endpoint in JanaGana

Create `/Users/Sanjeev/JanaGana/app/api/plugin/events/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'

// GET /api/plugin/events - List events
export async function GET(request: NextRequest) {
  const tenant = await verifyPluginApiKey(request)
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const events = await prisma.event.findMany({
    where: { 
      tenantId: tenant.id,
      status: 'PUBLISHED'
    },
    orderBy: { startDate: 'asc' },
  })

  return NextResponse.json({ events })
}
```

### Step 5: Create Event Registration API Endpoint

Create `/Users/Sanjeev/JanaGana/app/api/plugin/event-registrations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPluginApiKey } from '@/lib/plugin-auth'
import { syncEventRegistrationToActivity } from '@/lib/crm-sync'

// POST /api/plugin/event-registrations - Register for event
export async function POST(request: NextRequest) {
  const tenant = await verifyPluginApiKey(request)
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { eventId, email, firstName, lastName } = body

  // Find or create member
  let member = await prisma.member.findFirst({
    where: { 
      tenantId: tenant.id,
      email 
    },
  })

  if (!member) {
    member = await prisma.member.create({
      data: {
        tenantId: tenant.id,
        email,
        firstName,
        lastName,
        status: 'ACTIVE',
      },
    })
  }

  // Create registration
  const registration = await prisma.eventRegistration.create({
    data: {
      eventId,
      memberId: member.id,
      status: 'CONFIRMED',
    },
    include: {
      event: true,
      member: true,
    },
  })

  // Sync to CRM activity
  await syncEventRegistrationToActivity(registration.id)

  return NextResponse.json(registration, { status: 201 })
}
```

### Step 6: Create Events Page on TPW

Create `/Users/Sanjeev/tpw/src/app/events/page.tsx`:

```typescript
import { getEvents } from '@/lib/janagana'

export default async function EventsPage() {
  const { events } = await getEvents()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Upcoming Events</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {events.map((event: any) => (
            <div key={event.id} className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
              <p className="text-gray-600 mt-2">{event.description}</p>
              <p className="text-purple-600 mt-4">
                📅 {new Date(event.startDate).toLocaleDateString()}
              </p>
              <button className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Register Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

## Admin Workflow

### Daily Admin Tasks (in JanaGana Dashboard)

1. **Check New Members**
   - Go to Dashboard → Members
   - Review new signups from TPW
   - View their CRM profiles (auto-created)

2. **Manage Events**
   - Go to Dashboard → Events
   - Create new events
   - View registrations
   - Track attendance

3. **CRM Activities**
   - Go to Dashboard → CRM
   - View contacts (synced from members)
   - Log calls/emails/meetings
   - Manage deals and pipeline
   - Assign tasks to team

4. **Reports**
   - View member growth
   - Event attendance
   - Donation tracking
   - Volunteer hours

## Applying to Other Websites (Vidhyabharti, Icon)

### For Each Website:

1. **Create Organization in JanaGana**
   - Sign in as admin
   - Create new organization (e.g., "Vidhyabharti")
   - Note the organization slug

2. **Generate API Key**
   - Run: `npx tsx scripts/generate-api-keys.ts`
   - Copy the API key for the new organization

3. **Add Configuration to Website**
   - Add `JANAGANA_API_URL` and `JANAGANA_API_KEY` to `.env.local`
   - Copy the JanaGana API client code
   - Integrate member creation on signup
   - Add events display and registration

4. **Customize Integration**
   - Adjust member data fields as needed
   - Customize event display
   - Add website-specific features

### Reusable Template

The integration pattern is the same for all websites:
1. Add JanaGana API client
2. Call `createMember()` on user signup
3. Display events from JanaGana API
4. Handle event registrations via JanaGana API
5. Admin manages everything in JanaGana dashboard

## Summary

**JanaGana** = Backend service (CRM, Memberships, Events)
**TPW/Vidhyabharti/Icon** = Frontend websites (Auth, Content, Display)

**Flow:**
1. User signs up on website → Member created in JanaGana
2. Admin creates event in JanaGana → Event displayed on website
3. User registers on website → Registration in JanaGana
4. Admin tracks everything in JanaGana dashboard

**Benefits:**
- Single backend for all your non-profits
- Consistent CRM and membership management
- Centralized event management
- Easy to add new websites
- No duplicate databases
- Unified reporting and analytics

## Next Steps

1. Implement the code changes in TPW
2. Test the signup flow
3. Create a test event in JanaGana
4. Test event registration on TPW
5. Apply the same pattern to Vidhyabharti and Icon
