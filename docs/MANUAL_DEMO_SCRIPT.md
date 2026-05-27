# Manual Demo Script — JanaGana v3

Date: 2026-05-27
Environment: local (http://localhost:3020)

## Preconditions

- App running via `./start.sh`
- Owner account can sign in through Clerk
- Tenants present:
  - The Purple Wings (`purple-wings`)
  - Namaste Boston (`namaste-boston`)
- Optional reset/setup commands:
  - `npm run inventory:tenants`
  - `npm run setup:namaste`

## Demo Flow

1. Admin sign in
- Open `http://localhost:3020/sign-in`
- Sign in with owner account
- Expect redirect to `/dashboard` or `/select-organization`

2. Select/create tenant
- Open `http://localhost:3020/select-organization`
- If one tenant only: confirm page shows current tenant + `Create another organization`
- If creating second org:
  - Open `/onboarding/create-organization`
  - Create Name: `Namaste Boston`
  - Create Slug: `namaste-boston`
  - Confirm owner intent checkbox
  - Submit and verify redirect to `/dashboard`

3. Create event
- In dashboard, navigate to Events
- Create event:
  - Title: `Namaste Boston Meetup`
  - Status: `PUBLISHED`
  - Capacity: `2`
- Confirm event appears in list

4. Public registration
- Open `http://localhost:3020/portal/namaste-boston`
- Open event and submit registration with test attendee details
- Confirm success state (`registered`)

5. Admin attendee view
- Back in dashboard for Namaste Boston
- Open event registrations
- Confirm attendee appears with status `CONFIRMED`

6. Cancel/reconfirm registration
- In attendee list, click `Cancel`
- Confirm status changes to `CANCELED`
- Click `Mark confirmed`
- Confirm status returns to `CONFIRMED`

7. Tenant switch isolation
- Open `http://localhost:3020/select-organization`
- Switch to The Purple Wings
- Confirm Namaste attendee/event does not appear in Purple Wings admin pages
- Open `http://localhost:3020/portal/purple-wings`
- Confirm Namaste event is not shown
- Switch back to Namaste and verify data remains tenant-scoped

8. Sign out / re-login
- Sign out from header or `/api/sign-out`
- Confirm redirect to `/sign-in`
- Sign in again and verify no redirect loop
- Confirm tenant selection/dashboard loads correctly

9. Website CTA entry points
- From TPW website, click JanaGana CTA to `.../portal/purple-wings`
- From NB website, click JanaGana CTA to `.../portal/namaste-boston`
- Confirm each CTA lands on the correct tenant page

10. Public lead capture
- Open `http://localhost:3020/portal/purple-wings/contact?interest=newsletter`
- Submit lead with unique email and confirm success message
- Open `http://localhost:3020/portal/namaste-boston/contact?interest=investment`
- Submit lead with another unique email and confirm success message
- Confirm no auth prompt and no cross-tenant data leak

## Pass Criteria

- Owner can create/select organizations
- Public registration works by tenant slug
- Admin attendee operations (cancel/reconfirm) work
- No data leaks across tenants
- Sign-out/re-login flow is stable
- Website CTA links route to correct tenant slug
- Public lead capture works for newsletter/investment intents
