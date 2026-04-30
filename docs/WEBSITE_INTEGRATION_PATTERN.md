# Website Integration Pattern

This guide describes the complete integration pattern for adding JanaGana to an existing website with data preservation. This pattern was successfully implemented for The Purple Wings and can be adapted for any website.

## Overview

The integration pattern consists of three phases:
1. **Frontend Widget Integration** - Add JanaGana widgets to your site
2. **Backend API Sync** - Sync existing forms to JanaGana CRM
3. **Data Migration** - Migrate historical data to JanaGana

## Phase 1: Frontend Widget Integration

### Step 1.1: Add JanaGana Script to Layout

Add the embed script and initialization to your site's layout:

```tsx
// app/layout.tsx (Next.js) or equivalent
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://janagana.namasteneedham.com/janagana-embed.js"
          strategy="afterInteractive"
        />
        <Script id="janagana-init" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && window.Janagana) {
              Janagana.init({
                tenantSlug: 'your-tenant-slug',
                apiUrl: 'https://janagana.namasteneedham.com'
              });
            }
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Step 1.2: Create Widget Components

Create reusable widget components for each JanaGana feature. **Important:** Use `useRef` to ensure the container exists before calling the widget:

```tsx
// components/JanaganaNewsletter.tsx
'use client'

import { useEffect, useRef } from 'react'

interface JanaganaNewsletterProps {
  title?: string
  description?: string
}

export function JanaganaNewsletter({ title, description }: JanaganaNewsletterProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Janagana && containerRef.current) {
        clearInterval(checkInterval)
        window.Janagana.newsletter('janagana-newsletter', {
          title: title || 'Subscribe to our newsletter',
          description: description || 'Get updates on upcoming events and financial tips'
        })
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      console.error('JanaGana script failed to load or container not found')
    }, 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [title, description])

  return <div id="janagana-newsletter" ref={containerRef} />
}
```

```tsx
// src/components/JanaganaEvents.tsx
'use client'

import { useEffect, useRef } from 'react'

export function JanaganaEvents({ title }: { title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Wait for both Janagana script and container to be ready
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Janagana && containerRef.current) {
        clearInterval(checkInterval)
        window.Janagana.events('janagana-events', { title })
      }
    }, 100)

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      console.error('JanaGana script failed to load or container not found')
    }, 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [title])

  return <div id="janagana-events" ref={containerRef} />
}
```

```tsx
// components/JanaganaLogin.tsx
'use client'

import { useEffect, useRef } from 'react'

interface JanaganaLoginProps {
  title?: string
}

export function JanaganaLogin({ title }: JanaganaLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.Janagana && containerRef.current) {
        clearInterval(checkInterval)
        window.Janagana.login('janagana-login', {
          title: title || 'Member Portal'
        })
      }
    }, 100)

    const timeout = setTimeout(() => {
      clearInterval(checkInterval)
      console.error('JanaGana script failed to load or container not found')
    }, 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(timeout)
    }
  }, [title])

  return <div id="janagana-login" ref={containerRef} />
}
```

### Step 1.3: Add TypeScript Definitions

Create type definitions for the JanaGana global object:

```typescript
// types/janagana.d.ts
declare global {
  interface Window {
    Janagana: {
      init: (options: { tenantSlug: string; apiUrl?: string; debug?: boolean }) => void
      newsletter: (containerId: string, options?: { title?: string; description?: string }) => void
      events: (containerId: string, options?: { title?: string }) => void
      login: (containerId: string, options?: { title?: string }) => void
    }
  }
}

export {}
```

### Step 1.4: Integrate Widgets into Pages

Replace existing forms with JanaGana widgets:

```tsx
// app/newsletter/subscribe/page.tsx
import { JanaganaNewsletter } from '@/components/JanaganaNewsletter'

export default function NewsletterPage() {
  return (
    <div>
      <h1>Subscribe to Our Newsletter</h1>
      <JanaganaNewsletter 
        title="Subscribe to Our Newsletter"
        description="Get weekly updates"
      />
    </div>
  )
}
```

```tsx
// app/events/page.tsx
import { JanaganaEvents } from '@/components/JanaganaEvents'

export default function EventsPage() {
  return (
    <div>
      <h1>Upcoming Events</h1>
      <JanaganaEvents title="Upcoming Events" />
      {/* Keep past events section for historical data */}
    </div>
  )
}
```

## Phase 2: Backend API Sync

### Step 2.1: Create JanaGana API Helper

Create a helper module for JanaGana API calls:

```typescript
// lib/janagana.ts
const API_URL = process.env.JANAGANA_API_URL || 'https://janagana.namasteneedham.com/api/plugin'
const API_KEY = process.env.JANAGANA_API_KEY

async function janaganaRequest(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('JANAGANA_API_KEY is not configured')
  }
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`JanaGana API error: ${error.error || response.statusText}`)
  }

  return response.json()
}

// Create a contact/member when user signs up
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
      source: 'your-website-name',
    }),
  })
}

// Register for an event
export async function registerForEvent(data: {
  eventId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
}) {
  return janaganaRequest('/event-registrations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

### Step 2.2: Update Environment Variables

Add JanaGana credentials to your environment:

```env
# .env.local
JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
JANAGANA_API_KEY=your-api-key-here
```

Get your API key from JanaGana dashboard → Settings → API Keys.

### Step 2.3: Sync Event Registration API

Add JanaGana sync to your existing event registration endpoint:

```typescript
// app/api/events/register/route.ts
import { registerForEvent } from '@/lib/janagana'

export async function POST(request: NextRequest) {
  // ... your existing validation and database insert ...
  
  // After successful database insert, sync to JanaGana (non-blocking)
  try {
    await registerForEvent({
      eventId: eventSlug,
      email,
      firstName: name.split(' ')[0] || '',
      lastName: name.split(' ').slice(1).join('') || ''
    })
  } catch (error) {
    console.error('JanaGana sync error:', error)
    // Don't fail the request if JanaGana sync fails
  }
  
  // ... continue with your existing response ...
}
```

### Step 2.4: Sync Newsletter API

Add JanaGana sync to your existing newsletter endpoint:

```typescript
// app/api/newsletter/subscribe/route.ts
import { createMember } from '@/lib/janagana'

export async function POST(request: NextRequest) {
  // ... your existing validation and database insert ...
  
  // After successful database insert, sync to JanaGana (non-blocking)
  try {
    await createMember({
      email,
      firstName: name?.split(' ')[0] || '',
      lastName: name?.split(' ').slice(1).join('') || ''
    })
  } catch (error) {
    console.error('JanaGana sync error:', error)
    // Don't fail the request if JanaGana sync fails
  }
  
  // ... continue with your existing response ...
}
```

## Phase 3: Data Migration

### Step 3.1: Create Migration Script

Create a script to migrate historical data:

```typescript
// scripts/migrate-to-janagana.ts
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js' // or your DB client

// Load environment variables from .env.local
config({ path: '.env.local' })

const API_URL = process.env.JANAGANA_API_URL
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
  if (!response.ok) throw new Error('JanaGana API error')
  return response.json()
}

async function migrateEventRegistrations() {
  // Fetch from your database
  const registrations = await fetchRegistrationsFromDB()
  
  for (const reg of registrations) {
    // Create contact
    await janaganaRequest('/crm/contacts', {
      method: 'POST',
      body: JSON.stringify({
        email: reg.email,
        firstName: reg.name.split(' ')[0],
        lastName: reg.name.split(' ').slice(1).join(''),
        source: 'migration'
      })
    })
    
    // Create activity
    await janaganaRequest('/crm/activities', {
      method: 'POST',
      body: JSON.stringify({
        type: 'EVENT_REGISTRATION',
        description: `Registered for: ${reg.eventTitle}`,
        date: reg.registeredAt,
        contactEmail: reg.email
      })
    })
  }
}

async function migrateNewsletterSubscribers() {
  const subscribers = await fetchSubscribersFromDB()
  
  for (const sub of subscribers) {
    await janaganaRequest('/crm/contacts', {
      method: 'POST',
      body: JSON.stringify({
        email: sub.email,
        firstName: sub.name?.split(' ')[0] || '',
        lastName: sub.name?.split(' ').slice(1).join('') || '',
        source: 'migration'
      })
    })
  }
}

// Run migrations
await migrateEventRegistrations()
await migrateNewsletterSubscribers()
```

### Step 3.2: Create Past Events in JanaGana Dashboard

1. Log into JanaGana dashboard
2. Go to Events
3. Create events for each past event with:
   - Title: Same as current
   - Date: Original event date
   - Status: COMPLETED
   - Description: Same as current
   - Location: Same as current

This preserves your event history in JanaGana.

### Step 3.3: Run Migration Script

```bash
# Update .env.local with JanaGana credentials
JANAGANA_API_KEY=your-key-here

# Run migration
npx tsx scripts/migrate-to-janagana.ts
```

## Data Preservation Strategy

**Key Principle:** Keep your existing database as primary, sync to JanaGana as secondary. This ensures no data loss during migration.

- **Existing Data:** Remains in your database, synced to JanaGana
- **New Data:** Goes to both systems (your DB + JanaGana)
- **Past Events:** Display from your DB, create in JanaGana as COMPLETED
- **Sync Errors:** Don't fail requests if JanaGana sync fails

## Testing Checklist

### Frontend Testing
- [ ] Newsletter widget appears and accepts email
- [ ] Events widget displays upcoming events
- [ ] Login button appears and redirects to portal
- [ ] Widgets load without console errors

### Backend Testing
- [ ] Newsletter subscription creates contact in JanaGana CRM
- [ ] Event registration creates activity in JanaGana CRM
- [ ] Sync errors don't block existing functionality
- [ ] API key authentication works

### Migration Testing
- [ ] Migration script runs without errors
- [ ] All past registrations appear in JanaGana
- [ ] All past subscribers appear in JanaGana
- [ ] Activity history is preserved

## Benefits

**Lead Capture:**
- All leads centralized in JanaGana CRM
- Track lead sources (newsletter, events, etc.)
- Activity history for each contact

**Event Management:**
- Events widget shows upcoming events from JanaGana
- Registrations sync to JanaGana activities
- Member portal for self-service registration

**Member Portal:**
- Members can view their event history
- Members can register for new events
- Members can update their profile

**CRM Features:**
- Track all interactions with leads
- See activity history per contact
- Segment by event attendance
- Export for marketing campaigns

## Troubleshooting

**Widget Not Showing:**
- Check that embed script is loaded
- Verify tenant slug is correct
- Check browser console for errors
- Ensure Janagana.init is called

**Sync Not Working:**
- Verify API key is correct
- Check API URL is correct
- Check console for sync errors
- Ensure API endpoint is accessible

**Migration Fails:**
- Check API credentials
- Verify data format matches
- Check for duplicate emails
- Run in batches if large dataset

## Next Steps

After completing this integration:

1. Create events in JanaGana dashboard for upcoming events
2. Set status to PUBLISHED
3. Configure member portal branding
4. Test member portal functionality
5. Roll out to production

## Support

For help with integration:
- Check the [Next.js Integration Guide](./NEXTJS_INTEGRATION.md)
- Check the [API Authentication Guide](./API_AUTHENTICATION.md)
- Contact support at support@janagana.com
