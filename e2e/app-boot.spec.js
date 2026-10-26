// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E: App Boot & Navigation
 *
 * Verifies the app loads, the boot screen resolves, and core navigation works.
 * This is the first critical path — if the app can't boot, nothing else matters.
 */

test.describe('App Boot', () => {
  test('should load the app and show the login/create profile screen', async ({ page }) => {
    await page.goto('/');

    // The boot animation should resolve within a few seconds
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });

    // The app root should be visible
    await expect(page.locator('#root')).toBeVisible();

    // Should show either the login screen or the guest/create profile option
    // (depends on server config — ALLOW_GUEST, PASSWORD_LOGIN, etc.)
    const loginVisible = await page.getByText(/create profile|continue without|sign in/i).isVisible()
      .catch(() => false);
    const homeVisible = await page.locator('[data-testid="home"]').isVisible()
      .catch(() => false);

    // One of them must be true — the app either shows login or home
    expect(loginVisible || homeVisible).toBeTruthy();
  });

  test('should have correct meta tags', async ({ page }) => {
    await page.goto('/');

    // Viewport meta for mobile
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    // Theme color
    const theme = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(theme).toBeTruthy();

    // App title
    await expect(page).toHaveTitle(/ASCEND/);
  });
});

test.describe('Guest Mode Navigation', () => {
  test('should navigate through main tabs as guest', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });

    // Try to continue as guest (if available)
    const guestBtn = page.getByText(/continue without account|guest/i);
    if (await guestBtn.isVisible().catch(() => false)) {
      await guestBtn.click();
      await page.waitForTimeout(500);
    }

    // Check that navigation tabs exist
    const tabBar = page.locator('nav, [role="tablist"], .tab-bar');
    if (await tabBar.isVisible().catch(() => false)) {
      // The tab bar should have the main navigation items
      const tabs = await tabBar.locator('a, button').count();
      expect(tabs).toBeGreaterThanOrEqual(3); // Home, Plan, Stats at minimum
    }
  });
});
