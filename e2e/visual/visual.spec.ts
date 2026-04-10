import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://test-org.localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('Dashboard home page', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard');
    await expect(page).toHaveScreenshot('dashboard-home.png');
  });

  test('Members list', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/members');
    await expect(page).toHaveScreenshot('members-list.png');
  });

  test('Event detail page', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    await page.click('.event-card:first-child');
    await expect(page).toHaveScreenshot('event-detail.png');
  });

  test('Member portal home', async ({ page }) => {
    // Login as member
    await page.goto('http://test-org.localhost:3000/portal/login');
    await page.fill('input[name="email"]', 'member@test.com');
    await page.fill('input[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/portal/);
    
    await expect(page).toHaveScreenshot('member-portal-home.png');
  });

  test('Public organization page', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000');
    await expect(page).toHaveScreenshot('public-org-page.png');
  });
});
