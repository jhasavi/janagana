# Squarespace Integration Guide

## Overview

This guide shows you how to integrate JanaGana widgets into your Squarespace site. You can display events, newsletter signup forms, and member portals directly on your Squarespace pages.

## Prerequisites

- A JanaGana organization account
- Your tenant slug (e.g., `purple-wings`)
- Squarespace admin access
- Ability to edit Squarespace site settings and pages

## Quick Start

### Step 1: Get Your Tenant Slug

1. Log in to your JanaGana dashboard
2. Go to Settings → Organization
3. Copy your tenant slug from the URL or settings page

### Step 2: Add the JanaGana Script

**Using Squarespace Settings:**

1. Log in to your Squarespace account
2. Go to "Settings" → "Advanced" → "Code Injection"
3. In the "Header" section, add this code:

```html
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  window.addEventListener('load', function() {
    Janagana.init({
      tenantSlug: 'your-tenant-slug',
      apiUrl: 'https://janagana.namasteneedham.com'
    });
  });
</script>
```

Replace `your-tenant-slug` with your actual tenant slug.

4. Click "Save"

### Step 3: Add Widgets to Pages

#### Newsletter Widget

1. Go to the page where you want the widget
2. Click "Edit" on the page
3. Add a "Code Block" from the content blocks
4. Paste this code:

```html
<div id="newsletter-widget"></div>
<script>
  Janagana.newsletter('newsletter-widget', {
    buttonText: 'Subscribe',
    placeholder: 'Enter your email',
    showDescription: true
  });
</script>
```

5. Click "Apply" and "Save"

#### Events Widget

1. Add another "Code Block" to the page
2. Paste this code:

```html
<div id="events-widget"></div>
<script>
  Janagana.events('events-widget', {
    maxEvents: 10,
    showDescription: true,
    showDate: true,
    registerButtonText: 'Register Now'
  });
</script>
```

#### Member Portal

1. Add another "Code Block" to the page
2. Paste this code:

```html
<div id="member-portal"></div>
<script>
  Janagana.portal('member-portal', {
    showLogin: true,
    showProfile: true,
    showEvents: true
  });
</script>
```

## Creating a Dedicated Events Page

1. In Squarespace, go to "Pages"
2. Click the "+" to add a new page
3. Select "Blank" or choose a template
4. Name the page "Events"
5. Add a "Code Block" with the events widget code
6. Style the page using Squarespace design tools
7. Add to your navigation menu

## Styling the Widgets

### Using Squarespace Design Tools

1. Click on the code block
2. Use the design panel to adjust:
   - Size and position
   - Background color
   - Padding and margins
   - Font settings

### Using Custom CSS

Add custom CSS to your Squarespace site:

1. Go to "Settings" → "Design" → "Custom CSS"
2. Add your custom styles:

```css
/* Newsletter widget styling */
#newsletter-widget .janagana-newsletter {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

/* Events widget styling */
#events-widget .janagana-event {
  border-bottom: 1px solid #eee;
  padding: 15px 0;
}

#events-widget .janagana-event:last-child {
  border-bottom: none;
}

/* Button styling */
.janagana-button {
  background: #000;
  color: #fff;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

3. Click "Save"

## Using Squarespace Developer Mode (Advanced)

For more control, enable Developer Mode:

### Step 1: Enable Developer Mode

1. Go to "Settings" → "Advanced" → "Developer Mode"
2. Click "Enable"
3. Note: This cannot be undone

### Step 2: Edit Template Files

1. Go to "Pages" → "Tools" → "Developer Tools" → "Edit Files"
2. Open `site.region` or page-specific templates
3. Add the embed script in the head section
4. Add widget code in the body where desired

### Step 3: Use JSON-T Templates

You can use Squarespace's JSON-T templating to conditionally show widgets:

```html
{.section collection}
  <div id="events-widget"></div>
  <script>
    Janagana.events('events-widget', {
      maxEvents: 10
    });
  </script>
{.end}
```

## Troubleshooting

### Widgets Not Showing

1. Check that the embed script is in Code Injection
2. Verify your tenant slug is correct
3. Check browser console for errors (F12 → Console)
4. Ensure the script loads before the widget code
5. Try refreshing the page

### Styling Issues

1. Use Squarespace design tools to adjust widget container
2. Add custom CSS in the Custom CSS section
3. Check for Squarespace theme CSS conflicts
4. Use !important in CSS if needed

### Events Not Displaying

1. Ensure events are published in JanaGana
2. Check that event dates are in the future
3. Verify the widget configuration (maxEvents, etc.)
4. Check the page is published in Squarespace

## Common Errors

**"Janagana is not defined"**
- The embed script isn't loading. Check the Code Injection settings.

**"Tenant not found"**
- Your tenant slug is incorrect. Double-check in JanaGana Settings.

**"No events to display"**
- Either no events exist or they're not published. Check your JanaGana dashboard.

**Widget shows but no content**
- Check browser console for API errors
- Verify the widget ID matches in the code
- Ensure the script has finished loading

## Advanced Features

### Conditional Widget Loading

Show widgets based on page type:

```html
{.if collection.typeName == "events"}
  <div id="events-widget"></div>
  <script>
    Janagana.events('events-widget', {
      maxEvents: 10
    });
  </script>
{.end}
```

### Mobile-Specific Widgets

Show different widgets on mobile:

```css
@media (max-width: 768px) {
  #events-widget {
    display: none;
  }
}
```

## Integration with Squarespace Commerce

Add newsletter signup to checkout:

1. Go to "Commerce" → "Checkout" → "Advanced"
2. Add custom HTML in the "Order Confirmation" section
3. Add the newsletter widget code
4. Customize the styling to match your checkout

## Next Steps

- Explore additional widget options in the [Integration Guide](./WEBSITE_EMBED_GUIDE.md)
- Set up webhooks to sync Squarespace form submissions to JanaGana CRM
- Use Developer Mode for advanced customizations
- Create custom templates for different widget layouts

## Support

If you need help with Squarespace integration:
- Check our [Help Center](https://janagana.namasteneedham.com/help)
- Contact support at support@janagana.com
