import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const SUFFIX = Date.now().toString().slice(-6)
const NEW_EMAIL = `csv-import-${SUFFIX}@example.com`

test('export and import members CSV', async ({ page }) => {
  // Navigate to members page
  await page.goto('/dashboard/members')
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('h1:has-text("Members")')).toBeVisible()

  // Trigger export and capture download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export CSV")'),
  ])

  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const csv = await fs.promises.readFile(downloadPath as string, 'utf8')
  expect(csv).toContain('firstName')
  expect(csv).toContain('email')

  // Prepare a small CSV to import (unique email)
  const outDir = path.join(process.cwd(), 'e2e', 'tmp')
  fs.mkdirSync(outDir, { recursive: true })
  const importPath = path.join(outDir, `import-${SUFFIX}.csv`)
  const importCsv = `firstName,lastName,email\nCSV,User,${NEW_EMAIL}\n`
  fs.writeFileSync(importPath, importCsv, 'utf8')

  // Open import dialog and set file
  await page.click('button:has-text("Import CSV")')
  // file input is hidden but Playwright can set it
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(importPath)

  // Click Import inside the dialog. Use a forced click to avoid overlay/animation interception.
  const dialog = page.getByRole('dialog').first()
  await dialog.locator('button:has-text("Import")').first().click({ force: true })

  // Expect import success UI
  await expect(page.locator('text=Import complete')).toBeVisible({ timeout: 10000 })

  // Verify the new member appears in the members table
  // Wait for eventual revalidation and table update
  await expect(page.locator(`table >> text=${NEW_EMAIL}`)).toBeVisible({ timeout: 10000 })
})
