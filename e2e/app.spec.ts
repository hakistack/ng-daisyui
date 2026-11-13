import { test, expect } from '@playwright/test';

test.describe('Demo App', () => {
  test('should load the demo application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ng-daisyui/i);
  });

  test('should navigate to form demo', async ({ page }) => {
    // Component routes open the docs Overview; live examples are at /<page>/<example>.
    await page.goto('/forms/layouts');
    await expect(page.locator('hk-dynamic-form').first()).toBeVisible();
  });

  test('should navigate to table demo', async ({ page }) => {
    // Component routes open the docs Overview; live examples are at /<page>/<example>.
    await page.goto('/table/basic');
    await expect(page.locator('hk-table').first()).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('select component should have proper ARIA attributes', async ({ page }) => {
    // Component routes open the docs Overview; live examples are at /<page>/<example>.
    await page.goto('/select/basic');
    const combobox = page.locator('[role="combobox"]').first();
    await expect(combobox).toBeVisible();
    await expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(combobox).toHaveAttribute('aria-expanded');
  });

  test('datepicker should have proper ARIA attributes', async ({ page }) => {
    // Component routes open the docs Overview; live examples are at /<page>/<example>.
    await page.goto('/datepicker/basic');
    const input = page.locator('[aria-haspopup="dialog"]').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('aria-expanded');
  });
});
