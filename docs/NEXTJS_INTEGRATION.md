# Next.js Integration Guide

This guide shows you how to integrate JanaGana into a Next.js website.

## Quick Start (3 Steps)

### Step 1: Add the Script to Your Layout

Add the JanaGana script to your root layout file (`app/layout.tsx` or `pages/_document.tsx`):

```tsx
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <Script
          src="https://janagana.namasteneedham.com/janagana-embed.js"
          strategy="afterInteractive"
        />
        <Script id="janagana-init" strategy="afterInteractive">
          {`
            Janagana.init({
              tenantSlug: 'your-org-slug',
              apiUrl: 'https://janagana.namasteneedham.com'
            });
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Step 2: Create a Widget Component

Create a component for the widget you want to use:

```tsx
// components/NewsletterWidget.tsx
'use client'

import { useEffect } from 'react'

export function NewsletterWidget() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Janagana) {
      window.Janagana.newsletter('newsletter-widget', {
        title: 'Subscribe to our newsletter',
        description: 'Get updates delivered to your inbox'
      })
    }
  }, [])

  return <div id="newsletter-widget" />
}
```

### Step 3: Use the Widget in Your Page

```tsx
// app/page.tsx
import { NewsletterWidget } from '@/components/NewsletterWidget'

export default function Home() {
  return (
    <main>
      <h1>Welcome</h1>
      <NewsletterWidget />
    </main>
  )
}
```

## Widget Components

### Newsletter Widget

```tsx
// components/NewsletterWidget.tsx
'use client'

import { useEffect } from 'react'

interface NewsletterWidgetProps {
  title?: string
  description?: string
}

export function NewsletterWidget({ title, description }: NewsletterWidgetProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Janagana) {
      window.Janagana.newsletter('newsletter-widget', {
        title: title || 'Subscribe to our newsletter',
        description: description || 'Get updates delivered to your inbox'
      })
    }
  }, [title, description])

  return <div id="newsletter-widget" />
}
```

**Usage:**
```tsx
<NewsletterWidget
  title="Stay Updated"
  description="Join our newsletter"
/>
```

### Events Widget

```tsx
// components/EventsWidget.tsx
'use client'

import { useEffect } from 'react'

interface EventsWidgetProps {
  title?: string
}

export function EventsWidget({ title }: EventsWidgetProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Janagana) {
      window.Janagana.events('events-widget', {
        title: title || 'Upcoming Events'
      })
    }
  }, [title])

  return <div id="events-widget" />
}
```

**Usage:**
```tsx
<EventsWidget title="Our Events" />
```

### Course Widget

```tsx
// components/CourseWidget.tsx
'use client'

import { useEffect } from 'react'

interface CourseWidgetProps {
  title?: string
  description?: string
  courseId?: string
}

export function CourseWidget({ title, description, courseId }: CourseWidgetProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Janagana) {
      window.Janagana.course('course-widget', {
        title: title || 'Enroll in Our Course',
        description: description || 'Enter your details to get started',
        courseId
      })
    }
  }, [title, description, courseId])

  return <div id="course-widget" />
}
```

**Usage:**
```tsx
<CourseWidget
  title="Course Enrollment"
  description="Sign up for our course"
  courseId="course-123"
/>
```

### Login Widget

```tsx
// components/LoginWidget.tsx
'use client'

import { useEffect } from 'react'

interface LoginWidgetProps {
  title?: string
}

export function LoginWidget({ title }: LoginWidgetProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Janagana) {
      window.Janagana.login('login-widget', {
        title: title || 'Member Login'
      })
    }
  }, [title])

  return <div id="login-widget" />
}
```

**Usage:**
```tsx
<LoginWidget title="Sign In" />
```

## Type Definitions

Add this to your `types/janagana.d.ts` file to get TypeScript support:

```typescript
declare global {
  interface Window {
    Janagana: {
      init: (options: { tenantSlug: string; apiUrl?: string; debug?: boolean }) => void
      newsletter: (containerId: string, options?: { title?: string; description?: string }) => void
      events: (containerId: string, options?: { title?: string }) => void
      course: (containerId: string, options?: { title?: string; description?: string; courseId?: string }) => void
      login: (containerId: string, options?: { title?: string }) => void
    }
  }
}

export {}
```

## Environment Variables

Store your configuration in environment variables:

```env
# .env.local
NEXT_PUBLIC_JANAGANA_TENANT_SLUG=your-org-slug
NEXT_PUBLIC_JANAGANA_API_URL=https://janagana.namasteneedham.com
```

**Usage in layout:**
```tsx
<Script id="janagana-init" strategy="afterInteractive">
  {`
    Janagana.init({
      tenantSlug: '${process.env.NEXT_PUBLIC_JANAGANA_TENANT_SLUG}',
      apiUrl: '${process.env.NEXT_PUBLIC_JANAGANA_API_URL}'
    });
  `}
</Script>
```

## Styling

The widgets come with default styles. To customize, add CSS:

```css
/* globals.css */
.janagana-newsletter-widget button {
  background: #your-color !important;
}

.janagana-events-widget .register-btn {
  background: #your-color !important;
}
```

Or use Tailwind CSS in your component:

```tsx
<div id="newsletter-widget" className="my-4" />
```

## Multiple Widgets

You can use multiple widgets on the same page with different container IDs:

```tsx
export default function Page() {
  return (
    <div>
      <NewsletterWidget />
      <EventsWidget />
      <LoginWidget />
    </div>
  )
}
```

Just make sure each widget component uses a unique container ID:

```tsx
// components/NewsletterWidget.tsx
return <div id="newsletter-widget" />

// components/EventsWidget.tsx
return <div id="events-widget" />

// components/LoginWidget.tsx
return <div id="login-widget" />
```

## Troubleshooting

### Widget Not Showing

**Check:**
1. Is the script loaded? Check browser console for errors
2. Is `window.Janagana` available? Add `console.log(window.Janagana)` in useEffect
3. Is the container ID unique?
4. Is the tenant slug correct?

### TypeScript Errors

**Add type definitions** (see Type Definitions section above)

### Script Not Loading

**Check:**
1. Is the URL correct? `https://janagana.namasteneedham.com/janagana-embed.js`
2. Is there a CORS error? The script should load from any domain
3. Is Next.js blocking external scripts? Use `strategy="afterInteractive"`

## Example: Complete Page

```tsx
// app/page.tsx
import { NewsletterWidget } from '@/components/NewsletterWidget'
import { EventsWidget } from '@/components/EventsWidget'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <section>
          <h1 className="text-4xl font-bold mb-4">Welcome</h1>
          <p className="text-lg text-muted-foreground">
            Stay updated with our latest news
          </p>
          <NewsletterWidget
            title="Subscribe to Newsletter"
            description="Get weekly updates"
          />
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-4">Upcoming Events</h2>
          <EventsWidget title="Our Events" />
        </section>
      </div>
    </main>
  )
}
```

## Next Steps

1. Add the script to your layout
2. Create widget components
3. Add widgets to your pages
4. Test by subscribing yourself
5. Check JanaGana CRM to verify leads are captured

## Support

For help:
- Check the main integration guide
- Enable debug mode: `Janagana.init({ debug: true })`
- Contact support at support@janagana.com
