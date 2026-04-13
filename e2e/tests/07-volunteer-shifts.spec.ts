import { test, expect } from '../fixtures/auth';

test.describe('Volunteer Shifts Management', () => {
  test.beforeEach(async ({ page, loginAsAdmin }: any) => {
    await loginAsAdmin(page, 'test-org');
  });

  test('Admin creates volunteer shift for opportunity', async ({ page }: any) => {
    // Navigate to volunteers page
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    
    // Click on first opportunity to view shifts
    await page.click('.cursor-pointer:first-child');
    
    // Click "Add Shift" button
    await page.click('button:has-text("Add Shift")');
    
    // Fill shift details
    await page.fill('input[name="shiftName"]', 'Morning Volunteer Shift');
    await page.fill('input[name="startTime"]', '2025-06-01T09:00');
    await page.fill('input[name="endTime"]', '2025-06-01T12:00');
    await page.fill('input[name="capacity"]', '10');
    await page.fill('input[name="location"]', 'Community Center');
    
    // Submit
    await page.click('button:has-text("Add Shift")');
    
    // Verify shift appears
    await expect(page.locator('text=Morning Volunteer Shift')).toBeVisible();
  });

  test('Shift shows signup count', async ({ page }: any) => {
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    await page.click('.cursor-pointer:first-child');
    
    // Should see shift with capacity info
    await expect(page.locator('text=/\\d+\\/\\d+/')).toBeVisible();
  });

  test('Admin deletes volunteer shift', async ({ page }: any) => {
    await page.goto('http://test-org.localhost:3000/dashboard/volunteers');
    await page.click('.cursor-pointer:first-child');
    
    // Find shift delete button
    const shiftCount = await page.locator('.border.rounded-lg').count();
    if (shiftCount > 0) {
      await page.click('button[title="Delete shift"]');
      await page.click('button:has-text("OK")');
    }
  });
});
