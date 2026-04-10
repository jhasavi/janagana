import { test, expect } from '../fixtures/auth';

test.describe('Club Flow', () => {
  test('Member creates club', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    await page.goto('http://test-org.localhost:3000/portal/clubs');
    
    // Click "Create Club" button
    await page.click('button:has-text("Create Club")');
    
    // Fill club details
    await page.fill('input[name="name"]', 'Test Club');
    await page.fill('textarea[name="description"]', 'Test club description');
    await page.selectOption('select[name="visibility"]', 'PUBLIC');
    await page.click('button:has-text("Create")');
    
    // Verify club created
    await expect(page.locator('text=Test Club')).toBeVisible();
  });

  test('Another member joins', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    await page.goto('http://test-org.localhost:3000/portal/clubs');
    
    // Click on a club
    await page.click('.club-card:first-child');
    
    // Click join button
    await page.click('button:has-text("Join Club")');
    
    // Verify joined
    await expect(page.locator('text=Member')).toBeVisible();
  });

  test('Post created and visible to members', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    await page.goto('http://test-org.localhost:3000/portal/clubs');
    
    // Navigate to a club
    await page.click('.club-card:first-child');
    
    // Create post
    await page.click('button:has-text("New Post")');
    await page.fill('input[name="title"]', 'Test Post');
    await page.fill('textarea[name="body"]', 'Test post content');
    await page.click('button:has-text("Post")');
    
    // Verify post visible
    await expect(page.locator('text=Test Post')).toBeVisible();
  });

  test('Member leaves club', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    await page.goto('http://test-org.localhost:3000/portal/clubs');
    
    // Navigate to a club
    await page.click('.club-card:first-child');
    
    // Leave club
    await page.click('button:has-text("Leave Club")');
    
    // Confirm leave
    await page.click('button:has-text("Confirm")');
    
    // Verify left
    await expect(page.locator('text=Join Club')).toBeVisible();
  });
});
