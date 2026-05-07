import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { config as dotenv } from 'dotenv'
import { expand as dotenvExpand } from 'dotenv-expand'

// Load .env from project root (parent of e2e/)
dotenvExpand(
  dotenv({ path: path.join(__dirname, '..', '.env'), override: false })
)

// Auth state file reused across all tests
export const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json')
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
const resolvedDevCommand = `PORT=${resolvedDevPort} npm run dev`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,     // Sequential — DB state must be consistent
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,               // Single worker for DB consistency
  timeout: 60_000,          // 60s per test (Clerk auth can be slow)
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: resolvedBaseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    // ── 1. Global auth setup (runs first, once) ──
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    // ── 2. Authenticated tests (require Clerk login via setup) ──
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
      testIgnore: [/global-setup\.ts/, /no-auth/],
    },
    // ── 3. Unauthenticated tests (public pages, redirects) ──
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
    timeout: 120_000,
  },
})
