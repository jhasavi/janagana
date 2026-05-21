const requiredEnv = [
  {
    name: 'STRIPE_SECRET_KEY',
    message: 'Stripe secret key is required for payment and refund operations.',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    message: 'Stripe publishable key is required for web checkout.',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    message: 'Stripe webhook signing secret is required to verify incoming Stripe events.',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    message: 'Public application URL is required for redirect links and webhook callbacks.',
  },
]

const missing = requiredEnv.filter((item) => !process.env[item.name]?.trim())

if (missing.length > 0) {
  console.error('\nStripe environment validation failed: missing required environment variables.')
  for (const item of missing) {
    console.error(`- ${item.name}: ${item.message}`)
  }

  const isCi = process.env.CI === 'true' || process.env.CI === '1'
  if (isCi) {
    console.error('\nThis check runs as part of CI and will fail the build until the required Stripe variables are configured.')
    process.exit(1)
  }

  console.warn('\nRun `npm run validate:stripe-env` locally once Stripe vars are configured for a production-like environment.')
  process.exit(0)
}

console.log('Stripe environment validation passed.')
