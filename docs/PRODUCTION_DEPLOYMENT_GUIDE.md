# Production Deployment Guide

## Production URLs

- **JanaGana**: https://janagana.namasteneedham.com/
- **The Purple Wings**: https://www.thepurplewings.org

## Architecture

```
┌──────────────────────────────┐         API          ┌─────────────────────────────┐
│   TPW Website                │ ◄────────────────────► │   JanaGana                  │
│   (www.thepurplewings.org)   │                        │   (janagana.namasteneedham) │
│                              │                        │                             │
│ - Supabase Auth              │                        │ - Clerk Auth                │
│ - Course Display             │                        │ - CRM                       │
│ - Event Display              │                        │ - Memberships               │
│ - JanaGana Integration       │                        │ - Events                    │
└──────────────────────────────┘                        └─────────────────────────────┘
```

## Step 1: QA Test Local Changes

Before pushing to production, test locally:

### Test 1: Verify JanaGana API Endpoints

```bash
cd /Users/Sanjeev/JanaGana

# Start dev server (if not running)
pnpm dev

# Test CRM API with your API key
curl -H "x-api-key: jg_live_4f62e0e1eac249c4c0446c988b84ac65e1b11794a65fdb425dacf0e962f77d25" \
  http://localhost:3000/api/plugin/crm/contacts

# Test events API
curl -H "x-api-key: jg_live_4f62e0e1eac249c4c0446c988b84ac65e1b11794a65fdb425dacf0e962f77d25" \
  http://localhost:3000/api/plugin/events
```

### Test 2: Test TPW Integration

```bash
cd /Users/Sanjeev/tpw

# Start TPW dev server
pnpm dev

# Test signup flow:
# 1. Go to http://localhost:3000/auth
# 2. Sign up with test email
# 3. Check JanaGana dashboard → Members → should see new member
```

## Step 2: Push JanaGana Changes to Main

```bash
cd /Users/Sanjeev/JanaGana

# Check current branch
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: Add CRM plugin API endpoints and TPW integration

- Add CRM models (Company, Contact, Deal, Activity, Task)
- Create plugin API endpoints for CRM operations
- Add events and event registration API endpoints
- Implement plugin authentication with API keys
- Create data sync functions (Member→Contact, Event→Activity)
- Generate API keys for all tenants
- Update middleware for plugin routes"

# Push to main
git push origin main
```

## Step 3: Deploy JanaGana to Vercel

### Pre-Deployment Checklist

**Important: Address Clerk Issue from Previous Failure**

The last Vercel deployment failed due to Clerk issues. Check these:

1. **Verify Clerk Environment Variables in Vercel**
   - Go to Vercel dashboard → JanaGana project → Settings → Environment Variables
   - Ensure these are set:
     ```
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
     CLERK_SECRET_KEY=sk_test_...
     CLERK_WEBHOOK_SECRET=whsec_...
     ```

2. **Check Clerk Middleware**
   - Ensure middleware.ts doesn't block API routes
   - Plugin routes (`/api/plugin/*`) should be public

3. **Verify Database Connection**
   - Ensure `DATABASE_URL` is set in Vercel environment variables
   - Use the non-pooler connection string (not the pooler)

### Deploy to Vercel

```bash
cd /Users/Sanjeev/JanaGana

# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or push to trigger deployment (if connected to GitHub)
git push origin main
```

### Verify Deployment

1. Go to https://janagana.namasteneedham.com/
2. Sign in as jhasavi@gmail.com
3. Select "The Purple Wings" organization
4. Verify:
   - Dashboard loads
   - Members section works
   - Events section works
   - CRM section works

## Step 4: Get Production API Key (UI-Based)

After JanaGana is deployed, generate API keys through the dashboard:

1. Go to https://janagana.namasteneedham.com/
2. Sign in with your admin account
3. Navigate to Dashboard → Settings → API Keys
4. Click "Generate New API Key"
5. Copy the API key (format: `jg_live_...`)
6. Store it securely in your environment variables

**Note:** Each organization has its own API key. Make sure you select the correct organization (e.g., "The Purple Wings") before generating the key.

## Step 5: Update TPW for Production

### Update Environment Variables

Edit `/Users/Sanjeev/tpw/.env.local`:

```env
# JanaGana CRM Integration - PRODUCTION
JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
JANAGANA_API_KEY=<production_api_key_from_step_4>
```

### Update Production Environment Variables (Vercel)

For TPW production deployment:

1. Go to Vercel dashboard → The Purple Wings project
2. Settings → Environment Variables
3. Add/update:
   ```
   JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
   JANAGANA_API_KEY=<production_api_key>
   ```

## Step 6: Deploy TPW to Production

```bash
cd /Users/Sanjeev/tpw

# Check current branch
git status

# Add changes
git add .

# Commit changes
git commit -m "feat: Integrate JanaGana CRM plugin

- Add JanaGana API client
- Integrate member creation on signup
- Add JanaGana environment variables
- Configure for production API"

# Push to main
git push origin main

# Deploy to Vercel (if auto-deploy not enabled)
vercel --prod
```

## Step 7: Verify Production Integration

### Test 1: Signup Flow

1. Go to https://www.thepurplewings.org/auth
2. Sign up with a test account
3. Check JanaGana dashboard → Members → should see new member

### Test 2: Event Creation

1. Go to https://janagana.namasteneedham.com/dashboard
2. Create a test event for "The Purple Wings"
3. Set status to PUBLISHED

### Test 3: Event Display

1. Go to https://www.thepurplewings.org/events
2. Should see the event fetched from JanaGana

### Test 4: Event Registration

1. Register for the event on TPW
2. Check JanaGana dashboard → Event Registrations → should see registration

## Troubleshooting

### Clerk Deployment Failures

If Vercel deployment fails due to Clerk:

1. **Check Clerk Keys**
   - Ensure keys are valid and not expired
   - Use test keys for staging, production keys for production

2. **Disable Clerk Temporarily**
   - Comment out Clerk middleware in middleware.ts
   - Deploy without Clerk
   - Re-enable Clerk after deployment

3. **Check Clerk Webhook**
   - Ensure `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
   - Remove webhook temporarily if causing issues

### Database Connection Issues

If database connection fails:

1. **Use Non-Pooler URL**
   - Remove `-pooler` from hostname
   - Remove `channel_binding=require` from connection string

2. **Verify Neon Credentials**
   - Ensure database is active in Neon dashboard
   - Regenerate password if needed

### API Key Issues

If API authentication fails:

1. **Regenerate API Key**
   - Run the API key generation script
   - Copy the new key
   - Update environment variables

2. **Verify Tenant**
   - Ensure "The Purple Wings" organization exists
   - Check API key is associated with correct tenant

## Applying to Vidhyabharti and Icon

### For Each Website:

1. **Create Organization in JanaGana**
   - Go to https://janagana.namasteneedham.com/dashboard
   - Create new organization (e.g., "Vidhyabharti")
   - Note the organization slug

2. **Generate Production API Key (UI)**
   - Go to Dashboard → Settings → API Keys
   - Select the organization
   - Click "Generate New API Key"
   - Copy the API key

3. **Add to Website**
   - Add to website's `.env.local` and Vercel environment variables:
     ```
     JANAGANA_API_URL=https://janagana.namasteneedham.com/api/plugin
     JANAGANA_API_KEY=<new_api_key>
     ```
   - Copy `/Users/Sanjeev/tpw/src/lib/janagana.ts` to website
   - Modify signup page to call `createMember()`
   - Add events page to fetch from JanaGana
   - Add event registration functionality

4. **Deploy**
   - Commit changes
   - Push to main
   - Deploy to Vercel

## Summary

**Order of Operations:**
1. ✅ QA test locally
2. ✅ Push JanaGana to main
3. ✅ Deploy JanaGana to Vercel (janagana.namasteneedham.com)
4. ✅ Regenerate production API keys
5. ✅ Update TPW with production API URL and key
6. ✅ Deploy TPW to production (www.thepurplewings.org)
7. ✅ Verify integration works end-to-end
8. ✅ Apply same pattern to Vidhyabharti and Icon

**Critical Points:**
- Use non-pooler DATABASE_URL to avoid connection issues
- Verify Clerk environment variables before Vercel deployment
- Regenerate API keys after production deployment
- Update all environment variables for production URLs
