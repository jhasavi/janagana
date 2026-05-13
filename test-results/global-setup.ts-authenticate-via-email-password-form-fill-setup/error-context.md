# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: global-setup.ts >> authenticate via email/password form fill
- Location: e2e/tests/global-setup.ts:25:6

# Error details

```
TimeoutError: page.waitForURL: Timeout 45000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "https://accounts.google.com/v3/signin/identifier?opparams=%253F&dsh=S-47369002%3A1778691100022002&access_type=offline&client_id=787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com&o2v=1&redirect_uri=https%3A%2F%2Fclerk.shared.lcl.dev%2Fv1%2Foauth_callback&response_type=code&scope=openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&service=lso&state=1c55io7cfcorie40vcug2vyynek97azr5wu6ib6o&flowName=GeneralOAuthLite&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Flegacy%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMGIvWyz1-u-2x3jTYpF8mKepUjI-xACP-I3Qk-CPqT-MUeLTVF9AVAWjHnbricmn_zOzqLpNiF5BIQRRQiNjVkN22N7PVBFJ0BKiT9vW_jMuMmUM1EXU94N5DLk_unYfrvycDxcKMnMUqh7T-d7qFa7jBMAbUJ5ZYh1_4YiKTRKicGZIIofF01CyYqUWO-NQqdaybBsb8jzhAp2krnVXfrEasDcaPtj92rGjnt4zZCAi1PJ2S8n6CxCQQ4V_8ziJ6XxRQIT-rUY13oFeH4eY3KtneKjXY2vn9v9Hxb4OM_7nglpLp7EtQsCquClFVW1oqf0HhKMTxscJFuj_y44Kzbkp3Ca101ACsdh8_w-KwK_XQjOeQPzev_3T7_cBP8-8miUiFVuEeIqb07R5b4WbEqOtaGEIyHKYEoLF2qVBRP91fvbXNu8JksLfxuW1WGTMcz2a4QGDbOebl1OpxJ7_MI5orfow%26flowName%3DGeneralOAuthFlow%26as%3DS-47369002%253A1778691100022002%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%23&app_domain=https%3A%2F%2Fclerk.shared.lcl.dev&rart=ANgoxcdHzNwxmhWf7VAZsVZ-7vxZHSpG3lhSqsVpgBEx5KrmK3C9jqQSeb6XqCmhCWweDeAzrnlD4zN_pyKR93_lR7bsaaem5CuhUbVgEtsoCfEm0KXBZ58"
============================================================
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
              - /url: /signin/v2/usernamerecovery?access_type=offline&app_domain=https://clerk.shared.lcl.dev&client_id=787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com&continue=https://accounts.google.com/signin/oauth/legacy/consent?authuser%3Dunknown%26part%3DAJi8hAMGIvWyz1-u-2x3jTYpF8mKepUjI-xACP-I3Qk-CPqT-MUeLTVF9AVAWjHnbricmn_zOzqLpNiF5BIQRRQiNjVkN22N7PVBFJ0BKiT9vW_jMuMmUM1EXU94N5DLk_unYfrvycDxcKMnMUqh7T-d7qFa7jBMAbUJ5ZYh1_4YiKTRKicGZIIofF01CyYqUWO-NQqdaybBsb8jzhAp2krnVXfrEasDcaPtj92rGjnt4zZCAi1PJ2S8n6CxCQQ4V_8ziJ6XxRQIT-rUY13oFeH4eY3KtneKjXY2vn9v9Hxb4OM_7nglpLp7EtQsCquClFVW1oqf0HhKMTxscJFuj_y44Kzbkp3Ca101ACsdh8_w-KwK_XQjOeQPzev_3T7_cBP8-8miUiFVuEeIqb07R5b4WbEqOtaGEIyHKYEoLF2qVBRP91fvbXNu8JksLfxuW1WGTMcz2a4QGDbOebl1OpxJ7_MI5orfow%26flowName%3DGeneralOAuthFlow%26as%3DS-47369002%253A1778691100022002%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%23&dsh=S-47369002:1778691100022002&flowName=GeneralOAuthLite&o2v=1&opparams=%253F&rart=ANgoxcdHzNwxmhWf7VAZsVZ-7vxZHSpG3lhSqsVpgBEx5KrmK3C9jqQSeb6XqCmhCWweDeAzrnlD4zN_pyKR93_lR7bsaaem5CuhUbVgEtsoCfEm0KXBZ58&redirect_uri=https://clerk.shared.lcl.dev/v1/oauth_callback&response_type=code&scope=openid+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile&service=lso&state=1c55io7cfcorie40vcug2vyynek97azr5wu6ib6o
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
            - /url: /lifecycle/flows/signup?access_type=offline&app_domain=https://clerk.shared.lcl.dev&client_id=787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com&continue=https://accounts.google.com/signin/oauth/legacy/consent?authuser%3Dunknown%26part%3DAJi8hAMGIvWyz1-u-2x3jTYpF8mKepUjI-xACP-I3Qk-CPqT-MUeLTVF9AVAWjHnbricmn_zOzqLpNiF5BIQRRQiNjVkN22N7PVBFJ0BKiT9vW_jMuMmUM1EXU94N5DLk_unYfrvycDxcKMnMUqh7T-d7qFa7jBMAbUJ5ZYh1_4YiKTRKicGZIIofF01CyYqUWO-NQqdaybBsb8jzhAp2krnVXfrEasDcaPtj92rGjnt4zZCAi1PJ2S8n6CxCQQ4V_8ziJ6XxRQIT-rUY13oFeH4eY3KtneKjXY2vn9v9Hxb4OM_7nglpLp7EtQsCquClFVW1oqf0HhKMTxscJFuj_y44Kzbkp3Ca101ACsdh8_w-KwK_XQjOeQPzev_3T7_cBP8-8miUiFVuEeIqb07R5b4WbEqOtaGEIyHKYEoLF2qVBRP91fvbXNu8JksLfxuW1WGTMcz2a4QGDbOebl1OpxJ7_MI5orfow%26flowName%3DGeneralOAuthFlow%26as%3DS-47369002%253A1778691100022002%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%23&dsh=S-47369002:1778691100022002&flowEntry=SignUp&flowName=GlifWebSignIn&o2v=1&opparams=%253F&rart=ANgoxcdHzNwxmhWf7VAZsVZ-7vxZHSpG3lhSqsVpgBEx5KrmK3C9jqQSeb6XqCmhCWweDeAzrnlD4zN_pyKR93_lR7bsaaem5CuhUbVgEtsoCfEm0KXBZ58&redirect_uri=https://clerk.shared.lcl.dev/v1/oauth_callback&response_type=code&scope=openid+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/userinfo.profile&service=lso&signInUrl=https://accounts.google.com/signin/oauth?access_type%3Doffline%26app_domain%3Dhttps://clerk.shared.lcl.dev%26client_id%3D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%26continue%3Dhttps://accounts.google.com/signin/oauth/legacy/consent?authuser%253Dunknown%2526part%253DAJi8hAMGIvWyz1-u-2x3jTYpF8mKepUjI-xACP-I3Qk-CPqT-MUeLTVF9AVAWjHnbricmn_zOzqLpNiF5BIQRRQiNjVkN22N7PVBFJ0BKiT9vW_jMuMmUM1EXU94N5DLk_unYfrvycDxcKMnMUqh7T-d7qFa7jBMAbUJ5ZYh1_4YiKTRKicGZIIofF01CyYqUWO-NQqdaybBsb8jzhAp2krnVXfrEasDcaPtj92rGjnt4zZCAi1PJ2S8n6CxCQQ4V_8ziJ6XxRQIT-rUY13oFeH4eY3KtneKjXY2vn9v9Hxb4OM_7nglpLp7EtQsCquClFVW1oqf0HhKMTxscJFuj_y44Kzbkp3Ca101ACsdh8_w-KwK_XQjOeQPzev_3T7_cBP8-8miUiFVuEeIqb07R5b4WbEqOtaGEIyHKYEoLF2qVBRP91fvbXNu8JksLfxuW1WGTMcz2a4QGDbOebl1OpxJ7_MI5orfow%2526flowName%253DGeneralOAuthFlow%2526as%253DS-47369002%25253A1778691100022002%2526client_id%253D787459168867-0v2orf3qo56uocsi84iroseoahhuovdm.apps.googleusercontent.com%2523%26dsh%3DS-47369002:1778691100022002%26flowName%3DGeneralOAuthLite%26o2v%3D1%26opparams%3D%25253F%26rart%3DANgoxcdHzNwxmhWf7VAZsVZ-7vxZHSpG3lhSqsVpgBEx5KrmK3C9jqQSeb6XqCmhCWweDeAzrnlD4zN_pyKR93_lR7bsaaem5CuhUbVgEtsoCfEm0KXBZ58%26redirect_uri%3Dhttps://clerk.shared.lcl.dev/v1/oauth_callback%26response_type%3Dcode%26scope%3Dopenid%2Bhttps://www.googleapis.com/auth/userinfo.email%2Bhttps://www.googleapis.com/auth/userinfo.profile%26service%3Dlso%26state%3D1c55io7cfcorie40vcug2vyynek97azr5wu6ib6o&state=1c55io7cfcorie40vcug2vyynek97azr5wu6ib6o
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
  26  |   const email = process.env.E2E_CLERK_EMAIL
  27  |   const password = process.env.E2E_CLERK_PASSWORD
  28  |   const secretKey = process.env.CLERK_SECRET_KEY
  29  |   const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.TENANT_APP_BASE_URL || 'http://localhost:3000'
  30  |   const signInPath = process.env.E2E_SIGN_IN_PATH || process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'
  31  |   const forceSetup = process.env.E2E_FORCE_AUTH_SETUP === 'true'
  32  | 
  33  |   if (!email) throw new Error('Missing E2E_CLERK_EMAIL in .env')
  34  |   if (!password) throw new Error('Missing E2E_CLERK_PASSWORD in .env')
  35  |   if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY in .env')
  36  | 
  37  |   const authDir = path.dirname(STORAGE_STATE)
  38  |   if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
  39  | 
  40  |   // If a saved auth state already exists, skip re-running the setup
  41  |   if (fs.existsSync(STORAGE_STATE) && !forceSetup) {
  42  |     console.log('[setup] Existing auth state found, skipping global setup.')
  43  |     return
  44  |   }
  45  | 
  46  |   if (fs.existsSync(STORAGE_STATE) && forceSetup) {
  47  |     fs.rmSync(STORAGE_STATE, { force: true })
  48  |     console.log('[setup] Removed stale auth state due to E2E_FORCE_AUTH_SETUP=true')
  49  |   }
  50  | 
  51  |   // Ensure E2E tenant exists in Clerk + DB before sign-in
  52  |   const clerk = createClerkClient({ secretKey })
  53  |   const { data: users } = await clerk.users.getUserList({ emailAddress: [email] })
  54  |   if (!users.length) throw new Error(`Test user "${email}" not found in Clerk Dashboard.`)
  55  |   const user = await clerk.users.getUser(users[0].id)
  56  |   logE2EUserAuthCapabilities(user)
  57  |   assertPasswordCapableE2EUser(user, email)
  58  |   const userId = user.id
  59  |   console.log(`[setup] Found Clerk user: ${userId}`)
  60  |   await ensureE2ETenant(clerk, userId)
  61  | 
  62  |   // ── Sign in via form fill ──────────────────────────────────────────────────
  63  |   const signInUrl = new URL(signInPath, baseUrl).toString()
  64  |   console.log(`[setup] Navigating to ${signInUrl}...`)
  65  |   await page.goto(signInUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  66  | 
  67  |   // Fail fast when route drift lands on a 404 page instead of the auth form.
  68  |   await expect(page.getByRole('heading', { name: /404|page not found/i })).toHaveCount(0)
  69  | 
  70  |   // Prefer accessible locators first, then fall back to robust structural selectors.
  71  |   const semanticEmailInput = page
  72  |     .getByLabel(/email|email address/i)
  73  |     .or(page.getByRole('textbox', { name: /email|email address/i }))
  74  |     .first()
  75  |   const fallbackEmailInput = page.locator('input[name="identifier"], input[type="email"]').first()
  76  |   const semanticReady = await semanticEmailInput.isVisible({ timeout: 20_000 }).catch(() => false)
  77  |   const emailInput = semanticReady ? semanticEmailInput : fallbackEmailInput
  78  | 
  79  |   await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
  80  |   await emailInput.fill(email)
  81  | 
  82  |   const passwordField = page.locator('input[type="password"]:not([disabled]):not([aria-disabled="true"])').first()
  83  |   let passwordVisible = await passwordField.isVisible().catch(() => false)
  84  | 
  85  |   // Some Clerk screens are two-step (email -> password), others show both fields at once.
  86  |   if (!passwordVisible) {
  87  |     const continueBtn = page.locator('button[type="submit"]:visible, button:has-text("Continue"):visible').first()
  88  |     await continueBtn.click()
  89  |     passwordVisible = await passwordField.waitFor({ state: 'visible', timeout: 10_000 })
  90  |       .then(() => true)
  91  |       .catch(() => false)
  92  |   }
  93  | 
  94  |   if (!passwordVisible) {
  95  |     if (GOOGLE_OAUTH_URL.test(page.url())) {
  96  |       console.log('[setup] OAuth diversion detected, attempting fallback to password flow...')
  97  |       await page.goto(signInUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  98  | 
  99  |       const usePasswordBtn = page.locator(
  100 |         'button:has-text("Use password"), button:has-text("Continue with password"), button:has-text("Use another method")'
  101 |       ).first()
  102 | 
  103 |       if (await usePasswordBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
  104 |         await usePasswordBtn.click()
  105 |       }
  106 | 
  107 |       const fallbackEmailInput = page.locator('input[name="identifier"], input[type="email"]').first()
  108 |       await fallbackEmailInput.waitFor({ state: 'visible', timeout: 15_000 })
  109 |       await fallbackEmailInput.fill(email)
  110 |       await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
  111 |       await passwordField.waitFor({ state: 'visible', timeout: 12_000 })
  112 |     } else {
  113 |       throw new Error(
  114 |         'E2E auth could not reach a password prompt after identifier submission. Check Clerk sign-in settings for this environment.'
  115 |       )
  116 |     }
  117 |   }
  118 | 
  119 |   await expect(passwordField).toBeEnabled()
  120 |   await passwordField.fill(password)
  121 | 
  122 |   // Submit sign-in
  123 |   await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
  124 | 
  125 |   // Wait for redirect away from sign-in
> 126 |   await page.waitForURL(/\/(dashboard|onboarding|sign-in\/tasks)/, { timeout: 45_000 })
      |              ^ TimeoutError: page.waitForURL: Timeout 45000ms exceeded.
  127 |   console.log(`[setup] Sign-in completed. URL: ${page.url()}`)
  128 | 
  129 |   // Handle choose-organization task if Clerk presents it
  130 |   if (page.url().includes('/sign-in/tasks/choose-organization')) {
  131 |     console.log('[setup] Handling choose-organization task...')
  132 |     await page.locator('button:has-text("Continue"):visible, button[type="submit"]:visible').first().click()
  133 |     await page.waitForURL(/(\/dashboard|\/onboarding)/, { timeout: 30_000 })
  134 |   }
  135 | 
  136 |   // Handle onboarding flow if no org exists yet
  137 |   if (page.url().includes('/onboarding')) {
  138 |     console.log('[setup] Completing onboarding...')
  139 |     await page.waitForSelector('#org-name', { timeout: 10_000 })
  140 |     await page.locator('#org-name').clear()
  141 |     await page.locator('#org-name').type('E2E Test Organization')
  142 |     await page.locator('button[type="submit"]:not([disabled])').first().waitFor({ timeout: 5_000 })
  143 |     await page.locator('button[type="submit"]:not([disabled])').first().click()
  144 |     await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  145 |     console.log('[setup] Onboarding complete.')
  146 |   }
  147 | 
  148 |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  149 |   console.log('[setup] Dashboard confirmed. Saving auth state...')
  150 | 
  151 |   await page.context().storageState({ path: STORAGE_STATE })
  152 |   console.log('[setup] Auth state saved to', STORAGE_STATE)
  153 | })
  154 | 
  155 | function assertPasswordCapableE2EUser(user: any, email: string) {
  156 |   const externalStrategies = Array.isArray(user.externalAccounts)
  157 |     ? user.externalAccounts
  158 |         .map((account: any) => account.provider || account.strategy || account.verification?.strategy)
  159 |         .filter(Boolean)
  160 |     : []
  161 | 
  162 |   if (user.passwordEnabled) return
  163 | 
  164 |   const externalSummary = externalStrategies.length > 0
  165 |     ? ` Connected external providers: ${externalStrategies.join(', ')}.`
  166 |     : ''
  167 | 
  168 |   throw new Error(
  169 |     `E2E user ${email} does not have password auth enabled in Clerk. Use a dedicated password-enabled Clerk test user for this environment.${externalSummary}`
  170 |   )
  171 | }
  172 | 
  173 | function logE2EUserAuthCapabilities(user: any) {
  174 |   const externalProviders = Array.isArray(user.externalAccounts)
  175 |     ? user.externalAccounts.map((account: any) => account.provider).filter(Boolean)
  176 |     : []
  177 | 
  178 |   console.log('[setup] Clerk user auth capabilities', {
  179 |     passwordEnabled: Boolean(user.passwordEnabled),
  180 |     externalProviders,
  181 |   })
  182 | }
  183 | 
  184 | async function ensureE2ETenant(clerk: ReturnType<typeof createClerkClient>, userId: string) {
  185 |   const memberships = await clerk.users.getOrganizationMembershipList({
  186 |     userId,
  187 |     limit: 10,
  188 |   })
  189 |   const membership = memberships.data.find((m) => {
  190 |     // Handle varying shapes returned by Clerk SDK across versions
  191 |     // Try multiple possible property names safely.
  192 |     try {
  193 |       const mi: any = m
  194 |       if (mi.public_user_data && mi.public_user_data.user_id === userId) return true
  195 |     } catch (e) {}
  196 |     try {
  197 |       const mi: any = m
  198 |       if (mi.publicUserData && (mi.publicUserData.user_id === userId || mi.publicUserData.userId === userId)) return true
  199 |     } catch (e) {}
  200 |     try {
  201 |       const mi: any = m
  202 |       if ((mi.user_id === userId) || (mi.userId === userId)) return true
  203 |     } catch (e) {}
  204 |     return false
  205 |   })
  206 | 
  207 |   if (membership) {
  208 |     const org = await clerk.organizations.getOrganization({ organizationId: membership.organization.id })
  209 |     await prisma.tenant.upsert({
  210 |       where: { clerkOrgId: org.id },
  211 |       create: {
  212 |         clerkOrgId: org.id,
  213 |         name: org.name,
  214 |         slug: org.slug,
  215 |       },
  216 |       update: {
  217 |         name: org.name,
  218 |       },
  219 |     })
  220 |     return org.id
  221 |   }
  222 | 
  223 |   const orgName = 'E2E Test Organization'
  224 |   const org = await clerk.organizations.createOrganization({
  225 |     name: orgName,
  226 |     createdBy: userId,
```