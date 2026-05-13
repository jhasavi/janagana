# JanaGana Integration Guide

**Platform:** JanaGana  
**Production URL:** https://janagana.namasteneedham.com  
**Plugin API base:** `https://janagana.namasteneedham.com/api/plugin`

This is the single integration reference for any external website or app connecting to JanaGana. It covers authentication, all available API endpoints, embed widgets, and framework examples.

---

## 1. Before You Start

### What you need

| Item | Where to get it |
|------|-----------------|
| JanaGana API key | Dashboard → Settings → API Keys → Generate |
| Your tenant slug | Dashboard → Settings → Organization |
| Production API URL | `https://janagana.namasteneedham.com/api/plugin` |

### Generate an API key

1. Sign in at [janagana.namasteneedham.com](https://janagana.namasteneedham.com)
2. Go to **Settings → API Keys**
3. Click **Generate New API Key**, give it a descriptive name (e.g. `Website Integration`)
4. Select permissions needed (see table in section 2)
5. Copy the key immediately — it is shown only once

### Verify your key works

```bash
curl -H "x-api-key: YOUR_KEY_HERE" \
  https://janagana.namasteneedham.com/api/plugin/health
```

Expected response:
```json
{
  "ok": true,
  "tenant": { "id": "...", "name": "The Purple Wings", "slug": "the-purple-wings" },
  "apiBase": "https://janagana.namasteneedham.com/api/plugin",
  "timestamp": "2026-05-13T00:00:00Z"
}
```

A `401` means the key is wrong or revoked. A `403` means the key lacks the required permission.

---

## 2. Authentication

All plugin API requests require one of:

```http
x-api-key: jg_live_xxxxxxxxxx
```

or

```http
Authorization: Bearer jg_live_xxxxxxxxxx
```

### API key permissions

| Permission | What it allows |
|-----------|---------------|
| `events:read` | List and fetch events |
| `events:write` | Create/update events |
| `members:read` | Read member records |
| `members:write` | Create/update members |
| `crm:read` | Read contacts, companies, deals, activities |
| `crm:write` | Create/update CRM records |

---

## 3. Events API

### List published events

```
GET /api/plugin/events
GET /api/plugin/events?status=PUBLISHED
```

Query params: `status` — one of `PUBLISHED`, `DRAFT`, `CANCELED`, `COMPLETED` (default: `PUBLISHED`)

Response:
```json
{
  "events": [
    {
      "id": "evt_xxx",
      "title": "Spring Gala",
      "description": "Annual fundraiser dinner",
      "startDate": "2026-06-15T18:00:00Z",
      "endDate": "2026-06-15T22:00:00Z",
      "location": "Community Hall, 123 Main St",
      "isVirtual": false,
      "virtualUrl": null,
      "capacity": 100,
      "price": 50.00,
      "status": "PUBLISHED"
    }
  ]
}
```

### Register someone for an event

```
POST /api/plugin/event-registrations
```

Body:
```json
{
  "eventId": "evt_xxx",
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+16175551234"
}
```

Response (`201`):
```json
{
  "id": "reg_xxx",
  "status": "CONFIRMED",
  "event": { "title": "Spring Gala", "startDate": "..." },
  "member": { "email": "jane@example.com" }
}
```

Errors: `409` if already registered or event is at capacity, `404` if event not found.

### List registrations for an event

```
GET /api/plugin/event-registrations?eventId=evt_xxx
```

Response:
```json
{
  "registrations": [
    {
      "id": "reg_xxx",
      "status": "CONFIRMED",
      "member": { "id": "...", "firstName": "Jane", "lastName": "Doe", "email": "..." },
      "event": { "id": "...", "title": "Spring Gala", "startDate": "..." }
    }
  ]
}
```

---

## 4. CRM API

### Contacts

#### List contacts

```
GET /api/plugin/crm/contacts
GET /api/plugin/crm/contacts?search=jane&page=1&limit=50
```

Query params: `search`, `page`, `limit`, `companyId`

Response:
```json
{
  "contacts": [
    {
      "id": "con_xxx",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "phone": "+16175551234",
      "jobTitle": "Director",
      "company": { "id": "...", "name": "Acme Corp" },
      "source": "website",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 14, "totalPages": 1 }
}
```

#### Create contact

```
POST /api/plugin/crm/contacts
```

Body:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+16175551234",
  "jobTitle": "Director",
  "source": "website",
  "notes": "Signed up via contact form"
}
```

### Companies

```
GET  /api/plugin/crm/companies
POST /api/plugin/crm/companies
```

### Activities (calls, emails, meetings, notes)

```
GET  /api/plugin/crm/activities?contactId=con_xxx
POST /api/plugin/crm/activities
```

Body for POST:
```json
{
  "contactId": "con_xxx",
  "type": "NOTE",
  "subject": "Follow-up after event",
  "description": "Interested in sponsorship"
}
```

Activity types: `CALL`, `EMAIL`, `MEETING`, `NOTE`, `TASK`

### Deals

```
GET  /api/plugin/crm/deals
POST /api/plugin/crm/deals
```

### Tasks

```
GET  /api/plugin/crm/tasks
POST /api/plugin/crm/tasks
```

---

## 5. Embed Widgets (No-code option)

For websites that don't need a full API integration, JanaGana provides JavaScript embed widgets.

### Step 1 — Add the embed script

Add to your page `<head>` or before closing `</body>`:

```html
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  Janagana.init({
    tenantSlug: 'your-tenant-slug',
    apiUrl: 'https://janagana.namasteneedham.com'
  });
</script>
```

### Step 2 — Add widget containers and initialize

#### Events widget

```html
<div id="jg-events"></div>
<script>
  Janagana.events('jg-events', {
    title: 'Upcoming Events',
    maxItems: 6,
    showDetails: true,
    showCalendar: true,
    emptyStateText: 'No events scheduled yet. Check back soon.'
  });
</script>
```

Supported events widget options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | `'Upcoming Events'` | Widget heading |
| `maxItems` | number | `10` | Maximum events to show |
| `showDetails` | boolean | `true` | Show details button |
| `showCalendar` | boolean | `true` | Show add-to-calendar button |
| `emptyStateText` | string | — | Text when no events |
| `onEventAction` | function | — | Callback for widget interactions |

#### Newsletter / contact capture widget

```html
<div id="jg-newsletter"></div>
<script>
  Janagana.newsletter('jg-newsletter', {
    title: 'Stay Connected',
    description: 'Get updates on upcoming events and news.'
  });
</script>
```

#### Member portal login button

```html
<div id="jg-login"></div>
<script>
  Janagana.memberLogin('jg-login', {
    label: 'Member Login'
  });
</script>
```

---

## 6. Framework Integration Examples

### Next.js (App Router)

```tsx
// app/layout.tsx — load embed script globally
import Script from 'next/script'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Script src="https://janagana.namasteneedham.com/janagana-embed.js" strategy="afterInteractive" />
        <Script id="jg-init" strategy="afterInteractive">{`
          if (window.Janagana) {
            Janagana.init({ tenantSlug: '${process.env.NEXT_PUBLIC_JANAGANA_TENANT_SLUG}', apiUrl: 'https://janagana.namasteneedham.com' });
          }
        `}</Script>
      </body>
    </html>
  )
}
```

```tsx
// components/EventsWidget.tsx — reusable widget component
'use client'
import { useEffect, useRef } from 'react'

export function EventsWidget({ title }: { title?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).Janagana && ref.current) {
        clearInterval(interval);
        (window as any).Janagana.events(ref.current.id, { title })
      }
    }, 100)
    const timeout = setTimeout(() => clearInterval(interval), 5000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [title])

  return <div id="jg-events-widget" ref={ref} />
}
```

```tsx
// Server-side data fetch example
async function getEvents() {
  const res = await fetch(`${process.env.JANAGANA_API_URL}/events`, {
    headers: { 'x-api-key': process.env.JANAGANA_API_KEY! },
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}
```

Required `.env.local` variables:
```env
JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
JANAGANA_API_KEY=jg_live_your_key_here
NEXT_PUBLIC_JANAGANA_TENANT_SLUG=your-tenant-slug
```

### WordPress

Install the JanaGana WordPress Plugin or add to `functions.php`:

```php
function janagana_enqueue_scripts() {
    wp_enqueue_script(
        'janagana-embed',
        'https://janagana.namasteneedham.com/janagana-embed.js',
        [],
        null,
        true
    );
    wp_add_inline_script('janagana-embed', "
        Janagana.init({
            tenantSlug: '" . get_option('janagana_tenant_slug') . "',
            apiUrl: 'https://janagana.namasteneedham.com'
        });
    ");
}
add_action('wp_enqueue_scripts', 'janagana_enqueue_scripts');
```

Shortcode example for events:
```php
function janagana_events_shortcode($atts) {
    $atts = shortcode_atts(['title' => 'Upcoming Events', 'max' => 6], $atts);
    return '<div id="jg-events"></div>
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        if (window.Janagana) {
          Janagana.events("jg-events", { title: "' . esc_js($atts['title']) . '", maxItems: ' . intval($atts['max']) . ' });
        }
      });
    </script>';
}
add_shortcode('janagana_events', 'janagana_events_shortcode');
```

Use as: `[janagana_events title="Our Events" max="4"]`

### Wix

In Wix Editor → Add → Embed → HTML Code:

```html
<div id="jg-events"></div>
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  Janagana.init({ tenantSlug: 'YOUR_SLUG', apiUrl: 'https://janagana.namasteneedham.com' });
  Janagana.events('jg-events', { title: 'Upcoming Events' });
</script>
```

### Squarespace

In Squarespace → Pages → Edit → Add Block → Code:

```html
<div id="jg-newsletter"></div>
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  Janagana.init({ tenantSlug: 'YOUR_SLUG', apiUrl: 'https://janagana.namasteneedham.com' });
  Janagana.newsletter('jg-newsletter', { title: 'Subscribe' });
</script>
```

---

## 7. Webhooks

JanaGana can POST events to your server when things happen (member joins, event registration, etc.).

Configure in: **Dashboard → Settings → Webhooks**

Payload format:
```json
{
  "event": "member.created",
  "tenantId": "...",
  "timestamp": "2026-05-13T00:00:00Z",
  "data": { ... }
}
```

Available events: `member.created`, `member.updated`, `event.created`, `event_registration.created`, `contact.created`

Verify signature (recommended):
```js
const crypto = require('crypto')
const sig = req.headers['x-janagana-signature']
const expected = crypto.createHmac('sha256', process.env.JANAGANA_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body)).digest('hex')
if (sig !== `sha256=${expected}`) return res.status(401).end()
```

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` | Missing or wrong API key | Check key is active in Dashboard → Settings → API Keys |
| `403 Forbidden` | Key lacks permission | Regenerate key with needed permissions |
| `404 Not Found` | Wrong endpoint or event doesn't exist | Verify endpoint path and tenant slug |
| `409 Conflict` | Already registered or event at capacity | Handle in your UI; check event capacity |
| Embed widget not loading | Script blocked or slug wrong | Check browser console; verify `tenantSlug` |
| Events widget shows empty | No published events | Create and publish at least one event in Dashboard |

---

## 9. Quick Reference

```bash
# Health check
curl -H "x-api-key: KEY" https://janagana.namasteneedham.com/api/plugin/health

# List events
curl -H "x-api-key: KEY" https://janagana.namasteneedham.com/api/plugin/events

# List registrations for an event
curl -H "x-api-key: KEY" "https://janagana.namasteneedham.com/api/plugin/event-registrations?eventId=EVENT_ID"

# Register for event
curl -X POST -H "x-api-key: KEY" -H "Content-Type: application/json" \
  -d '{"eventId":"EVENT_ID","email":"user@example.com","firstName":"Jane","lastName":"Doe"}' \
  https://janagana.namasteneedham.com/api/plugin/event-registrations

# List CRM contacts
curl -H "x-api-key: KEY" https://janagana.namasteneedham.com/api/plugin/crm/contacts

# Create CRM contact
curl -X POST -H "x-api-key: KEY" -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","source":"website"}' \
  https://janagana.namasteneedham.com/api/plugin/crm/contacts
```

---

*Questions? Contact support@janagana.app*
