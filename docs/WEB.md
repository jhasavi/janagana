# OrgFlow Web Application Documentation

Next.js 14 web application for the OrgFlow platform, including the admin dashboard and public-facing pages.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **Components:** shadcn/ui
- **State:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod
- **Auth:** Clerk
- **Icons:** Lucide React

## Project Structure

```
apps/web/
├── app/
│   ├── (dashboard)/          # Admin dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── members/          # Member management
│   │   ├── events/           # Event management
│   │   ├── volunteer/       # Volunteer management
│   │   ├── clubs/            # Club management
│   │   ├── donations/        # Donation management
│   │   ├── communications/   # Communications
│   │   ├── settings/         # Organization settings
│   │   └── billing/          # Billing & subscription
│   ├── (public)/             # Public-facing pages
│   │   ├── [tenantSlug]/     # Tenant-specific public pages
│   │   │   ├── donate/       # Public donation page
│   │   │   └── events/       # Public event listing
│   │   └── page.tsx          # Marketing landing page
│   ├── (portal)/             # Member portal
│   │   └── portal/           # Member dashboard
│   ├── api/                  # API routes
│   ├── layout.tsx            # Root layout
│   └── error.tsx            # Error boundary
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── dashboard/            # Dashboard-specific components
│   └── shared/               # Shared components
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts               # Auth utilities
│   └── utils.ts              # Utilities
└── middleware.ts            # Next.js middleware
```

## Routing

### Multi-Tenancy

The app supports two routing modes:

**Production (Subdomain-based):**
- `tenant1.orgflow.app/dashboard` → Tenant 1 dashboard
- `tenant2.orgflow.app/donate` → Tenant 2 donation page

**Development (Path-based):**
- `localhost:3000/tenant1/dashboard` → Tenant 1 dashboard
- `localhost:3000/tenant2/donate` → Tenant 2 donation page

### Route Groups

- `(dashboard)` - Admin dashboard (protected)
- `(public)` - Public pages (no auth required)
- `(portal)` - Member portal (member auth required)

## Authentication

### Clerk Integration

The app uses Clerk for authentication:

```typescript
import { ClerkProvider, useAuth } from '@clerk/nextjs'

// Wrap app with ClerkProvider
<ClerkProvider>
  <App />
</ClerkProvider>

// Use auth in components
const { user, isLoaded, isSignedIn } = useAuth()
```

### Protected Routes

Protected routes use Clerk middleware:

```typescript
// middleware.ts
export default authMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  ignoredRoutes: ['/api/webhooks/clerk'],
})
```

### Tenant Context

Tenant is resolved from subdomain/path and stored in context:

```typescript
// lib/tenant.ts
export function getTenantFromRequest(request: Request) {
  const host = request.headers.get('host')
  // Extract tenant from subdomain or path
}
```

## Data Fetching

### React Query

The app uses React Query for data fetching:

```typescript
import { useQuery } from '@tanstack/react-query'

// Fetch members
const { data: members, isLoading } = useQuery({
  queryKey: ['members'],
  queryFn: () => api.get('/members'),
})
```

### API Client

Centralized API client with auth:

```typescript
// lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

// Add auth token
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

## Components

### shadcn/ui

Pre-built UI components from shadcn/ui:
- Button, Input, Select, etc.
- Card, Dialog, Sheet, etc.
- Form components
- Data tables

### Custom Components

#### Dashboard Components

- `StatsCard` - Display key metrics
- `RecentActivity` - Show recent actions
- `QuickActions` - Quick action buttons

#### Member Components

- `MemberTable` - Data table with filtering
- `MemberForm` - Add/edit member form
- `MemberCard` - Member profile card

#### Event Components

- `EventCard` - Event display card
- `EventForm` - Create/edit event form
- `RegistrationList` - Event registrations

#### Donation Components

- `CampaignCard` - Campaign display
- `DonationForm` - Donation input form
- `DonorList` - Donor management

## Forms

### React Hook Form + Zod

Forms use React Hook Form with Zod validation:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const form = useForm({
  resolver: zodResolver(schema),
})

// In component
<form onSubmit={form.handleSubmit(onSubmit)}>
  <Input {...form.register('name')} />
</form>
```

## State Management

### React Query

Server state managed by React Query:
- Automatic refetching
- Caching
- Optimistic updates

### Local State

Component state via React hooks:
- `useState` for local state
- `useReducer` for complex state
- Context API for global state

## Pages

### Dashboard

**Location:** `app/(dashboard)/dashboard/page.tsx`

Shows:
- Key metrics (members, events, revenue)
- Recent activity
- Upcoming events
- Quick actions

### Members

**Location:** `app/(dashboard)/members/page.tsx`

Features:
- Member list with search/filter
- Add member form
- Edit member
- Delete member
- Import/Export CSV

### Events

**Location:** `app/(dashboard)/events/page.tsx`

Features:
- Event list with calendar view
- Create event form
- Edit event
- Delete event
- View registrations
- Check-in members

### Donations

**Location:** `app/(dashboard)/donations/page.tsx`

Features:
- Donation overview with stats
- Campaign management
- Donor list
- Export donors
- Tax receipt generation

### Public Donation Page

**Location:** `app/(public)/[tenantSlug]/donate/page.tsx`

Features:
- Campaign selection
- Donation form
- Recurring options
- Stripe checkout
- Thank you message

## Styling

### TailwindCSS

Utility-first CSS framework:

```tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold">Title</h2>
</div>
```

### Custom Theme

Custom theme in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          // ...
          700: '#667eea',
        },
      },
    },
  },
}
```

## Performance

### Server Components

Use Next.js server components by default:

```tsx
// Server component (default)
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Client component (when needed)
'use client'
export default function InteractiveComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

### Image Optimization

Use Next.js Image component:

```tsx
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority
/>
```

### Code Splitting

Dynamic imports for large components:

```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
})
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

### Run Linter

```bash
npm run lint
```

### Run Type Check

```bash
npm run typecheck
```

## Deployment

### Vercel

Recommended deployment platform:

1. Connect GitHub repository
2. Import project
3. Configure environment variables
4. Deploy

### Environment Variables (Production)

```env
NEXT_PUBLIC_API_URL=https://api.orgflow.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_APP_URL=https://app.orgflow.app
```

## Troubleshooting

### Build Errors

- Check TypeScript errors: `npm run typecheck`
- Check lint errors: `npm run lint`
- Clear Next.js cache: `rm -rf .next`

### API Errors

- Verify API URL is correct
- Check CORS configuration
- Verify auth tokens are valid

### Styling Issues

- Clear Tailwind cache: `npm run build`
- Check Tailwind config
- Verify class names are correct

## Contributing

1. Follow existing code style
2. Use TypeScript for new files
3. Add tests for new features
4. Update documentation
