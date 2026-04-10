# OrgFlow Member Portal - Mobile App

React Native mobile app for OrgFlow members to manage their membership, events, volunteering, and clubs.

## Tech Stack

- **Framework:** Expo SDK 51
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind for React Native)
- **State Management:** Zustand with persist
- **Data Fetching:** React Query (TanStack Query)
- **Auth:** Expo SecureStore
- **Push Notifications:** Expo Notifications
- **QR Codes:** react-native-qrcode-svg
- **Icons:** lucide-react-native

## Project Structure

```
apps/mobile/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/                   # Auth flow
│   │   ├── login.tsx            # Email + magic link login
│   │   └── verify.tsx           # Verify magic link
│   ├── (tabs)/                   # Tab navigation
│   │   ├── home.tsx             # Member dashboard
│   │   ├── events.tsx           # Browse events
│   │   ├── volunteer.tsx        # Volunteer opportunities
│   │   ├── clubs.tsx            # My clubs
│   │   └── profile.tsx          # Profile & settings
│   ├── events/[id].tsx          # Event detail + register
│   ├── volunteer/[id].tsx       # Opportunity detail + apply
│   ├── clubs/[id].tsx           # Club detail + posts
│   ├── organization.tsx          # Multi-tenant org selection
│   ├── index.tsx                # Root redirect
│   ├── _layout.tsx              # Root layout
│   └── global.css               # Global styles
├── components/                   # Reusable components
│   ├── MembershipCard.tsx        # Digital membership card
│   ├── EventCard.tsx            # Event display
│   ├── OpportunityCard.tsx      # Volunteer opportunity
│   ├── ClubCard.tsx             # Club display
│   └── PostCard.tsx             # Club post
├── lib/                         # Core utilities
│   ├── auth.ts                  # SecureStore token management
│   ├── api.ts                   # Axios instance
│   ├── notifications.ts         # Push notification helpers
│   └── store.ts                 # Zustand state management
├── package.json
├── app.json                     # Expo configuration
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # Tailwind config
└── babel.config.js              # Babel config
```

## Features

### Multi-Tenant Support
- Organization code/URL entry on first launch
- Remembers previously used organizations
- Easy switching between organizations

### Authentication
- Magic link email authentication
- Secure token storage with Expo SecureStore
- Automatic token refresh

### Member Dashboard
- Digital membership card with QR code
- Membership status and expiry
- Upcoming events (horizontal scroll)
- Upcoming volunteer shifts
- Recent club activity

### Events
- Searchable event list
- Filter by category/date
- Pull to refresh
- Event detail with registration
- QR ticket for check-in

### Volunteer
- Open opportunities list
- My applications status
- My shifts calendar
- Log volunteer hours

### Clubs
- My clubs at top
- Discover clubs below
- Club detail with post feed
- Create and view posts

### Profile
- Edit profile info
- Photo upload
- Privacy settings
- Notification preferences
- App settings (dark mode, etc.)
- Switch organization
- Logout

### Push Notifications
- Event reminders (day before, 2 hours before)
- Volunteer shift reminders
- Application status changes
- New club posts
- Announcements

### Deep Linking
- `orgflow://events/:id` - Open event detail
- `orgflow://clubs/:id` - Open club detail
- `orgflow://verify?token=xxx` - Verify magic link

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
cd apps/mobile
npm install
```

### Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

### Run Development

```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run in web browser
npx expo start --web
```

### Build for Production

```bash
# Build iOS
eas build --platform ios

# Build Android
eas build --platform android
```

## API Integration

The mobile app uses the same REST API as the web application. The API base URL is configured via the `EXPO_PUBLIC_API_URL` environment variable.

### Authentication Flow

1. User enters email on login screen
2. Magic link sent to email
3. User clicks link (deep link to app)
4. Token verified and stored in SecureStore
5. User redirected to tabs

### Multi-Tenant Flow

1. User enters organization code or URL
2. App resolves to tenant slug
3. Tenant slug stored in SecureStore
4. All API calls include `X-Tenant-Slug` header

## Components

### MembershipCard
Displays digital membership card with:
- Organization branding
- Member ID
- QR code for check-in
- Membership tier and expiry

### EventCard
Displays event information in:
- Compact (horizontal scroll)
- Full (vertical list)

### OpportunityCard
Displays volunteer opportunities and shifts.

### ClubCard
Displays club information in:
- Compact (horizontal scroll)
- Full (vertical list)

### PostCard
Displays club posts with likes and comments.

## State Management

Uses Zustand with persist middleware for:
- Member information
- Organization details
- Loading states

## Push Notifications

Push notifications are handled via Expo Notifications. The app:
- Registers for push tokens on first launch
- Sends token to API for member association
- Handles notification events
- Schedules local notifications for reminders

## Deep Linking

Deep links are configured in `app.json`:
- Custom scheme: `orgflow://`
- Universal links: `*.orgflow.app`

## Styling

Uses NativeWind for Tailwind CSS styling. The theme extends the default with:
- Primary color palette (#667eea)
- Custom spacing
- Custom typography

## Troubleshooting

### Dependencies not found
Run `npm install` in the `apps/mobile` directory.

### Metro bundler issues
Clear cache: `npx expo start -c`

### iOS build issues
Clean build folder and reinstall pods:
```bash
npx expo prebuild --clean
cd ios && pod install
```

### Android build issues
Clean build: `npx expo prebuild --clean`

## Notes

- The lint errors shown during development are expected - they occur because the dependencies haven't been installed yet. Run `npm install` to resolve them.
- The app shares API hooks with the web application where possible.
- All API calls are authenticated with the stored token.
- Tenant context is passed via headers for multi-tenancy.
