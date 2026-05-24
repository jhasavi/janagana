# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 15-portal-regression.spec.ts >> portal without auth redirects to sign-in instead of crashing
- Location: e2e/tests/15-portal-regression.spec.ts:153:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/portal/e2e-org-b
Call log:
  - navigating to "http://localhost:3000/portal/e2e-org-b", waiting until "networkidle"

```

# Test source

```ts
  57  |   const hasNoMembership = await page.locator('body').filter({ hasText: /No membership found|not linked|not a member/i }).count() > 0
  58  |   const hasPortalContent = await page.locator('body').filter({ hasText: /Member Portal|My Profile|profile/i }).count() > 0
  59  | 
  60  |   expect(hasOrgName || hasNoMembership || hasPortalContent).toBe(true)
  61  | })
  62  | 
  63  | // ─── Test 2: Portal donations page ───────────────────────────────────────────
  64  | 
  65  | test('portal donations page does not crash', async ({ page }) => {
  66  |   const fixtures = await getFixtureRecord()
  67  |   await signInAs(page, fixtures.userB)
  68  | 
  69  |   const response = await page.goto('/portal/e2e-org-b/donations', { waitUntil: 'networkidle' })
  70  | 
  71  |   expect(response?.status()).not.toBe(500)
  72  |   await expect(page.locator('body')).not.toContainText('Application error')
  73  |   await expect(page.locator('body')).not.toContainText('Internal Server Error')
  74  | 
  75  |   // Shows donation history section or empty state or no-membership fallback
  76  |   const hasContent = await page.locator('body').filter({ hasText: /Giving history|No donations|donation|No membership found/i }).count() > 0
  77  |   expect(hasContent).toBe(true)
  78  | })
  79  | 
  80  | // ─── Test 3: Portal events page ──────────────────────────────────────────────
  81  | 
  82  | test('portal events page does not crash and shows events or empty state', async ({ page }) => {
  83  |   const fixtures = await getFixtureRecord()
  84  |   await signInAs(page, fixtures.userB)
  85  | 
  86  |   const response = await page.goto('/portal/e2e-org-b/events', { waitUntil: 'networkidle' })
  87  | 
  88  |   expect(response?.status()).not.toBe(500)
  89  |   await expect(page.locator('body')).not.toContainText('Application error')
  90  |   await expect(page.locator('body')).not.toContainText('Internal Server Error')
  91  | 
  92  |   // Should show either events (our seeded E2E Test Event) or an empty state or no-membership
  93  |   const hasContent = await page.locator('body').filter({ hasText: /Upcoming Events|E2E Test Event|No events|No membership found/i }).count() > 0
  94  |   expect(hasContent).toBe(true)
  95  | })
  96  | 
  97  | // ─── Test 4: Invalid portal slug ─────────────────────────────────────────────
  98  | 
  99  | test('invalid portal slug returns 404 or not-found state without crashing', async ({ page }) => {
  100 |   const fixtures = await getFixtureRecord()
  101 |   await signInAs(page, fixtures.userB)
  102 | 
  103 |   const response = await page.goto('/portal/not-a-real-org-xyz-9999', { waitUntil: 'networkidle' })
  104 | 
  105 |   // Must not be a 500 server crash
  106 |   expect(response?.status()).not.toBe(500)
  107 |   await expect(page.locator('body')).not.toContainText('Application error')
  108 |   await expect(page.locator('body')).not.toContainText('Internal Server Error')
  109 | 
  110 |   // Should be a 404 or a graceful "no membership" message
  111 |   const is404 = response?.status() === 404
  112 |   const hasNotFound = await page.locator('body').filter({ hasText: /not found|404|No membership found/i }).count() > 0
  113 |   expect(is404 || hasNotFound).toBe(true)
  114 | })
  115 | 
  116 | // ─── Test 5: Admin active org does not leak into portal ──────────────────────
  117 | 
  118 | test('portal resolves org by URL slug not by active dashboard org cookie', async ({ page }) => {
  119 |   const fixtures = await getFixtureRecord()
  120 | 
  121 |   // Sign in as user A (belongs to e2e-org-a)
  122 |   await signInAs(page, fixtures.userA)
  123 | 
  124 |   // Set active org cookie to e2e-org-a (as if user A selected their dashboard org)
  125 |   await page.context().addCookies([
  126 |     {
  127 |       name: 'JG_ACTIVE_ORG',
  128 |       value: fixtures.userA.orgIds[0],
  129 |       url: APP_BASE_URL,
  130 |       httpOnly: true,
  131 |       sameSite: 'Lax',
  132 |       secure: APP_BASE_URL.startsWith('https://'),
  133 |     },
  134 |   ])
  135 | 
  136 |   // Visit org-B portal while org-A is the active dashboard org
  137 |   const response = await page.goto('/portal/e2e-org-b', { waitUntil: 'networkidle' })
  138 | 
  139 |   // Must not crash
  140 |   expect(response?.status()).not.toBe(500)
  141 |   await expect(page.locator('body')).not.toContainText('Application error')
  142 | 
  143 |   // Must NOT show org-A name in the portal header (portal resolved org-b by slug)
  144 |   await expect(page.locator('body')).not.toContainText('E2E Org A')
  145 | 
  146 |   // Should show either "No membership found" (user A has no member in org-b) or org-b content
  147 |   const hasOrgBOrNoMembership = await page.locator('body').filter({ hasText: /E2E Org B|No membership found/i }).count() > 0
  148 |   expect(hasOrgBOrNoMembership).toBe(true)
  149 | })
  150 | 
  151 | // ─── Test 6: Member-only portal without auth ─────────────────────────────────
  152 | 
  153 | test('portal without auth redirects to sign-in instead of crashing', async ({ page }) => {
  154 |   // No auth cookie at all
  155 |   await page.context().clearCookies()
  156 | 
> 157 |   const response = await page.goto('/portal/e2e-org-b', { waitUntil: 'networkidle' })
      |                               ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/portal/e2e-org-b
  158 | 
  159 |   // Must not crash
  160 |   expect(response?.status()).not.toBe(500)
  161 |   await expect(page.locator('body')).not.toContainText('Application error')
  162 |   await expect(page.locator('body')).not.toContainText('Internal Server Error')
  163 | 
  164 |   // Must end up at sign-in (middleware redirected unauthenticated user)
  165 |   expect(page.url()).toMatch(/\/sign-in/)
  166 | })
  167 | 
```