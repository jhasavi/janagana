import { type FullConfig } from '@playwright/test'
import { seedE2EFixtures } from '@/e2e/test-auth-fixtures'

async function globalSetup(_config: FullConfig) {
  await seedE2EFixtures()
}

export default globalSetup
