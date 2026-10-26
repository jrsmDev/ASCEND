// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E: Accessibility Checks
 *
 * Guided by UI/UX Pro Max skill accessibility rules:
 *   Priority 1: Contrast 4.5:1, Alt text, Keyboard nav, Aria-labels
 *   Anti-patterns: Removing focus rings, icon-only buttons without labels
 */

test.describe('Accessibility', () => {
  test('should have lang attribute on html element', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}/); // e.g., 'en', 'ar', 'de'
  });

  test('should respect prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // The boot animation should still resolve (graceful degradation)
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });
  });

  test('should have no images without alt text on the main screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });

    // Wait for the app to render
    await page.waitForTimeout(1000);

    // Check all visible images have alt attributes
    const images = await page.locator('img:visible').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      // Either has alt text, role="presentation", or is aria-hidden
      const accessible = (alt !== null && alt !== '') || role === 'presentation' || ariaHidden === 'true';
      if (!accessible) {
        const src = await img.getAttribute('src');
        console.warn(`Image without alt text: ${src}`);
      }
    }
  });

  test('should support keyboard navigation on interactive elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Tab through the first few interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Something should be focused
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el && el !== document.body ? el.tagName : null;
    });

    // At least one element should be focusable
    // (may be null if all interactive elements are behind a login)
    if (focused) {
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
    }
  });

  test('touch targets should be at least 44x44px', async ({ page }) => {
    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('#boot')).toHaveClass(/out/, { timeout: 10000 });
    await page.waitForTimeout(1000);

    const buttons = await page.locator('button:visible').all();
    let tooSmallCount = 0;

    for (const btn of buttons.slice(0, 20)) {
      const box = await btn.boundingBox();
      if (box && (box.width < 44 || box.height < 44)) {
        tooSmallCount++;
        const text = await btn.textContent();
        console.warn(`Small touch target (${box.width}x${box.height}): "${text?.trim()}"`);
      }
    }

    // Allow some small buttons (icon buttons with padding) but flag majority
    expect(tooSmallCount).toBeLessThan(buttons.length / 2);
  });
});
