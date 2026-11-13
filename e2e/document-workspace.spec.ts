import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * hk-document-workspace with a document list, in a real browser: axe (WCAG
 * 2.2 AA) in light, dark and cupcake on a PDF and a text document, edit
 * mode, switching documents (and the unsaved-changes guard), reflow.
 */

const ROUTE = '/document-viewer/workspace';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const row = (page: Page, name: string) => page.locator('hk-document-workspace hk-mesa-document-list button', { hasText: name });

async function open(page: Page, theme = 'light'): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('hk-demo-theme', t), theme);
  await page.goto(ROUTE);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  // The first document (a PDF) opens in the PDF workspace, with the list as its rail.
  await expect(row(page, 'Form W-9.pdf').first()).toHaveAttribute('aria-current', 'page', { timeout: 60_000 });
  await expect(page.locator('hk-document-workspace .hk-pdf-page-stack')).not.toHaveClass(/invisible/, { timeout: 60_000 });
}

/** Chrome with every rule; the PDF pages' own content without target-size (the document fixes its fields' size). */
async function violations(page: Page): Promise<string[]> {
  const chrome = await new AxeBuilder({ page })
    .include('hk-document-workspace')
    .exclude('hk-document-workspace .hk-pdf-page')
    .withTags(TAGS)
    .analyze();
  const pages = await page.locator('hk-document-workspace .hk-pdf-page-stack').count();
  const content = pages
    ? await new AxeBuilder({ page })
        .include('hk-document-workspace .hk-pdf-page-stack')
        .withTags(TAGS)
        .disableRules(['target-size'])
        .analyze()
    : { violations: [] };
  return [...chrome.violations, ...content.violations].map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const theme of ['light', 'dark', 'cupcake']) {
  test(`axe: list + PDF and list + text (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1200 });
    await open(page, theme);
    expect(await violations(page)).toEqual([]);

    await row(page, 'Meeting notes.md').click();
    await expect(page.locator('hk-document-workspace hk-mesa-toolbar .badge')).toContainText('Meeting notes.md');
    expect(await violations(page)).toEqual([]);
  });
}

test('edit mode, and the guard before leaving unsaved edits', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  await row(page, 'Meeting notes.md').click();
  await page.locator('hk-document-workspace hk-mesa-toolbar').getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('hk-document-workspace hk-document-editor-shell')).toBeVisible();
  expect(await violations(page)).toEqual([]);

  await page.locator('hk-document-workspace hk-document-editor-shell textarea').first().fill('# Changed');
  await row(page, 'Customers.csv').click();
  const dialog = page.getByRole('dialog', { name: 'Unsaved changes' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep editing' }).first().click();
  await expect(row(page, 'Meeting notes.md')).toHaveAttribute('aria-current', 'page');

  await row(page, 'Customers.csv').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Discard and open' }).click();
  await expect(row(page, 'Customers.csv')).toHaveAttribute('aria-current', 'page');
});

test('keyboard: arrows move along the list, Enter opens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  await row(page, 'Form W-9.pdf').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(row(page, 'Meeting notes.md')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(row(page, 'Meeting notes.md')).toHaveAttribute('aria-current', 'page');
});

for (const width of [1280, 600, 375]) {
  test(`reflow: no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(ROUTE);
    await expect(page.locator('hk-document-workspace hk-mesa-layout')).toBeVisible({ timeout: 60_000 });
    const overflow = await page.locator('hk-document-workspace hk-mesa-layout').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
