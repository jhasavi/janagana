import { test, expect } from '../fixtures/auth';

test.describe('Volunteer Flow', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page, 'test-org');
  });

  test('Admin creates opportunity with shifts', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    
    // Click "Create Opportunity" button
    await page.click('button:has-text("Create Opportunity")');
    
    // Fill opportunity details
    await page.fill('input[name="title"]', 'Test Volunteer Opportunity');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.fill('input[name="location"]', 'Test Location');
    await page.click('button:has-text("Next")');
    
    // Add shift
    await page.click('button:has-text("Add Shift")');
    await page.fill('input[name="shiftName"]', 'Morning Shift');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"] = "12:00"');
    await page.click('button:has-text("Next")');
    
    // Publish
    await page.click('button:has-text("Publish")');
    
    // Verify success
    await expect(page.locator('text=Test Volunteer Opportunity')).toBeVisible();
  });

  test('Member applies', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    await page.goto('http://test-org.localhost:3000/portal/volunteers');
    
    // Click on an opportunity
    await page.click('.opportunity-card:first-child');
    
    // Click apply button
    await page.click('button:has-text("Apply")');
    
    // Fill application
    await page.fill('textarea[name="coverLetter"]', 'I would love to volunteer!');
    await page.click('button:has-text("Submit Application")');
    
    // Verify application
    await expect(page.locator('text=Application submitted')).toBeVisible();
  });

  test('Admin approves application', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    
    // Navigate to applications
    await page.click('text=Applications');
    
    // Approve an application
    await page.click('button:has-text("Approve")');
    
    // Verify approval
    await expect(page.locator('text=Approved')).toBeVisible();
  });

  test('Hours are logged and approved', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    
    // Navigate to hours
    await page.click('text=Hours');
    
    // Log hours
    await page.click('button:has-text("Log Hours")');
    await page.fill('input[name="hours"]', '5');
    await page.fill('textarea[name="description"]', 'Great work!');
    await page.click('button:has-text("Submit")');
    
    // Approve hours
    await page.click('button:has-text("Approve")');
    
    // Verify approval
    await expect(page.locator('text=Approved')).toBeVisible();
  });
});
