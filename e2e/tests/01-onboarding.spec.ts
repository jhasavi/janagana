import { test, expect } from '../fixtures/auth';

test.describe('Onboarding Flow', () => {
  test('New organization registers on marketing page', async ({ page, createTestOrg }) => {
    await createTestOrg(page);
    
    // Should be on onboarding page
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('Completes onboarding wizard', async ({ page, createTestOrg }) => {
    await createTestOrg(page);
    
    // Step 1: Basic info
    await expect(page.locator('h1')).toContainText('Welcome');
    await page.fill('input[name="organizationName"]', 'Test Org');
    await page.click('button:has-text("Next")');
    
    // Step 2: Admin details
    await page.fill('input[name="adminName"]', 'Test Admin');
    await page.fill('input[name="adminEmail"]', 'admin@test.com');
    await page.click('button:has-text("Next")');
    
    // Step 3: Choose plan
    await page.click('text=Starter');
    await page.click('button:has-text("Next")');
    
    // Step 4: Review
    await expect(page.locator('text=Test Org')).toBeVisible();
    await page.click('button:has-text("Complete Setup")');
    
    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/);
  });

  test('Dashboard is accessible', async ({ page, createTestOrg }) => {
    await createTestOrg(page);
    
    // Complete onboarding quickly
    await page.fill('input[name="organizationName"]', 'Test Org');
    await page.click('button:has-text("Next")');
    await page.fill('input[name="adminName"]', 'Test Admin');
    await page.fill('input[name="adminEmail"]', 'admin@test.com');
    await page.click('button:has-text("Next")');
    await page.click('text=Starter');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Complete Setup")');
    
    // Wait for dashboard
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Setup checklist shown', async ({ page, createTestOrg }) => {
    await createTestOrg(page);
    
    // Complete onboarding
    await page.fill('input[name="organizationName"]', 'Test Org');
    await page.click('button:has-text("Next")');
    await page.fill('input[name="adminName"]', 'Test Admin');
    await page.fill('input[name="adminEmail"]', 'admin@test.com');
    await page.click('button:has-text("Next")');
    await page.click('text=Starter');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Complete Setup")');
    
    // Check for setup checklist
    await page.waitForURL(/\/dashboard/);
    await expect(page.locator('text=Setup Checklist')).toBeVisible();
    await expect(page.locator('text=Create your first member')).toBeVisible();
    await expect(page.locator('text=Create your first event')).toBeVisible();
  });
});
