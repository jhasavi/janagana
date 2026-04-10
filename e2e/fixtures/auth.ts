import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  loginAsAdmin: (page: Page, tenant: string) => Promise<void>;
  loginAsMember: (page: Page, tenant: string) => Promise<void>;
  createTestOrg: (page: Page) => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  loginAsAdmin: async ({ page }, use) => {
    const login = async (tenant: string) => {
      // Navigate to the tenant's login page
      await page.goto(`http://${tenant}.localhost:3000/login`);
      
      // Fill in admin credentials
      await page.fill('input[name="email"]', 'admin@test.com');
      await page.fill('input[name="password"]', 'test-password');
      
      // Submit login form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL(`http://${tenant}.localhost:3000/dashboard`);
      await page.waitForLoadState('networkidle');
    };
    
    await use(login);
  },

  loginAsMember: async ({ page }, use) => {
    const login = async (tenant: string) => {
      // Navigate to the tenant's portal login page
      await page.goto(`http://${tenant}.localhost:3000/portal/login`);
      
      // Fill in member credentials
      await page.fill('input[name="email"]', 'member@test.com');
      await page.fill('input[name="password"]', 'test-password');
      
      // Submit login form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to portal
      await page.waitForURL(`http://${tenant}.localhost:3000/portal`);
      await page.waitForLoadState('networkidle');
    };
    
    await use(login);
  },

  createTestOrg: async ({ page }, use) => {
    const create = async () => {
      // Navigate to marketing page
      await page.goto('http://localhost:3000');
      
      // Click "Get Started" button
      await page.click('text=Get Started');
      
      // Fill organization details
      await page.fill('input[name="name"]', 'Test Organization');
      await page.fill('input[name="slug"]', `test-${Date.now()}`);
      await page.fill('input[name="email"]', 'admin@test.com');
      await page.fill('input[name="password"]', 'test-password');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for onboarding
      await page.waitForURL(/\/onboarding/);
      await page.waitForLoadState('networkidle');
    };
    
    await use(create);
  },
});

export { expect } from '@playwright/test';
