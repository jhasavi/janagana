import { test, expect } from '../fixtures/auth';

test.describe('Member Portal', () => {
  test.beforeEach(async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
  });

  test('Member logs in to portal', async ({ page }) => {
    // Already logged in via beforeEach
    await expect(page).toHaveURL(/\/portal/);
    await expect(page.locator('h1')).toContainText('Portal');
  });

  test('Profile is editable', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/portal/profile');
    
    // Edit profile
    await page.fill('input[name="firstName"]', 'Updated');
    await page.click('button:has-text("Save")');
    
    // Verify saved
    await expect(page.locator('text=Profile updated')).toBeVisible();
  });

  test('Member can see their events', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/portal/my-events');
    
    // Should see events section
    await expect(page.locator('text=My Events')).toBeVisible();
  });

  test('Member can see their volunteer activity', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/portal/volunteers');
    
    // Should see volunteer section
    await expect(page.locator('text=Volunteer Activity')).toBeVisible();
  });

  test('Membership card shows correctly', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/portal/membership');
    
    // Should see membership card
    await expect(page.locator('.membership-card')).toBeVisible();
    await expect(page.locator('text=Current Plan')).toBeVisible();
  });
});
