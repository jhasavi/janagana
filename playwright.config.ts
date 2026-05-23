import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { config as dotenv } from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'

process.env.PLAYWRIGHT_TEST = process.env.PLAYWRIGHT_TEST || 'true'
process.env.E2E_TEST_MODE = process.env.E2E_TEST_MODE || 'true'
process.env.NEXT_PUBLIC_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE || 'true'

dotenvExpand(
  dotenv({ path: path.join(__dirname, '.env'), override: false })
)
dotenvExpand(
  dotenv({ path: path.join(__dirname, '.env.local'), override: true })
)

const resolvedBaseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
const resolvedWebServerReadyURL = `${resolvedBaseURL.replace(/\/$/, '')}/api/health/onboarding`
const resolvedDevPort = (() => {
  try {
    const parsed = new URL(resolvedBaseURL)
    if (parsed.port) return parsed.port
    return parsed.protocol === 'https:' ? '443' : '80'
  } catch {
    return '3000'
  }
})()
const resolvedDevCommand = `NODE_ENV=production E2E_TEST_MODE=true PLAYWRIGHT_TEST=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run build && NODE_ENV=test E2E_TEST_MODE=true PLAYWRIGHT_TEST=true NEXT_PUBLIC_E2E_TEST_MODE=true PORT=${resolvedDevPort} npm run start`

export default defineConfig({
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.ts'),
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 60_000,
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: resolvedBaseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      testIgnore: [/global-setup\.ts/, /no-auth/],
    },
    {
      name: 'no-auth',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /no-auth\.spec\.ts/,
    },
  ],
  webServer: {
    command: resolvedDevCommand,
    url: resolvedWebServerReadyURL,
    reuseExistingServer: true,
    timeout: 600_000,
  },
})