import { chromium } from 'playwright'

async function main() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  
  await context.addCookies([{
    name: 'JG_TEST_AUTH',
    value: encodeURIComponent(JSON.stringify({ userId: 'e2e-user-b', email: 'e2e-user-b@example.com' })),
    url: 'http://localhost:3000',
    httpOnly: true,
    sameSite: 'Lax',
    secure: false,
  }])
  
  const page = await context.newPage()
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'load' })
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  await page.waitForTimeout(3000)  // wait for streaming to complete
  
  const count = await page.locator('[data-testid="launch-center-cta-profile"]').count()
  const all = await page.locator('[data-testid="launch-center-cta-profile"]').all()
  
  console.log('Count:', count)
  for (const el of all) {
    const visible = await el.isVisible()
    const box = await el.boundingBox()
    const href = await el.getAttribute('href')
    console.log('- visible:', visible, 'href:', href, 'box:', JSON.stringify(box))
  }
  
  await browser.close()
}

main().catch(console.error)
