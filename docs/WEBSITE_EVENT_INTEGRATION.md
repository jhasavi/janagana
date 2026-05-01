# JanaGana Website Event Integration Guide

## Overview

This guide explains how to integrate JanaGana events into your website with customizable, branded event displays. We offer two approaches:

1. **Simple Widget** - Quick setup with basic styling
2. **Custom Branded Rendering** - Full control over design and user experience

## Quick Start

### Option 1: Simple Widget (5 minutes)

Add this HTML snippet to any page:

```html
<div id="janagana-events"></div>
<script src="https://janagana.namasteneedham.com/embed/widget.js"></script>
<script>
  Janagana.events('janagana-events', {
    tenantSlug: 'your-organization-slug',
    title: 'Upcoming Events'
  });
</script>
```

### Option 2: Custom Branded Rendering (15 minutes)

For Next.js/React applications:

```bash
npm install @janagana/event-integration
```

```tsx
import { createJanaGanaEventClient, createEventConfig } from '@janagana/event-integration'

// Configure your event display
const config = createEventConfig('your-organization-slug')
  .withTheme('purple')           // Choose from preset themes
  .withMaxItems(12)             // Limit number of events
  .withFeaturedEvent(true)      // Show featured event
  .withImages(true)             // Show event images
  .withCalendarLinks(true)      // Add calendar integration
  .build()

// Create client
const client = createJanaGanaEventClient(config)

// Use in your component
export default async function EventsPage() {
  const { upcoming, past } = await client.fetchAllEvents()
  
  return (
    <div>
      {/* Render your custom event cards */}
      {upcoming.map(event => (
        <EventCard key={event.id} event={event} config={config} />
      ))}
    </div>
  )
}
```

## Configuration Options

### Basic Configuration

```typescript
const config = {
  tenantSlug: 'your-organization-slug',  // Required
  maxItems: 12,                          // Maximum events to show
  showImages: true,                      // Show event cover images
  showSpeaker: true,                     // Show speaker information
  showAttendance: true,                  // Show attendance for past events
  showDescription: true,                  // Show event descriptions
  showCalendarLinks: true,               // Add "Add to Calendar" buttons
  showRegisterButton: true,               // Show registration buttons
  showDetailsButton: true,               // Show details buttons
}
```

### Advanced Configuration

```typescript
const config = {
  // Event filtering
  upcomingOnly: false,                   // Show only upcoming events
  pastEventsMaxItems: 24,                // Limit past events
  featuredEvent: true,                   // Show featured event
  excludeCompleted: false,               // Exclude completed events

  // Card styling
  cardVariant: 'detailed',               // 'compact' | 'detailed' | 'featured' | 'minimal'
  cardSize: 'medium',                    // 'small' | 'medium' | 'large'
  imageAspectRatio: 'landscape',         // 'square' | 'landscape' | 'portrait'

  // Theme customization
  theme: 'purple',                       // Preset theme or custom object
  customColors: {
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#10b981',
  },

  // Layout options
  gridColumns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 4,
  },
  spacing: 'normal',                     // 'tight' | 'normal' | 'loose'

  // Behavior options
  openInNewTab: true,                    // Open links in new tabs
  lazyLoadImages: true,                  // Lazy load images for performance
  animateOnHover: true,                  // Hover animations
  showLoadingState: true,               // Show loading states
}
```

## Preset Themes

We provide several preset themes for quick branding:

### Purple Theme (Default)
- Primary: Purple (#7c3aed)
- Professional, educational feel
- Perfect for non-profits and educational institutions

### Blue Theme
- Primary: Blue (#2563eb)
- Corporate, professional feel
- Great for businesses and professional services

### Green Theme
- Primary: Green (#059669)
- Natural, organic feel
- Ideal for environmental and community organizations

### Neutral Theme
- Primary: Gray (#374151)
- Clean, minimalist feel
- Works with any brand

## Custom Theme Creation

```typescript
const customTheme = {
  name: 'My Brand',
  primaryColor: '#FF6B6B',
  secondaryColor: '#4ECDC4',
  accentColor: '#45B7D1',
  backgroundColor: '#F8F9FA',
  textColor: '#2C3E50',
  borderColor: '#DEE2E6',
}

const config = createEventConfig('my-org')
  .withTheme(customTheme)
  .build()
```

## Event Data Structure

Each event includes the following data:

```typescript
interface JanaGanaEvent {
  id: string
  title: string
  shortSummary: string | null
  description: string | null
  startDate: string
  endDate: string | null
  location: string | null
  coverImageUrl: string | null
  speakerName: string | null
  attendeeCount: number | null
  tags: string[]
  format: 'IN_PERSON' | 'VIRTUAL' | 'HYBRID'
  priceCents: number
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'COMPLETED'
  virtualLink: string | null
  isVirtual: boolean
  detailsUrl: string
  registrationUrl: string | null
  portalUrl: string
}
```

## API Endpoints

### Upcoming Events
```
GET /api/embed/events?tenantSlug={slug}&maxItems={number}
```

### Past Events
```
GET /api/embed/past-events?tenantSlug={slug}&maxItems={number}
```

Both endpoints return:
```json
{
  "success": true,
  "data": [/* array of events */]
}
```

## Integration Examples

### React/Next.js Example

```tsx
import { createJanaGanaEventClient, createEventConfig } from '@janagana/event-integration'

function EventCard({ event, config }) {
  const client = createJanaGanaEventClient(config)
  const eventData = client.getEventDisplayData(event)
  
  return (
    <div className="event-card" style={{ '--janagana-primary': config.theme.primaryColor }}>
      {eventData.hasImage && (
        <img src={event.coverImageUrl} alt={event.title} loading="lazy" />
      )}
      
      <h3>{event.title}</h3>
      
      {eventData.showDescription && (
        <p>{event.shortSummary || event.description}</p>
      )}
      
      <div className="event-meta">
        <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
        <span>📍 {event.location || 'Virtual'}</span>
        {eventData.showSpeaker && <span>👤 {event.speakerName}</span>}
      </div>
      
      <div className="event-actions">
        {eventData.showRegisterButton && (
          <a href={client.getRegistrationUrl(event)} className="btn-register">
            Register
          </a>
        )}
        
        {eventData.showCalendarLinks && (
          <a href={client.generateCalendarUrl(event)} className="btn-calendar">
            Add to Calendar
          </a>
        )}
      </div>
    </div>
  )
}

export default async function EventsPage() {
  const config = createEventConfig('my-organization')
    .withTheme('purple')
    .withMaxItems(12)
    .withFeaturedEvent(true)
    .build()

  const client = createJanaGanaEventClient(config)
  const { upcoming, past } = await client.fetchAllEvents()
  const featuredEvent = await client.getFeaturedEvent()

  return (
    <div>
      <style>{client.generateThemeCSS()}</style>
      
      {featuredEvent && (
        <section className="featured-event">
          <EventCard event={featuredEvent} config={config} variant="featured" />
        </section>
      )}
      
      <section className="upcoming-events">
        <h2>Upcoming Events</h2>
        <div className={client.getGridClasses()}>
          {upcoming.map(event => (
            <EventCard key={event.id} event={event} config={config} />
          ))}
        </div>
      </section>
      
      <section className="past-events">
        <h2>Past Events</h2>
        <div className={client.getGridClasses()}>
          {past.map(event => (
            <EventCard key={event.id} event={event} config={config} variant="past" />
          ))}
        </div>
      </section>
    </div>
  )
}
```

### Vanilla JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Our Events</title>
  <style>
    /* CSS variables will be injected by the client */
    .event-card {
      border: 1px solid var(--janagana-border);
      border-radius: 8px;
      padding: 16px;
      background: var(--janagana-background);
    }
    .event-title {
      color: var(--janagana-text);
      font-weight: bold;
    }
    .btn-register {
      background: var(--janagana-primary);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div id="events-container"></div>
  
  <script type="module">
    import { createJanaGanaEventClient, createEventConfig } from '@janagana/event-integration'
    
    const config = createEventConfig('my-organization')
      .withTheme('purple')
      .withMaxItems(12)
      .build()
    
    const client = createJanaGanaEventClient(config)
    
    async function renderEvents() {
      const { upcoming, past } = await client.fetchAllEvents()
      const container = document.getElementById('events-container')
      
      // Inject theme CSS
      const style = document.createElement('style')
      style.textContent = client.generateThemeCSS()
      document.head.appendChild(style)
      
      // Render events
      const eventsHtml = `
        <div class="upcoming-events">
          <h2>Upcoming Events</h2>
          <div class="${client.getGridClasses()}">
            ${upcoming.map(event => createEventCardHtml(event, config)).join('')}
          </div>
        </div>
        <div class="past-events">
          <h2>Past Events</h2>
          <div class="${client.getGridClasses()}">
            ${past.map(event => createEventCardHtml(event, config)).join('')}
          </div>
        </div>
      `
      
      container.innerHTML = eventsHtml
    }
    
    function createEventCardHtml(event, config) {
      const client = createJanaGanaEventClient(config)
      const eventData = client.getEventDisplayData(event)
      
      return `
        <div class="event-card">
          ${eventData.hasImage ? `<img src="${event.coverImageUrl}" alt="${event.title}" loading="lazy">` : ''}
          <h3 class="event-title">${event.title}</h3>
          ${eventData.showDescription ? `<p>${event.shortSummary || event.description}</p>` : ''}
          <div class="event-meta">
            <span>📅 ${new Date(event.startDate).toLocaleDateString()}</span>
            <span>📍 ${event.location || 'Virtual'}</span>
            ${eventData.showSpeaker ? `<span>👤 ${event.speakerName}</span>` : ''}
          </div>
          <div class="event-actions">
            ${eventData.showRegisterButton ? `<a href="${client.getRegistrationUrl(event)}" class="btn-register">Register</a>` : ''}
            ${eventData.showCalendarLinks ? `<a href="${client.generateCalendarUrl(event)}" class="btn-calendar">Add to Calendar</a>` : ''}
          </div>
        </div>
      `
    }
    
    renderEvents()
  </script>
</body>
</html>
```

## Required Event Fields for Premium Display

For the best user experience, ensure your events in JanaGana include:

### Required Fields
- `title` - Event name
- `startDate` - Event date and time
- `status` - Set to 'PUBLISHED' for upcoming events

### Recommended Fields
- `shortSummary` - Brief description (180 chars max)
- `description` - Full event description
- `coverImageUrl` - Event cover image
- `speakerName` - Speaker/presenter name
- `location` - Physical location or "Virtual"
- `tags` - Event categories/topics
- `priceCents` - 0 for free events

### Optional Fields
- `endDate` - Event end time
- `virtualLink` - Virtual meeting link
- `attendeeCount` - Number of attendees (for past events)
- `format` - 'IN_PERSON', 'VIRTUAL', or 'HYBRID'

## Performance Optimization

### Caching
- API responses are cached automatically (5 minutes for upcoming, 10 minutes for past)
- Images are lazy-loaded by default
- Use `next: { revalidate: 300 }` in Next.js for optimal caching

### Best Practices
- Limit `maxItems` to reasonable numbers (12-24)
- Enable image lazy loading
- Use appropriate image sizes
- Consider using a CDN for images

## Troubleshooting

### Common Issues

**Events not showing:**
- Verify `tenantSlug` is correct
- Check that events have `status: 'PUBLISHED'`
- Ensure `startDate` is in the future for upcoming events
- Check browser console for API errors

**Images not loading:**
- Verify `coverImageUrl` is accessible
- Check image format (JPG, PNG, WebP recommended)
- Ensure images are hosted on HTTPS

**Styling issues:**
- Inject theme CSS using `client.generateThemeCSS()`
- Verify CSS variables are being applied
- Check for CSS conflicts

### Debug Mode

Enable debug logging:

```typescript
const config = createEventConfig('my-org')
  .withDebugMode(true)  // Enable console logging
  .build()
```

## Support

- **Documentation**: https://docs.janagana.org
- **API Reference**: https://api.janagana.org/docs
- **Community Forum**: https://community.janagana.org
- **Email Support**: support@janagana.org

## Migration Guide

### From Widget to Custom Rendering

1. Install the integration package
2. Create configuration object
3. Replace widget HTML with custom component
4. Add theme CSS
5. Test functionality

### From Hard-coded Events

1. Export existing event data to CSV
2. Import into JanaGana using migration script
3. Update website to use JanaGana API
4. Remove hard-coded event data
5. Test and verify functionality

---

**Ready to integrate JanaGana events into your website?** Choose your approach above and follow the getting started guide!
