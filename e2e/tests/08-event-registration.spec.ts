import { test, expect } from '../fixtures/auth';

test.describe('Event Registration Management', () => {
  test.beforeEach(async ({ page, loginAsAdmin }: any) => {
    await loginAsAdmin(page, 'test-org');
  });

  test('Admin views event registrations', async ({ page }: any) => {
    // Navigate to events page
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    
    // Click on first event to view registrations
    await page.click('.cursor-pointer:first-child');
    
    // Should see registrations section
    await expect(page.locator('text=Registrations')).toBeVisible();
  });

  test('Admin registers member for event', async ({ page }: any) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    await page.click('.cursor-pointer:first-child');
    
    // Click "Register Member" button
    await page.click('button:has-text("Register Member")');
    
    // Select member from dropdown
    await page.selectOption('select', '0');
    
    // Submit
    await page.click('button:has-text("Register")');
    
    // Verify registration appears
    await expect(page.locator('text=CONFIRMED')).toBeVisible();
  });

  test('Registration shows confirmation code', async ({ page }: any) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    await page.click('.cursor-pointer:first-child');
    
    // Should see confirmation codes for registrations
    await expect(page.locator('text=/[A-Z0-9]{8}/')).toBeVisible();
  });
});
