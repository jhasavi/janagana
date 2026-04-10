import { test, expect } from '../fixtures/auth';

test.describe('Member Management', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page, 'test-org');
  });

  test('Admin creates new member', async ({ page }) => {
    // Navigate to members page
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Click "Add Member" button
    await page.click('button:has-text("Add Member")');
    
    // Fill member details
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'john.doe@example.com');
    
    // Submit form
    await page.click('button:has-text("Create Member")');
    
    // Verify member appears in list
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=john.doe@example.com')).toBeVisible();
  });

  test('Member appears in list', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Should see member list
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Members')).toBeVisible();
  });

  test('Admin edits member', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Click on a member
    await page.click('table tbody tr:first-child');
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Update member details
    await page.fill('input[name="firstName"]', 'Jane');
    await page.click('button:has-text("Save")');
    
    // Verify changes
    await expect(page.locator('text=Jane Doe')).toBeVisible();
  });

  test('Admin can filter members', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Use search filter
    await page.fill('input[placeholder*="Search"]', 'John');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Admin imports CSV', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Click import button
    await page.click('button:has-text("Import")');
    
    // Upload CSV file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-data/members.csv');
    
    // Submit import
    await page.click('button:has-text("Import")');
    
    // Verify success message
    await expect(page.locator('text=Import successful')).toBeVisible();
  });

  test('Member receives welcome email', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    
    // Create member with welcome email
    await page.click('button:has-text("Add Member")');
    await page.fill('input[name="firstName"]', 'New');
    await page.fill('input[name="lastName"]', 'Member');
    await page.fill('input[name="email"]', 'newmember@example.com');
    await page.check('input[name="sendWelcomeEmail"]');
    await page.click('button:has-text("Create Member")');
    
    // Navigate to email logs
    await page.goto('http://test-org.localhost:3000/dashboard/settings/emails');
    
    // Verify welcome email was sent
    await expect(page.locator('text=Welcome email')).toBeVisible();
    await expect(page.locator('text=newmember@example.com')).toBeVisible();
  });
});
