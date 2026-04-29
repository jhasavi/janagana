# WordPress Integration Guide

## Overview

This guide shows you how to integrate JanaGana widgets into your WordPress site. You can display events, newsletter signup forms, and member portals directly on your WordPress pages.

## Prerequisites

- A JanaGana organization account
- Your tenant slug (e.g., `purple-wings`)
- WordPress admin access
- Ability to edit WordPress pages or use custom HTML blocks

## Quick Start

### Step 1: Get Your Tenant Slug

1. Log in to your JanaGana dashboard
2. Go to Settings → Organization
3. Copy your tenant slug from the URL or settings page

### Step 2: Add the JanaGana Script

In WordPress, you have two options to add the embed script:

**Option A: Using a Plugin (Recommended)**

Use a plugin to add the script without editing theme files:

1. Install a plugin like "Insert Headers and Footers" or "WPCode"
2. Go to the plugin settings
3. Add the following script to the header section:

```html
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
```

**Option B: Using functions.php**

Add the script directly in your theme's functions file:

```php
function janagana_embed_script() {
    echo '<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>';
}
add_action('wp_head', 'janagana_embed_script');
```

**Recommendation:** Use Option A (Plugin) for easier maintenance and to avoid losing changes during theme updates. Use Option B (functions.php) only if you're comfortable editing theme files and using a child theme.

### Step 3: Initialize JanaGana

Add the initialization script after the embed script:

```html
<script>
  Janagana.init({
    tenantSlug: 'your-tenant-slug',
    apiUrl: 'https://janagana.namasteneedham.com'
  });
</script>
```

Replace `your-tenant-slug` with your actual tenant slug.

## Widgets

### Newsletter Widget

Add a newsletter signup form to any page using a Custom HTML block:

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

**Using WordPress Block Editor:**

1. Add a "Custom HTML" block
2. Paste the code above
3. Update the block settings as needed

### Events Widget

Display upcoming events on your site:

```html
<div id="events-widget"></div>
<script>
  Janagana.events('events-widget', {
    maxEvents: 5,
    showDescription: true,
    showDate: true,
    registerButtonText: 'Register Now'
  });
</script>
```

### Member Portal

Add a member portal login and dashboard:

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

## WordPress Page Builder Integration

### Elementor

1. Add an "HTML Code" widget to your page
2. Paste the widget code
3. Style using Elementor's design tools

### Divi

1. Add a "Code" module
2. Paste the widget code
3. Customize with Divi's visual editor

### Gutenberg (Block Editor)

1. Add a "Custom HTML" block
2. Paste the widget code
3. Use additional blocks for layout and styling

## Styling the Widgets

You can customize the appearance using CSS. Add this to your WordPress Customizer → Additional CSS:

```css
/* Newsletter widget styling */
#newsletter-widget .janagana-newsletter {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
}

/* Events widget styling */
#events-widget .janagana-event {
  border-bottom: 1px solid #eee;
  padding: 15px 0;
}

#events-widget .janagana-event:last-child {
  border-bottom: none;
}
```

## Troubleshooting

### Widgets Not Showing

1. Check that the embed script is loaded (view page source)
2. Verify your tenant slug is correct
3. Check browser console for errors (F12 → Console)
4. Ensure your WordPress theme doesn't have JavaScript conflicts

### Styling Issues

1. Use browser developer tools to inspect the widget elements
2. Add custom CSS to override default styles
3. Check for theme CSS conflicts

### Events Not Displaying

1. Ensure events are published in JanaGana
2. Check that event dates are in the future
3. Verify the widget configuration (maxEvents, etc.)

## Common Errors

**"Janagana is not defined"**
- The embed script isn't loading. Check the script URL and ensure it's in the page header.

**"Tenant not found"**
- Your tenant slug is incorrect. Double-check in JanaGana Settings.

**"No events to display"**
- Either no events exist or they're not published. Check your JanaGana dashboard.

## Next Steps

- Explore additional widget options in the [Integration Guide](./WEBSITE_EMBED_GUIDE.md)
- Set up webhooks to sync data back to your WordPress site
- Customize the widget styling to match your theme
- Add the JanaGana plugin API for advanced integrations

## Support

If you need help with WordPress integration:
- Check our [Help Center](https://janagana.namasteneedham.com/help)
- Contact support at support@janagana.com
