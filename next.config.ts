import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  swcMinify: true,
}

export default withSentryConfig(nextConfig, {
  // Sentry organization and project from the Sentry dashboard
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI/production; skip locally to speed up builds
  silent: !process.env.CI,

  // Upload source maps so Sentry can show readable stack traces
  widenClientFileUpload: true,

  // Reduces bundle size by tree-shaking Sentry debug code in production
  disableLogger: true,

  // Auto-instrument Server Components and API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,

  // Suppress the sentry-cli binary download banner
  telemetry: false,
})
