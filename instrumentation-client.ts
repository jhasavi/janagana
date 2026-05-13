// Sentry client-side instrumentation for Next.js 15+ / Turbopack
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-initialization-config-files
export { captureRouterTransitionStart as onRouterTransitionStart } from '@sentry/nextjs'

// NOTE: Sentry client initialization is handled in sentry.client.config.ts.
// This file should only export instrumentation helpers and must not call Sentry.init()
// to avoid duplicate client-side SDK initialization and session replay conflicts.
