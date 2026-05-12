// Sentry client-side initialization for Next.js 15+ / Turbopack
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-initialization-config-files
export { captureRouterTransitionStart as onRouterTransitionStart } from '@sentry/nextjs'

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Disable Replay integration to prevent conflicts
  // replaysSessionSampleRate: 0.05,
  // replaysOnErrorSampleRate: 1.0,
  // integrations: [Sentry.replayIntegration()],

  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  environment: process.env.NODE_ENV ?? 'development',
})
