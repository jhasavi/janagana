# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global-setup.ts >> authenticate via email/password form fill
- Location: e2e/tests/global-setup.ts:25:6

# Error details

```
Error: E2E auth was diverted to Google OAuth instead of staying on the local Clerk password flow. The configured E2E user/environment is not yielding a stable same-origin password login. Use a dedicated password-only Clerk test user for this environment.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - img "Google" [ref=e10]
        - generic [ref=e11]: Sign in with Google
      - img [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e15]:
        - heading "Sign in" [level=1] [ref=e16]
        - paragraph [ref=e17]:
          - text: to continue to
          - button "Clerk" [ref=e18] [cursor=pointer]
      - generic [ref=e19]:
        - generic [ref=e22]:
          - generic [ref=e27]:
            - textbox "Email or phone" [active] [ref=e28]
            - generic:
              - generic: Email or phone
          - paragraph [ref=e29]:
            - link "Forgot email?" [ref=e30] [cursor=pointer]:
              - /url: /signin/v2/usernamerecovery?access_type=offline&app_domain=https://clerk.shared.lcl.dev&client_id=787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com&continue=https://accounts.google.com/signin/oauth/legacy/consent?authuser%3Dunknown%26part%3DAJi8hAN6y3UeLuoiHhJkdArubUu7NxR6Q6L-ZpzM-Qv--HMj7RXfQDrRGuWyez5mgWE-SvVPkV8BrH1dp050kUIBrqtsXlPyoUq5BgBuUprWJkm7V9mkn17L4I9CnODYV-4HU4zr1Y99D0lK8nO5D4dFxUVu6eK5k8yYaUwymKdhvNTJxFlwpJ8pAuWo8y41BohBaaOkc7l7IM56ivaSVvDk_qJRFL6mbfdGvQ0gNuUfPFligcV1EsjMjxw56KoL-_N7XM4z3c-W5skUxwC0-Mh_ZMTRRgzHByT1tUNBu82l1aw9Th0Vcg4Gt2-5zMyeEA3HJ-3TWbWLbOOp9ObZfnCeFPVenU8oV6N2TldxT0FG0vgyHBOE4i4D51wXf21-ag7xjma1EM_msFyGfISzbCceb9SSp2HrANgz6_WdO8thenftBGAZdotUKagU39qKd2IYKBXGousuKmQ_XhjriHZKOdrgW0wKVHGerDwRAOaur6JLMcntbmc%26flowName%3DGeneralOAuthFlow%26as%3DS-215855545%253A1777924258511541%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%23&dsh=S-215855545:1777924258511541&flowName=GeneralOAuthLite&o2v=1&opparams=%253F&rart=ANgoxcfg5vFgyOYLuRVHTTUrHOqs-TVH05QPvzHwZ9z-KeDdU96yGQCKfW-W4lRJ8fEgMnSRMl7BdTLxxO17ikMgVdMmu_5zyzY4hbPZPdqPXmzbF9QNl0c&redirect_uri=https://clerk.shared.lcl.dev/v1/oauth_callback&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile+openid&service=lso&state=z8se55p8pgv0htoicdnvabgsnghveih6czt6kfbx
        - paragraph [ref=e33]:
          - text: Before using this app, you can review Clerk’s
          - link "Privacy Policy" [ref=e34] [cursor=pointer]:
            - /url: https://clerk.com/legal/privacy
          - text: and
          - link "Terms of Service" [ref=e35] [cursor=pointer]:
            - /url: https://clerk.com/legal/terms
          - text: .
        - generic [ref=e37]:
          - button "Next" [ref=e39]
          - link "Create account" [ref=e41] [cursor=pointer]:
            - /url: /lifecycle/flows/signup?access_type=offline&app_domain=https://clerk.shared.lcl.dev&client_id=787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com&continue=https://accounts.google.com/signin/oauth/legacy/consent?authuser%3Dunknown%26part%3DAJi8hAN6y3UeLuoiHhJkdArubUu7NxR6Q6L-ZpzM-Qv--HMj7RXfQDrRGuWyez5mgWE-SvVPkV8BrH1dp050kUIBrqtsXlPyoUq5BgBuUprWJkm7V9mkn17L4I9CnODYV-4HU4zr1Y99D0lK8nO5D4dFxUVu6eK5k8yYaUwymKdhvNTJxFlwpJ8pAuWo8y41BohBaaOkc7l7IM56ivaSVvDk_qJRFL6mbfdGvQ0gNuUfPFligcV1EsjMjxw56KoL-_N7XM4z3c-W5skUxwC0-Mh_ZMTRRgzHByT1tUNBu82l1aw9Th0Vcg4Gt2-5zMyeEA3HJ-3TWbWLbOOp9ObZfnCeFPVenU8oV6N2TldxT0FG0vgyHBOE4i4D51wXf21-ag7xjma1EM_msFyGfISzbCceb9SSp2HrANgz6_WdO8thenftBGAZdotUKagU39qKd2IYKBXGousuKmQ_XhjriHZKOdrgW0wKVHGerDwRAOaur6JLMcntbmc%26flowName%3DGeneralOAuthFlow%26as%3DS-215855545%253A1777924258511541%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%23&dsh=S-215855545:1777924258511541&flowEntry=SignUp&flowName=GlifWebSignIn&o2v=1&opparams=%253F&rart=ANgoxcfg5vFgyOYLuRVHTTUrHOqs-TVH05QPvzHwZ9z-KeDdU96yGQCKfW-W4lRJ8fEgMnSRMl7BdTLxxO17ikMgVdMmu_5zyzY4hbPZPdqPXmzbF9QNl0c&redirect_uri=https://clerk.shared.lcl.dev/v1/oauth_callback&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile+openid&service=lso&signInUrl=https://accounts.google.com/signin/oauth?access_type%3Doffline%26app_domain%3Dhttps://clerk.shared.lcl.dev%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%26continue%3Dhttps://accounts.google.com/signin/oauth/legacy/consent?authuser%253Dunknown%2526part%253DAJi8hAN6y3UeLuoiHhJkdArubUu7NxR6Q6L-ZpzM-Qv--HMj7RXfQDrRGuWyez5mgWE-SvVPkV8BrH1dp050kUIBrqtsXlPyoUq5BgBuUprWJkm7V9mkn17L4I9CnODYV-4HU4zr1Y99D0lK8nO5D4dFxUVu6eK5k8yYaUwymKdhvNTJxFlwpJ8pAuWo8y41BohBaaOkc7l7IM56ivaSVvDk_qJRFL6mbfdGvQ0gNuUfPFligcV1EsjMjxw56KoL-_N7XM4z3c-W5skUxwC0-Mh_ZMTRRgzHByT1tUNBu82l1aw9Th0Vcg4Gt2-5zMyeEA3HJ-3TWbWLbOOp9ObZfnCeFPVenU8oV6N2TldxT0FG0vgyHBOE4i4D51wXf21-ag7xjma1EM_msFyGfISzbCceb9SSp2HrANgz6_WdO8thenftBGAZdotUKagU39qKd2IYKBXGousuKmQ_XhjriHZKOdrgW0wKVHGerDwRAOaur6JLMcntbmc%2526flowName%253DGeneralOAuthFlow%2526as%253DS-215855545%25253A1777924258511541%2526client_id%253D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%2523%26dsh%3DS-215855545:1777924258511541%26flowName%3DGeneralOAuthLite%26o2v%3D1%26opparams%3D%25253F%26rart%3DANgoxcfg5vFgyOYLuRVHTTUrHOqs-TVH05QPvzHwZ9z-KeDdU96yGQCKfW-W4lRJ8fEgMnSRMl7BdTLxxO17ikMgVdMmu_5zyzY4hbPZPdqPXmzbF9QNl0c%26redirect_uri%3Dhttps://clerk.shared.lcl.dev/v1/oauth_callback%26response_type%3Dcode%26scope%3Dhttps://www.googleapis.com/auth/userinfo.email%2Bhttps://www.googleapis.com/auth/userinfo.profile%2Bopenid%26service%3Dlso%26state%3Dz8se55p8pgv0htoicdnvabgsnghveih6czt6kfbx&state=z8se55p8pgv0htoicdnvabgsnghveih6czt6kfbx
  - contentinfo [ref=e42]:
    - combobox [ref=e45] [cursor=pointer]:
      - option "Afrikaans"
      - option "azərbaycan"
      - option "bosanski"
      - option "català"
      - option "Čeština"
      - option "Cymraeg"
      - option "Dansk"
      - option "Deutsch"
      - option "eesti"
      - option "English (United Kingdom)"
      - option "English (United States)" [selected]
      - option "Español (España)"
      - option "Español (Latinoamérica)"
      - option "euskara"
      - option "Filipino"
      - option "Français (Canada)"
      - option "Français (France)"
      - option "Gaeilge"
      - option "galego"
      - option "Hrvatski"
      - option "Indonesia"
      - option "isiZulu"
      - option "íslenska"
      - option "Italiano"
      - option "Kiswahili"
      - option "latviešu"
      - option "lietuvių"
      - option "magyar"
      - option "Melayu"
      - option "Nederlands"
      - option "norsk"
      - option "o‘zbek"
      - option "polski"
      - option "Português (Brasil)"
      - option "Português (Portugal)"
      - option "română"
      - option "shqip"
      - option "Slovenčina"
      - option "slovenščina"
      - option "srpski (latinica)"
      - option "Suomi"
      - option "Svenska"
      - option "Tiếng Việt"
      - option "Türkçe"
      - option "Ελληνικά"
      - option "беларуская"
      - option "български"
      - option "кыргызча"
      - option "қазақ тілі"
      - option "македонски"
      - option "монгол"
      - option "Русский"
      - option "српски (ћирилица)"
      - option "Українська"
      - option "ქართული"
      - option "հայերեն"
      - option "‫עברית‬‎"
      - option "‫اردو‬‎"
      - option "‫العربية‬‎"
      - option "‫فارسی‬‎"
      - option "አማርኛ"
      - option "नेपाली"
      - option "मराठी"
      - option "हिन्दी"
      - option "অসমীয়া"
      - option "বাংলা"
      - option "ਪੰਜਾਬੀ"
      - option "ગુજરાતી"
      - option "ଓଡ଼ିଆ"
      - option "தமிழ்"
      - option "తెలుగు"
      - option "ಕನ್ನಡ"
      - option "മലയാളം"
      - option "සිංහල"
      - option "ไทย"
      - option "ລາວ"
      - option "မြန်မာ"
      - option "ខ្មែរ"
      - option "한국어"
      - option "中文（香港）"
      - option "日本語"
      - option "简体中文"
      - option "繁體中文"
    - list [ref=e46]:
      - listitem [ref=e47]:
        - link "Help" [ref=e48] [cursor=pointer]:
          - /url: https://support.google.com/accounts?hl=en-US&p=account_iph
      - listitem [ref=e49]:
        - link "Privacy" [ref=e50] [cursor=pointer]:
          - /url: https://accounts.google.com/TOS?loc=US&hl=en-US&privacy=true
      - listitem [ref=e51]:
        - link "Terms" [ref=e52] [cursor=pointer]:
          - /url: https://accounts.google.com/TOS?loc=US&hl=en-US
```

# Test source

```ts
  1   | /**
  2   |  * Global E2E Setup — Email/Password Form-Fill Auth
  3   |  *
  4   |  * Signs in via the Clerk sign-in form using email + password (form-fill).
  5   |  * This approach is more reliable than sign-in tokens which can fail to
  6   |  * establish a persistent session in some Clerk configurations.
  7   |  *
  8   |  * Required env vars (.env):
  9   |  *   E2E_CLERK_EMAIL    — email of a Clerk user in your project
  10  |  *   E2E_CLERK_PASSWORD — password for the test user
  11  |  *   CLERK_SECRET_KEY   — already required for the app itself
  12  |  * Optional env vars (.env):
  13  |  *   E2E_SIGN_IN_PATH    — explicit app sign-in route (defaults to /auth/login)
  14  |  */
  15  | 
  16  | import { test as setup, expect } from '@playwright/test'
  17  | import { createClerkClient } from '@clerk/backend'
  18  | import path from 'path'
  19  | import fs from 'fs'
  20  | import { prisma } from '@/lib/prisma'
  21  | 
  22  | const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'user.json')
  23  | const GOOGLE_OAUTH_URL = /accounts\.google\.com/
  24  | 
  25  | setup('authenticate via email/password form fill', async ({ page }) => {
  26  |   const email = process.env.E2E_CLERK_EMAIL
  27  |   const password = process.env.E2E_CLERK_PASSWORD
  28  |   const secretKey = process.env.CLERK_SECRET_KEY
  29  |   const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
  30  |   const signInPath = process.env.E2E_SIGN_IN_PATH || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/login'
  31  | 
  32  |   if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  33  |   if (!password) throw new Error('Missing E2E_CLERK_PASSWORD in .env')
  34  |   if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')
  35  | 
  36  |   const authDir = path.dirname(STORAGE_STATE)
  37  |   if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  38  | 
  39  |   // If a saved auth state already exists, skip re-running the setup
  40  |   if (fs.existsSync(STORAGE_STATE)) {
  41  |     console.log('[setup] Existing auth state found, skipping global setup.')
  42  |     return
  43  |   }
  44  | 
  45  |   // Ensure E2E tenant exists in Clerk + DB before sign-in
  46  |   const clerk = createClerkClient({ secretKey })
  47  |   const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  48  |   if (!users.length) throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  49  |   const user = await clerk.users.getUser(users[0].id)
  50  |   logE2EUserAuthCapabilities(user)
  51  |   assertPasswordCapableE2EUser(user, email)
  52  |   const userId = user.id
  53  |   console.log(`[setup] Found Clerk user: ${userId}`)
  54  |   await ensureE2ETenant(clerk, userId)
  55  | 
  56  |   // ── Sign in via form fill ──────────────────────────────────────────────────
  57  |   const signInUrl = new URL(signInPath, baseUrl).toString()
  58  |   console.log(`[setup] Navigating to ${signInUrl}...`)
  59  |   await page.goto(signInUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  60  | 
  61  |   // Fail fast when route drift lands on a 404 page instead of the auth form.
  62  |   await expect(page.getByRole('heading', { name: /404|page not found/i })).toHaveCount(0)
  63  | 
  64  |   // Prefer accessible locators first, then fall back to robust structural selectors.
  65  |   const semanticEmailInput = page
  66  |     .getByLabel(/email|email address/i)
  67  |     .or(page.getByRole('textbox', { name: /email|email address/i }))
  68  |     .first()
  69  |   const fallbackEmailInput = page.locator('input[name="identifier"], input[type="email"]').first()
  70  |   const semanticReady = await semanticEmailInput.isVisible({ timeout: 20_000 }).catch(() => false)
  71  |   const emailInput = semanticReady ? semanticEmailInput : fallbackEmailInput
  72  | 
  73  |   await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
  74  |   await emailInput.fill(email)
  75  | 
  76  |   // Click "Continue" or press Enter to proceed to password step
  77  |   const continueBtn = page.locator('button[type="submit"]:visible, button:has-text("Continue"):visible').first()
  78  |   await continueBtn.click()
  79  | 
  80  |   const passwordField = page.locator('input[type="password"]:not([disabled]):not([aria-disabled="true"])').first()
  81  | 
  82  |   await Promise.race([
  83  |     passwordField.waitFor({ state: 'visible', timeout: 10_000 }),
  84  |     page.waitForURL(GOOGLE_OAUTH_URL, { timeout: 10_000 }).then(() => {
> 85  |       throw new Error(
      |             ^ Error: E2E auth was diverted to Google OAuth instead of staying on the local Clerk password flow. The configured E2E user/environment is not yielding a stable same-origin password login. Use a dedicated password-only Clerk test user for this environment.
  86  |         'E2E auth was diverted to Google OAuth instead of staying on the local Clerk password flow. The configured E2E user/environment is not yielding a stable same-origin password login. Use a dedicated password-only Clerk test user for this environment.'
  87  |       )
  88  |     }),
  89  |   ])
  90  | 
  91  |   await expect(passwordField).toBeEnabled()
  92  |   await passwordField.fill(password)
  93  | 
  94  |   // Submit sign-in
  95  |   await page.locator('button[type="submit"]:visible').first().click()
  96  | 
  97  |   // Wait for redirect away from sign-in
  98  |   await page.waitForURL(/\/(dashboard|onboarding|sign-in\/tasks)/, { timeout: 45_000 })
  99  |   console.log(`[setup] Sign-in completed. URL: ${page.url()}`)
  100 | 
  101 |   // Handle choose-organization task if Clerk presents it
  102 |   if (page.url().includes('/sign-in/tasks/choose-organization')) {
  103 |     console.log('[setup] Handling choose-organization task...')
  104 |     await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
  105 |     await page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 30_000 })
  106 |   }
  107 | 
  108 |   // Handle onboarding flow if no org exists yet
  109 |   if (page.url().includes('/onboarding')) {
  110 |     console.log('[setup] Completing onboarding...')
  111 |     await page.waitForSelector('#org-name', { timeout: 10_000 })
  112 |     await page.locator('#org-name').clear()
  113 |     await page.locator('#org-name').type('E2E Test Organization')
  114 |     await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 5_000 })
  115 |     await page.locator('button[type="submit"]:not([disabled])').first().click()
  116 |     await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  117 |     console.log('[setup] Onboarding complete.')
  118 |   }
  119 | 
  120 |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  121 |   console.log('[setup] Dashboard confirmed. Saving auth state...')
  122 | 
  123 |   await page.context().storageState({ path: STORAGE_STATE })
  124 |   console.log('[setup] Auth state saved to', STORAGE_STATE)
  125 | })
  126 | 
  127 | function assertPasswordCapableE2EUser(user: any, email: string) {
  128 |   const externalStrategies = Array.isArray(user.externalAccounts)
  129 |     ? user.externalAccounts
  130 |         .map((account: any) => account.provider || account.strategy || account.verification?.strategy)
  131 |         .filter(Boolean)
  132 |     : []
  133 | 
  134 |   if (user.passwordEnabled) return
  135 | 
  136 |   const externalSummary = externalStrategies.length > 0
  137 |     ? ` Connected external providers: ${externalStrategies.join(', ')}.`
  138 |     : ''
  139 | 
  140 |   throw new Error(
  141 |     `E2E user ${email} does not have password auth enabled in Clerk. Use a dedicated password-enabled Clerk test user for this environment.${externalSummary}`
  142 |   )
  143 | }
  144 | 
  145 | function logE2EUserAuthCapabilities(user: any) {
  146 |   const externalProviders = Array.isArray(user.externalAccounts)
  147 |     ? user.externalAccounts.map((account: any) => account.provider).filter(Boolean)
  148 |     : []
  149 | 
  150 |   console.log('[setup] Clerk user auth capabilities', {
  151 |     passwordEnabled: Boolean(user.passwordEnabled),
  152 |     externalProviders,
  153 |   })
  154 | }
  155 | 
  156 | async function ensureE2ETenant(clerk: ReturnType<typeof createClerkClient>, userId: string) {
  157 |   const memberships = await clerk.users.getOrganizationMembershipList({
  158 |     userId,
  159 |     limit: 10,
  160 |   })
  161 |   const membership = memberships.data.find((m) => {
  162 |     // Handle varying shapes returned by Clerk SDK across versions
  163 |     // Try multiple possible property names safely.
  164 |     try {
  165 |       const mi: any = m
  166 |       if (mi.public_user_data && mi.public_user_data.user_id === userId) return true
  167 |     } catch (e) {}
  168 |     try {
  169 |       const mi: any = m
  170 |       if (mi.publicUserData && (mi.publicUserData.user_id === userId || mi.publicUserData.userId === userId)) return true
  171 |     } catch (e) {}
  172 |     try {
  173 |       const mi: any = m
  174 |       if ((mi.user_id === userId) || (mi.userId === userId)) return true
  175 |     } catch (e) {}
  176 |     return false
  177 |   })
  178 | 
  179 |   if (membership) {
  180 |     const org = await clerk.organizations.getOrganization({ organizationId: membership.organization.id })
  181 |     await prisma.tenant.upsert({
  182 |       where: { clerkOrgId: org.id },
  183 |       create: {
  184 |         clerkOrgId: org.id,
  185 |         name: org.name,
```