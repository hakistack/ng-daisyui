import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** hk-document-workspace in a real browser: axe (WCAG 2.2 AA) in light and dark themes, edit mode, reflow. */

const ROUTE = '/document-viewer/workspace';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function openMarkdown(page: Page, theme = 'light'): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('hk-demo-theme', t), theme);
  await page.goto(ROUTE);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.locator('hk-document-workspace hk-mesa-toolbar')).toBeVisible();
  await expect(page.locator('hk-document-workspace hk-document-text-renderer pre, hk-document-workspace pre').first()).toBeVisible();
}

async function violations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).include('hk-document-workspace').withTags(TAGS).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const theme of ['light', 'dark', 'cupcake']) {
  test(`axe: no WCAG 2.2 AA violations (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1200 });
    await openMarkdown(page, theme);
    expect(await violations(page)).toEqual([]);
  });
}

test('axe: edit mode', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await openMarkdown(page);
  await page.locator('hk-document-workspace hk-mesa-toolbar').getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('hk-document-workspace hk-document-editor-shell')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

for (const width of [1280, 600, 375]) {
  test(`reflow: no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openMarkdown(page);
    const overflow = await page.locator('hk-document-workspace hk-mesa-layout').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
