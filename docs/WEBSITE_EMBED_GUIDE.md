# JanaGana Website Integration Guide

This guide shows you how to add JanaGana features to your website in minutes - no coding required!

## What You Can Add

- **Newsletter Signup** - Capture email subscribers and add them to your CRM
- **Event Listings** - Show your upcoming events with registration buttons
- **Course Enrollment** - Let people sign up for courses
- **Member Login** - Add a login button for your members

## Quick Start (3 Steps)

### Step 1: Add the JanaGana Script

Copy and paste this code into your website's HTML (usually in the `<head>` section or before the closing `</body>` tag):

```html
<script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
<script>
  Janagana.init({
    tenantSlug: 'your-org-slug',  // Replace with your organization slug
    apiUrl: 'https://janagana.namasteneedham.com'
  });
</script>
```

**How to find your tenant slug:**
1. Log in to your JanaGana dashboard at janagana.namasteneedham.com
2. Go to Settings → Organization
3. Your slug is shown there (e.g., "purple-wings")
4. You can customize it to something easy to remember

### Step 2: Add a Container Div

Wherever you want the widget to appear, add an empty div with a unique ID:

```html
<div id="newsletter-widget"></div>
```

### Step 3: Initialize the Widget

Add this script after the container div:

```html
<script>
  Janagana.newsletter('newsletter-widget');
</script>
```

That's it! The widget will now appear on your website.

---

## Widget Examples

### Newsletter Signup Widget

**HTML:**
```html
<div id="newsletter-widget"></div>
<script>
  Janagana.newsletter('newsletter-widget', {
    title: 'Subscribe to our newsletter',
    description: 'Get the latest updates delivered to your inbox'
  });
</script>
```

**What it does:**
- Collects name and email
- Automatically adds subscribers to your CRM
- Shows success/error messages
- No coding needed

**Where to use:**
- Homepage footer
- Blog posts
- Contact page
- Landing pages

---

### Events Widget

**HTML:**
```html
<div id="events-widget"></div>
<script>
  Janagana.events('events-widget', {
    title: 'Upcoming Events'
  });
</script>
```

**What it does:**
- Shows your published events from JanaGana
- Displays event date, location, and price
- "Register" button opens your JanaGana portal
- Automatically updates when you add events in JanaGana

**Where to use:**
- Events page
- Homepage
- Community section

---

### Course Enrollment Widget

**HTML:**
```html
<div id="course-widget"></div>
<script>
  Janagana.course('course-widget', {
    title: 'Enroll in Our Course',
    description: 'Enter your details to get started',
    courseId: 'your-course-id'  // Optional
  });
</script>
```

**What it does:**
- Collects name and email
- Adds enrollments to your CRM as leads
- Shows success/error messages
- Perfect for capturing course interest

**Where to use:**
- Course landing pages
- Educational content pages
- Training sections

---

### Login Widget

**HTML:**
```html
<div id="login-widget"></div>
<script>
  Janagana.login('login-widget', {
    title: 'Member Login'
  });
</script>
```

**What it does:**
- Shows a "Sign In" button
- Opens JanaGana login in new tab
- Returns user to your website after login
- Great for member-only areas

**Where to use:**
- Member-only pages
- Dashboard areas
- Resource sections

---

## Platform-Specific Instructions

### WordPress

1. Install a "Custom HTML" or "HTML" widget/plugin
2. Add the JanaGana script to your theme's header (Appearance → Editor → header.php)
3. Add the widget code to any page or post using the HTML block

**Alternative (easier):**
- Use a plugin like "Insert Headers and Footers"
- Paste the JanaGana script in the header section
- Add widget code using Custom HTML blocks

### Wix

1. Go to your site's dashboard
2. Click "Settings" → "Tracking & Analytics"
3. Click "New Tool" → "Custom"
4. Paste the JanaGana script in the "Head" section
5. Add an "Embed Code" element to your page
6. Paste the widget code in the embed element

### Squarespace

1. Go to Settings → Advanced → Code Injection
2. Paste the JanaGana script in the "Header" section
3. Add a "Code" block to any page
4. Paste the widget code in the code block

### Shopify

1. Go to Online Store → Themes
2. Click "Actions" → "Edit code"
3. Open `theme.liquid`
4. Paste the JanaGana script before `</head>`
5. Add a "Custom Liquid" block to any page
6. Paste the widget code in the block

### HTML/CSS Website

1. Open your HTML file
2. Paste the JanaGana script in the `<head>` section
3. Add the container div where you want the widget
4. Add the initialization script after the div

---

## Customization

### Changing Colors

The widgets use a default purple color (#4F46E5). To change colors, add custom CSS:

```html
<style>
  .janagana-newsletter-widget button {
    background: #your-color !important;
  }
  .janagana-events-widget .register-btn {
    background: #your-color !important;
  }
</style>
```

### Styling Tips

- The widgets are designed to be responsive
- They work on mobile and desktop
- You can wrap them in your own containers for additional styling
- All widgets have their own scoped CSS to avoid conflicts

---

## Troubleshooting

### Widget Not Showing

**Check:**
1. Did you add the JanaGana script?
2. Is your tenant slug correct?
3. Is the container div ID matching the widget initialization?
4. Check browser console for errors (F12 → Console)

### Not Capturing Leads

**Check:**
1. Is your tenant slug correct?
2. Is the API URL correct?
3. Check JanaGana CRM to see if contacts are being created
4. Enable debug mode to see what's happening:

```html
<script>
  Janagana.init({
    tenantSlug: 'your-org-slug',
    apiUrl: 'https://janagana.namasteneedham.com',
    debug: true  // This will show logs in browser console
  });
</script>
```

### Events Not Showing

**Check:**
1. Are your events published in JanaGana?
2. Are the event dates in the future?
3. Is the tenant slug correct?

---

## Full Example: Complete Page

Here's a complete example of a page with all widgets:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Organization</title>
  <!-- JanaGana Script -->
  <script src="https://janagana.namasteneedham.com/janagana-embed.js"></script>
  <script>
    Janagana.init({
      tenantSlug: 'purple-wings',
      apiUrl: 'https://janagana.namasteneedham.com'
    });
  </script>
</head>
<body>
  <h1>Welcome to Our Organization</h1>
  
  <!-- Newsletter Widget -->
  <div id="newsletter-widget"></div>
  <script>
    Janagana.newsletter('newsletter-widget', {
      title: 'Stay Updated',
      description: 'Subscribe to our newsletter'
    });
  </script>
  
  <h2>Upcoming Events</h2>
  
  <!-- Events Widget -->
  <div id="events-widget"></div>
  <script>
    Janagana.events('events-widget', {
      title: 'Our Events'
    });
  </script>
  
  <h2>Member Login</h2>
  
  <!-- Login Widget -->
  <div id="login-widget"></div>
  <script>
    Janagana.login('login-widget');
  </script>
</body>
</html>
```

---

## Support

If you need help:
1. Check the troubleshooting section above
2. Enable debug mode to see error messages
3. Contact support with your tenant slug and what you're trying to do

---

## Security Notes

- The widgets use HTTPS for all communications
- No sensitive data is stored on the user's browser
- All data is sent directly to your JanaGana instance
- The script is hosted on your JanaGana domain

---

## Advanced: Multiple Widgets on One Page

You can add multiple widgets on the same page - just use different container IDs:

```html
<div id="newsletter-footer"></div>
<script>
  Janagana.newsletter('newsletter-footer');
</script>

<div id="events-sidebar"></div>
<script>
  Janagana.events('events-sidebar');
</script>

<div id="course-main"></div>
<script>
  Janagana.course('course-main');
</script>
```

---

## What Happens in the Background

When someone uses a widget:

1. **Newsletter Signup**
   - Email is sent to JanaGana
   - Contact is created/updated in CRM
   - Source is marked as "newsletter"
   - You can follow up in CRM

2. **Event Registration**
   - User clicks "Register"
   - Opens JanaGana portal
   - User completes registration
   - Activity is created in CRM

3. **Course Enrollment**
   - Email is sent to JanaGana
   - Contact is created/updated in CRM
   - Source is marked as "course_enrollment"
   - You can follow up in CRM

4. **Login**
   - User clicks "Sign In"
   - Opens JanaGana login
   - After login, returns to your site
   - User is now authenticated

---

## Next Steps

1. **Add widgets to your website** - Start with newsletter signup
2. **Test the widgets** - Try subscribing yourself
3. **Check CRM** - Verify contacts are being created
4. **Add more widgets** - Events, courses, login as needed
5. **Customize styling** - Match your brand colors

That's it! You now have JanaGana integrated with your website.
