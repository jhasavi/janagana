# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global-setup.ts >> authenticate via Clerk token (programmatic)
- Location: e2e/tests/global-setup.ts:22:6

# Error details

```
Error: Clerk sign-in token did not establish a session; dashboard redirected to sign-in.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - heading "Jana Gana" [level=1] [ref=e5]
    - paragraph [ref=e6]: Membership & Event Management
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e12] [cursor=pointer]:
    - img [ref=e13]
  - alert [ref=e16]
```

# Test source

```ts
  1   | /**
  2   |  * Global E2E Setup — Programmatic Clerk Auth
  3   |  *
  4   |  * Uses Clerk Backend API to issue a one-time sign-in token, then navigates
  5   |  * to the app with that token to establish a session — NO form interaction
  6   |  * needed. Works with any auth method (social login, password, etc.).
  7   |  *
  8   |  * Required env vars (.env):
  9   |  *   E2E_CLERK_EMAIL   — email of a Clerk user in your project
  10  |  *   CLERK_SECRET_KEY  — already required for the app itself
  11  |  */
  12  | 
  13  | import { test as setup, expect } from '@playwright/test'
  14  | import { createClerkClient } from '@clerk/backend'
  15  | import path from 'path'
  16  | import fs from 'fs'
  17  | import { prisma } from '@/lib/prisma'
  18  | import { slugify } from '@/lib/utils'
  19  | 
  20  | const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json')
  21  | 
  22  | setup('authenticate via Clerk token (programmatic)', async ({ page }) => {
  23  |   const email = process.env.E2E_CLERK_EMAIL
  24  |   const secretKey = process.env.CLERK_SECRET_KEY
  25  | 
  26  |   if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  27  |   if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')
  28  | 
  29  |   const authDir = path.dirname(STORAGE_STATE)
  30  |   if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  31  | 
  32  |   // If a saved auth state already exists, skip re-running the setup to avoid
  33  |   // flaky Clerk sign-in token redirects during local development.
  34  |   if (fs.existsSync(STORAGE_STATE)) {
  35  |     console.log('[setup] Existing auth state found, skipping global setup.')
  36  |     return
  37  |   }
  38  | 
  39  |   console.log(`[setup] Creating Clerk sign-in token for ${email}...`)
  40  |   const clerk = createClerkClient({ secretKey })
  41  | 
  42  |   const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  43  |   if (!users.length) {
  44  |     throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  45  |   }
  46  | 
  47  |   const user = users[0]
  48  |   const userId = user.id
  49  |   console.log(`[setup] Found Clerk user: ${userId}`)
  50  | 
  51  |   const orgId = await ensureE2ETenant(clerk, userId)
  52  |   console.log(`[setup] Ensured Clerk org exists: ${orgId}`)
  53  | 
  54  |   const signInToken = await clerk.signInTokens.createSignInToken({
  55  |     userId,
  56  |     expiresInSeconds: 60,
  57  |   })
  58  | 
  59  |   console.log('[setup] Navigating with Clerk sign-in token URL...')
  60  |   const signInUrl = new URL(signInToken.url)
  61  |   signInUrl.searchParams.set('redirect_url', 'http://localhost:3000/dashboard')
  62  | 
  63  |   await page.goto(signInUrl.toString(), {
  64  |     waitUntil: 'load',
  65  |     timeout: 45_000,
  66  |   })
  67  | 
  68  |   await page.waitForURL(/localhost:3000\/(dashboard|onboarding|sign-in|sign-in\/tasks\/choose-organization)/, {
  69  |     timeout: 45_000,
  70  |   })
  71  | 
  72  |   console.log(`[setup] Clerk token redirect completed. URL: ${page.url()}`)
  73  | 
  74  |   await page.goto('/dashboard', {
  75  |     waitUntil: 'domcontentloaded',
  76  |     timeout: 45_000,
  77  |   })
  78  | 
  79  |   await page.waitForURL(/localhost:3000\/(dashboard|onboarding|sign-in)/, {
  80  |     timeout: 45_000,
  81  |   })
  82  | 
  83  |   if (page.url().includes('/sign-in')) {
> 84  |     throw new Error('Clerk sign-in token did not establish a session; dashboard redirected to sign-in.')
      |           ^ Error: Clerk sign-in token did not establish a session; dashboard redirected to sign-in.
  85  |   }
  86  | 
  87  |   console.log(`[setup] Authenticated. URL: ${page.url()}`)
  88  | 
  89  |   if (page.url().includes('/sign-in/tasks/choose-organization')) {
  90  |     console.log('[setup] Clerk choose-organization task page detected. Continuing...')
  91  |     await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
  92  |     await page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 30_000 })
  93  |     console.log(`[setup] After choose-organization URL: ${page.url()}`)
  94  |   }
  95  | 
  96  |   if (page.url().includes('/onboarding')) {
  97  |     console.log('[setup] No org — completing onboarding form...')
  98  |     await page.waitForSelector('#org-name', { timeout: 10_000 })
  99  |     // Use .type() so React's onChange fires and state updates (fill() sets DOM only)
  100 |     await page.locator('#org-name').clear()
  101 |     await page.locator('#org-name').type('E2E Test Organization')
  102 |     // Wait for button to become enabled (React state update)
  103 |     await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 5_000 })
  104 | 
  105 |     // Listen for any toast/error before clicking
  106 |     const responsePromise = page.waitForResponse(
  107 |       (res) => res.url().includes('localhost') && res.request().method() === 'POST',
  108 |       { timeout: 15_000 }
  109 |     ).catch(() => null)
  110 | 
  111 |     await page.locator('button[type="submit"]:not([disabled])').first().click()
  112 | 
  113 |     const response = await responsePromise
  114 |     if (response) {
  115 |       const status = response.status()
  116 |       console.log(`[setup] Server response status: ${status}`)
  117 |       if (status >= 400) {
  118 |         const body = await response.text().catch(() => '')
  119 |         throw new Error(`Onboarding server action failed (${status}): ${body.slice(0, 500)}`)
  120 |       }
  121 |     }
  122 | 
  123 |     await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  124 |     console.log('[setup] Onboarding complete.')
  125 |   }
  126 | 
  127 |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  128 |   console.log('[setup] Dashboard confirmed. Saving auth state...')
  129 | 
  130 |   await page.context().storageState({ path: STORAGE_STATE })
  131 |   console.log('[setup] Auth state saved to', STORAGE_STATE)
  132 | 
  133 |   const browser = page.context().browser()
  134 |   if (!browser) throw new Error('Unable to access browser instance for auth verification')
  135 | 
  136 |   const verifyContext = await browser.newContext({ storageState: STORAGE_STATE })
  137 |   const verifyPage = await verifyContext.newPage()
  138 |   await verifyPage.goto('http://localhost:3000/dashboard', {
  139 |     waitUntil: 'networkidle',
  140 |     timeout: 30_000,
  141 |   })
  142 | 
  143 |   if (verifyPage.url().startsWith('http://localhost:3000/sign-in')) {
  144 |     throw new Error('Saved auth state did not preserve login; dashboard redirected to sign-in.')
  145 |   }
  146 | 
  147 |   await verifyContext.close()
  148 |   console.log('[setup] Verified auth state is reusable.')
  149 | })
  150 | 
  151 | async function ensureE2ETenant(clerk: ReturnType<typeof createClerkClient>, userId: string) {
  152 |   const memberships = await clerk.users.getOrganizationMembershipList({
  153 |     userId,
  154 |     limit: 10,
  155 |   })
  156 |   const membership = memberships.data.find((m) => {
  157 |     // Handle varying shapes returned by Clerk SDK across versions
  158 |     // Try multiple possible property names safely.
  159 |     try {
  160 |       const mi: any = m
  161 |       if (mi.public_user_data && mi.public_user_data.user_id === userId) return true
  162 |     } catch (e) {}
  163 |     try {
  164 |       const mi: any = m
  165 |       if (mi.publicUserData && (mi.publicUserData.user_id === userId || mi.publicUserData.userId === userId)) return true
  166 |     } catch (e) {}
  167 |     try {
  168 |       const mi: any = m
  169 |       if ((mi.user_id === userId) || (mi.userId === userId)) return true
  170 |     } catch (e) {}
  171 |     return false
  172 |   })
  173 | 
  174 |   if (membership) {
  175 |     const org = await clerk.organizations.getOrganization({ organizationId: membership.organization.id })
  176 |     await prisma.tenant.upsert({
  177 |       where: { clerkOrgId: org.id },
  178 |       create: {
  179 |         clerkOrgId: org.id,
  180 |         name: org.name,
  181 |         slug: org.slug,
  182 |       },
  183 |       update: {
  184 |         name: org.name,
```