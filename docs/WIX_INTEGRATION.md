# Wix Integration Guide

## Overview

This guide shows you how to integrate JanaGana widgets into your Wix site. You can display events, newsletter signup forms, and member portals directly on your Wix pages.

## Prerequisites

- A JanaGana organization account
- Your tenant slug (e.g., `purple-wings`)
- Wix editor access
- Ability to add custom code to your Wix site

## Quick Start

### Step 1: Get Your Tenant Slug

1. Log in to your JanaGana dashboard
2. Go to Settings → Organization
3. Copy your tenant slug from the URL or settings page

### Step 2: Add the JanaGana Script

**Option A: Using Wix Editor (Recommended)**

Use the built-in Tracking & Analytics settings:

1. Go to your Wix Dashboard
2. Click "Edit Site" to open the Wix Editor
3. Click "Settings" in the top menu
4. Select "Tracking & Analytics"
5. Click "+ New Tool" → "Custom"
6. Name it "JanaGana Embed"
7. Paste this code in the "Head" section:

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

8. Click "Apply" and "Save"

**Option B: Using Wix Velo (Advanced)**

For programmatic control, use Wix Velo (Dev Mode):

1. Enable Velo (Dev Mode) in the Wix Editor
2. Add the script via Tracking & Analytics as shown in Option A
3. Use Velo code to initialize widgets (see "Using Wix Velo" section below)

**Recommendation:** Use Option A (Wix Editor) for most cases. Use Option B (Velo) only if you need dynamic widget loading or conditional display based on user state.

### Step 3: Add Widgets to Pages

#### Newsletter Widget

1. In the Wix Editor, go to the page where you want the widget
2. Click "Add Elements" → "Embed" → "Embed a Widget"
3. Click "Settings" on the embed element
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

5. Adjust the size and position of the widget
6. Click "Save"

#### Events Widget

1. Add another "Embed a Widget" element
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

1. Add another "Embed a Widget" element
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

## Using Wix Velo (Advanced)

For more control, use Wix Velo to integrate JanaGana:

### Step 1: Add the Script

1. In Wix Editor, go to "Settings" → "Tracking & Analytics"
2. Add the embed script as shown above

### Step 2: Use Velo Code

1. Enable Velo (Dev Mode) in the Wix Editor
2. Click the "Code" icon at the top
3. Open the page's JavaScript file
4. Add this code:

```javascript
$w.onReady(function () {
  // Initialize newsletter widget
  Janagana.newsletter('newsletter-widget', {
    buttonText: 'Subscribe',
    placeholder: 'Enter your email'
  });

  // Initialize events widget
  Janagana.events('events-widget', {
    maxEvents: 5,
    showDescription: true
  });
});
```

### Step 3: Add HTML Elements

1. Add "HTML Component" elements to your page
2. Set the ID to match the widget names (e.g., `newsletter-widget`)
3. The Velo code will initialize them

## Styling the Widgets

### Using Wix Editor

1. Click on the embed element
2. Use the design panel to adjust:
   - Size and position
   - Background color
   - Border and padding
   - Font settings

### Using Custom CSS

Add custom CSS in the embed element:

```html
<style>
  #newsletter-widget .janagana-newsletter {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
  }

  #events-widget .janagana-event {
    border-bottom: 1px solid #eee;
    padding: 15px 0;
  }
</style>

<div id="newsletter-widget"></div>
<script>
  Janagana.newsletter('newsletter-widget');
</script>
```

## Creating a Dedicated Events Page

1. In Wix Editor, click "Pages" → "Add New Page"
2. Name it "Events"
3. Add an "Embed a Widget" element
4. Add the events widget code
5. Style the page with Wix design tools
6. Add to your site menu

## Troubleshooting

### Widgets Not Showing

1. Check that the embed script is in Tracking & Analytics
2. Verify your tenant slug is correct
3. Check browser console for errors (F12 → Console)
4. Ensure the script loads before the widget code
5. Try refreshing the page

### Styling Issues

1. Use Wix design tools to adjust widget container
2. Add custom CSS within the embed element
3. Check for Wix theme CSS conflicts
4. Use the HTML Component for more control

### Events Not Displaying

1. Ensure events are published in JanaGana
2. Check that event dates are in the future
3. Verify the widget configuration (maxEvents, etc.)
4. Check the page is published in Wix

## Common Errors

**"Janagana is not defined"**
- The embed script isn't loading. Check the Tracking & Analytics settings.

**"Tenant not found"**
- Your tenant slug is incorrect. Double-check in JanaGana Settings.

**"No events to display"**
- Either no events exist or they're not published. Check your JanaGana dashboard.

**Widget shows but no content**
- Check browser console for API errors
- Verify the widget ID matches in the code
- Ensure the script has finished loading

## Advanced Features

### Dynamic Widget Loading

Load widgets based on user actions:

```javascript
// Load events widget when user clicks a button
$w('#loadEventsButton').onClick(() => {
  Janagana.events('events-widget', {
    maxEvents: 10
  });
});
```

### Conditional Display

Show widgets based on user login state:

```javascript
import wixUsers from 'wix-users';

$w.onReady(async function () {
  const user = await wixUsers.currentUser;
  
  if (user.loggedIn) {
    Janagana.portal('member-portal', {
      showLogin: false,
      showProfile: true
    });
  } else {
    Janagana.newsletter('newsletter-widget');
  }
});
```

## Next Steps

- Explore additional widget options in the [Integration Guide](./WEBSITE_EMBED_GUIDE.md)
- Set up webhooks to sync Wix form submissions to JanaGana CRM
- Use Wix Velo for advanced customizations
- Create dynamic widget loading based on user behavior

## Support

If you need help with Wix integration:
- Check our [Help Center](https://janagana.namasteneedham.com/help)
- Contact support at support@janagana.com
