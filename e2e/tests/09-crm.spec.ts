import { expect, test } from '@playwright/test'

const SUFFIX = Date.now().toString().slice(-6)
const CONTACT_A_EMAIL = `e2e-contact-a-${SUFFIX}@example.com`
const CONTACT_B_EMAIL = `e2e-contact-b-${SUFFIX}@example.com`
const COMPANY_NAME = `E2E Company ${SUFFIX}`
const DEAL_TITLE = `E2E Deal ${SUFFIX}`
const TASK_TITLE = `E2E Task ${SUFFIX}`
const ACTIVITY_TITLE = `E2E Activity ${SUFFIX}`

async function completeOnboardingIfNeeded(page: any) {
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  if (page.url().includes('/onboarding')) {
    await page.locator('#org-name').fill(`E2E Org ${SUFFIX}`)
    await page.locator('button[type="submit"]', { hasText: /create|continue|finish|start/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
  }
  await expect(page).toHaveURL(/\/dashboard/)
}

async function selectRadixOption(page: any, labelText: string, optionText: string) {
  const trigger = page.getByLabel(labelText).locator('..').locator('button').first()
  if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
    await trigger.click()
    await page.getByRole('option', { name: optionText }).click()
  }
}

async function openRowActions(page: any, rowText: string) {
  const row = page.locator('tr', { hasText: rowText }).first()
  await expect(row).toBeVisible()
  const actions = row.getByRole('button', { name: 'Actions' }).first()
  await actions.click()
}

async function clickMenuItem(page: any, label: RegExp) {
  await page.getByRole('menuitem', { name: label }).click()
}

async function confirmDialog(page: any, buttonText: RegExp) {
  await page.getByRole('button', { name: buttonText }).click()
}

async function navigateToContacts(page: any) {
  await page.goto('/dashboard/crm', { waitUntil: 'networkidle' })
  await expect(page.locator('h1:has-text("Contacts")').first()).toBeVisible({ timeout: 15000 })
}

async function navigateToCompanies(page: any) {
  await page.goto('/dashboard/crm/companies', { waitUntil: 'networkidle' })
  await expect(page.locator('h1:has-text("Companies")').first()).toBeVisible({ timeout: 15000 })
}

async function navigateToDeals(page: any) {
  await page.goto('/dashboard/crm/deals', { waitUntil: 'networkidle' })
  await expect(page.locator('text=/Deals/').first()).toBeVisible({ timeout: 15000 })
}

async function navigateToTasks(page: any) {
  await page.goto('/dashboard/crm/tasks', { waitUntil: 'networkidle' })
  await expect(page.locator('h1:has-text("Tasks")').first()).toBeVisible({ timeout: 15000 })
}

async function createContact(page: any, firstName: string, lastName: string, email: string) {
  await page.goto('/dashboard/crm/contacts/new', { waitUntil: 'networkidle' })
  await expect(page.locator('h1:has-text("Add Contact")').first()).toBeVisible({ timeout: 15000 })
  await page.fill('input#firstName', firstName)
  await page.fill('input#lastName', lastName)
  await page.fill('input#email', email)
  await page.fill('input#phone', '+1 555 000 0000')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/crm/, { timeout: 30000 })
  await expect(page.locator(`text=${firstName} ${lastName}`)).toBeVisible({ timeout: 15000 })
}

async function createCompany(page: any, name: string) {
  await page.goto('/dashboard/crm/companies/new', { waitUntil: 'networkidle' })
  await expect(page.locator('h1:has-text("Add Company")').first()).toBeVisible({ timeout: 15000 })
  await page.fill('input#name', name)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/crm\/companies/, { timeout: 30000 })
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 15000 })
}

async function createDeal(page: any, title: string, contactName: string) {
  await page.goto('/dashboard/crm/deals/new', { waitUntil: 'networkidle' })
  await expect(page.getByText('Deal Title')).toBeVisible({ timeout: 15000 })
  await selectRadixOption(page, 'Contact *', contactName)
  await page.fill('input#title', title)
  await page.fill('input#valueCents', '10000')
  await page.fill('input#probability', '25')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/crm\/deals/, { timeout: 30000 })
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 15000 })
}

async function createTask(page: any, title: string) {
  await page.goto('/dashboard/crm/tasks/new', { waitUntil: 'networkidle' })
  await expect(page.getByText('Title *')).toBeVisible({ timeout: 15000 })
  await page.fill('input#title', title)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard\/crm\/tasks/, { timeout: 30000 })
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 15000 })
}

async function searchMemberContact(page: any, email: string) {
  await page.goto('/dashboard/members/new', { waitUntil: 'networkidle' })
  await expect(page.locator('text=Add Member')).toBeVisible({ timeout: 15000 })
  await page.fill('input#email', email)
  await page.getByRole('button', { name: /Find Contact/i }).click()
  await expect(page.locator(`text=Using existing contact`)).toBeVisible({ timeout: 20000 })
}

async function addActivityQuickAdd(page: any, title: string) {
  await page.getByRole('button', { name: /Log Activity/i }).click()
  await page.fill('input#title', title)
  await page.getByRole('button', { name: /Log Activity/i }).click()
  await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 15000 })
}

test.describe('CRM full browser validation', () => {
  test('runs onboarding and full CRM CRUD workflow', async ({ page }) => {
    await completeOnboardingIfNeeded(page)

    await navigateToContacts(page)

    await createContact(page, 'E2E', `ContactA${SUFFIX}`, CONTACT_A_EMAIL)
    await createContact(page, 'E2E', `ContactB${SUFFIX}`, CONTACT_B_EMAIL)

    await page.locator(`a:has-text("E2E ContactB${SUFFIX}")`).first().click()
    await page.waitForURL(/\/dashboard\/crm\/contacts\//, { timeout: 20000 })
    await page.getByRole('link', { name: /Edit/i }).click()
    await page.waitForURL(/\/dashboard\/crm\/contacts\//, { timeout: 20000 })
    await page.fill('input#jobTitle', 'CRM QA Lead')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard\/crm/, { timeout: 30000 })
    await expect(page.locator('text=CRM QA Lead')).toBeVisible({ timeout: 15000 })

    await navigateToContacts(page)
    await openRowActions(page, `E2E ContactA${SUFFIX}`)
    await clickMenuItem(page, /Delete|Archive/i)
    await confirmDialog(page, /Archive Contact|Delete Contact/i)
    await expect(page.locator(`text=E2E ContactA${SUFFIX}`)).not.toBeVisible({ timeout: 15000 })

    await createCompany(page, COMPANY_NAME)
    await openRowActions(page, COMPANY_NAME)
    await clickMenuItem(page, /Edit/i)
    await page.fill('input#industry', 'Software')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard\/crm\/companies/, { timeout: 30000 })
    await expect(page.locator(`text=Software`)).toBeVisible({ timeout: 15000 })
    await openRowActions(page, COMPANY_NAME)
    await clickMenuItem(page, /Delete/i)
    await confirmDialog(page, /Delete Company/i)
    await expect(page.locator(`text=${COMPANY_NAME}`)).not.toBeVisible({ timeout: 15000 })

    await createDeal(page, DEAL_TITLE, `E2E ContactB${SUFFIX}`)
    await navigateToDeals(page)
    await openRowActions(page, DEAL_TITLE)
    await clickMenuItem(page, /Edit/i)
    await page.fill('input#title', `${DEAL_TITLE} Updated`)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard\/crm\/deals/, { timeout: 30000 })
    await expect(page.locator(`text=${DEAL_TITLE} Updated`)).toBeVisible({ timeout: 15000 })
    await openRowActions(page, `${DEAL_TITLE} Updated`)
    await clickMenuItem(page, /Delete Deal/i)
    await confirmDialog(page, /Delete Deal/i)
    await expect(page.locator(`text=${DEAL_TITLE} Updated`)).not.toBeVisible({ timeout: 15000 })

    await createTask(page, TASK_TITLE)
    await navigateToTasks(page)
    await openRowActions(page, TASK_TITLE)
    await clickMenuItem(page, /Edit/i)
    await page.fill('input#title', `${TASK_TITLE} Updated`)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard\/crm\/tasks/, { timeout: 30000 })
    await expect(page.locator(`text=${TASK_TITLE} Updated`)).toBeVisible({ timeout: 15000 })
    await openRowActions(page, `${TASK_TITLE} Updated`)
    await clickMenuItem(page, /Delete/i)
    await confirmDialog(page, /Delete Task/i)
    await expect(page.locator(`text=${TASK_TITLE} Updated`)).not.toBeVisible({ timeout: 15000 })

    await navigateToContacts(page)
    await page.locator(`a:has-text("E2E ContactB${SUFFIX}")`).first().click()
    await page.waitForURL(/\/dashboard\/crm\/contacts\//, { timeout: 20000 })
    await addActivityQuickAdd(page, ACTIVITY_TITLE)

    await searchMemberContact(page, CONTACT_B_EMAIL)
  })
})
