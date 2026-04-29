# Shopify Integration Guide

## Overview

This guide shows you how to integrate JanaGana widgets into your Shopify store. You can display events, newsletter signup forms, and member portals directly on your Shopify pages.

## Prerequisites

- A JanaGana organization account
- Your tenant slug (e.g., `purple-wings`)
- Shopify admin access
- Ability to edit Shopify theme files or use theme customizer

## Quick Start

### Step 1: Get Your Tenant Slug

1. Log in to your JanaGana dashboard
2. Go to Settings → Organization
3. Copy your tenant slug from the URL or settings page

### Step 2: Add the JanaGana Script to Your Theme

**Option A: Using Theme Customizer (Recommended)**

1. Go to Online Store → Themes
2. Click "Customize" on your active theme
3. Click "Theme actions" → "Edit code"
4. Open `layout/theme.liquid`
5. Add this before the closing `</head>` tag:

```html
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  Janagana.init({
    tenantSlug: 'your-tenant-slug',
    apiUrl: 'https://janagana.namasteneedham.com'
  });
</script>
```

Replace `your-tenant-slug` with your actual tenant slug.

**Option B: Using Shopify Script Editor App**

1. Install the "Script Editor" app from Shopify App Store
2. Create a new script
3. Select "Head" as the location
4. Add the same code as above

### Step 3: Add Widgets to Pages

#### Newsletter Widget

Add to your homepage or contact page:

1. Go to Online Store → Themes → Customize
2. Add a "Custom Liquid" section
3. Paste this code:

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

#### Events Widget

Add to a dedicated events page:

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

Add to a dedicated member page:

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

1. Go to Online Store → Pages
2. Click "Add page"
3. Title: "Events"
4. In the content editor, switch to "Show HTML"
5. Add the events widget code
6. Save the page
7. Add to your navigation menu

## Shopify Page Builder Integration

### Using Sections

Create a custom section for JanaGana widgets:

1. Go to Online Store → Themes → Customize
2. Click "Add section" → "Custom Liquid"
3. Name it "JanaGana Events"
4. Add the widget code
5. Position it where you want on the page

### Using Theme Blocks

Add widgets to existing sections:

1. Edit any section in the theme customizer
2. Add a "Custom Liquid" block
3. Paste the widget code
4. Adjust styling as needed

## Styling the Widgets

Add custom CSS to match your Shopify theme:

1. Go to Online Store → Themes → Customize
2. Click "Theme settings" → "Custom CSS"
3. Add your custom styles:

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

## Troubleshooting

### Widgets Not Showing

1. Check that the embed script is in `theme.liquid`
2. Verify your tenant slug is correct
3. Check browser console for errors (F12 → Console)
4. Ensure the script loads before the widget code

### Styling Issues

1. Use browser developer tools to inspect widget elements
2. Add custom CSS to override default styles
3. Check for theme CSS conflicts
4. Try adding `!important` to CSS rules if needed

### Events Not Displaying

1. Ensure events are published in JanaGana
2. Check that event dates are in the future
3. Verify the widget configuration (maxEvents, etc.)
4. Check the page is published in Shopify

## Common Errors

**"Janagana is not defined"**
- The embed script isn't loading. Check the script URL in `theme.liquid`.

**"Tenant not found"**
- Your tenant slug is incorrect. Double-check in JanaGana Settings.

**"No events to display"**
- Either no events exist or they're not published. Check your JanaGana dashboard.

**Script conflicts with other apps**
- Try loading the script in the footer instead of header
- Check for JavaScript errors from other apps

## Advanced Integration

### Using Shopify Liquid Variables

You can conditionally show widgets based on customer data:

```html
{% if customer %}
  <div id="member-portal"></div>
  <script>
    Janagana.portal('member-portal', {
      showLogin: false,
      showProfile: true
    });
  </script>
{% else %}
  <div id="newsletter-widget"></div>
  <script>
    Janagana.newsletter('newsletter-widget');
  </script>
{% endif %}
```

### Product Page Integration

Add newsletter signup to product pages:

1. Edit your product template
2. Add the newsletter widget below the product description
3. Customize the styling to match your product page

## Next Steps

- Explore additional widget options in the [Integration Guide](./WEBSITE_EMBED_GUIDE.md)
- Set up webhooks to sync Shopify orders to JanaGana CRM
- Create custom sections for different widget types
- Add A/B testing for newsletter signup forms

## Support

If you need help with Shopify integration:
- Check our [Help Center](https://janagana.namasteneedham.com/help)
- Contact support at support@janagana.com
