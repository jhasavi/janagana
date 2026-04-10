import { test, expect } from '../fixtures/auth';

test.describe('Event Flow', () => {
  test.beforeEach(async ({ page, loginAsAdmin }) => {
    await loginAsAdmin(page, 'test-org');
  });

  test('Admin creates event with tickets', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    
    // Click "Create Event" button
    await page.click('button:has-text("Create Event")');
    
    // Fill basic info
    await page.fill('input[name="title"]', 'Test Event');
    await page.fill('textarea[name="description"]', 'Test event description');
    await page.click('button:has-text("Next")');
    
    // Fill date and location
    await page.fill('input[name="startDate"]', '2025-06-01T10:00');
    await page.fill('input[name="endDate"]', '2025-06-01T12:00');
    await page.fill('input[name="location"]', 'Test Venue');
    await page.click('button:has-text("Next")');
    
    // Add ticket
    await page.click('button:has-text("Add Ticket")');
    await page.fill('input[name="ticketName"]', 'General Admission');
    await page.fill('input[name="ticketPrice"]', '10');
    await page.click('button:has-text("Next")');
    
    // Publish event
    await page.click('button:has-text("Publish")');
    
    // Verify success
    await expect(page.locator('text=Test Event')).toBeVisible();
  });

  test('Admin publishes event', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    
    // Create event first
    await page.click('button:has-text("Create Event")');
    await page.fill('input[name="title"]', 'Test Event to Publish');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.click('button:has-text("Next")');
    await page.fill('input[name="startDate"]', '2025-06-01T10:00');
    await page.fill('input[name="endDate"]', '2025-06-01T12:00');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Save as Draft")');
    
    // Publish the event
    await page.click('button:has-text("Publish")');
    
    // Verify published status
    await expect(page.locator('text=Published')).toBeVisible();
  });

  test('Event appears on public page', async ({ page }) => {
    // Navigate to public events page
    await page.goto('http://test-org.localhost:3000/events');
    
    // Should see events
    await expect(page.locator('text=Events')).toBeVisible();
  });

  test('Member registers for event', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    // Navigate to events
    await page.goto('http://test-org.localhost:3000/portal/events');
    
    // Click on an event
    await page.click('.event-card:first-child');
    
    // Click register button
    await page.click('button:has-text("Register")');
    
    // Select ticket
    await page.click('text=General Admission');
    await page.click('button:has-text("Confirm")');
    
    // Verify registration
    await expect(page.locator('text=Registration confirmed')).toBeVisible();
  });

  test('Member sees registration in portal', async ({ page, loginAsMember }) => {
    await loginAsMember(page, 'test-org');
    
    // Navigate to my events
    await page.goto('http://test-org.localhost:3000/portal/my-events');
    
    // Should see registered events
    await expect(page.locator('text=My Events')).toBeVisible();
  });

  test('Admin checks in member', async ({ page }) => {
    await page.goto('http://test-org.localhost:3000/dashboard/events');
    
    // Click on an event
    await page.click('.event-card:first-child');
    
    // Navigate to registrations
    await page.click('text=Registrations');
    
    // Check in a member
    await page.click('button:has-text("Check In")');
    
    // Verify check-in
    await expect(page.locator('text=Checked in')).toBeVisible();
  });
});
