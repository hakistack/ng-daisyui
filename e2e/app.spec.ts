import { test, expect } from '@playwright/test';

test.describe('Demo App', () => {
  test('should load the demo application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/demo/i);
  });

  test('should navigate to form demo', async ({ page }) => {
    await page.goto('/');
    const formLink = page.locator('a', { hasText: /form/i }).first();
    if (await formLink.isVisible()) {
      await formLink.click();
      await expect(page.locator('hk-dynamic-form')).toBeVisible();
    }
  });

  test('should navigate to table demo', async ({ page }) => {
    await page.goto('/');
    const tableLink = page.locator('a', { hasText: /table/i }).first();
    if (await tableLink.isVisible()) {
      await tableLink.click();
      await expect(page.locator('hk-table')).toBeVisible();
    }
  });
});

test.describe('Accessibility', () => {
  test('select component should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    const selectLink = page.locator('a', { hasText: /select/i }).first();
    if (await selectLink.isVisible()) {
      await selectLink.click();
      const combobox = page.locator('[role="combobox"]').first();
      await expect(combobox).toBeVisible();
      await expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
      await expect(combobox).toHaveAttribute('aria-expanded');
    }
  });

  test('datepicker should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    const datepickerLink = page.locator('a', { hasText: /datepicker/i }).first();
    if (await datepickerLink.isVisible()) {
      await datepickerLink.click();
      const input = page.locator('[aria-haspopup="dialog"]').first();
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('aria-expanded');
    }
  });
});
