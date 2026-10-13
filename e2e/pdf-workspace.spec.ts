import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * hk-pdf-workspace in a real browser (docs/plans/workspace-ui.md §D): axe
 * (WCAG 2.2 AA, which needs real layout and colors) in light, dark and
 * branded themes, reflow at narrow widths, and the keyboard path through the
 * rail.
 */

const ROUTE = '/pdf-viewer/workspace';
const THEMES = ['light', 'dark', 'kaizen', 'cupcake'];

async function open(page: Page, theme = 'light'): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('hk-demo-theme', t), theme);
  await page.goto(ROUTE);
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await expect(page.locator('hk-pdf-workspace [data-thumb-button="1"]')).toBeAttached({ timeout: 60_000 });
  // The first page has painted (the stack turns visible after its first raster).
  await expect(page.locator('hk-pdf-workspace .hk-pdf-page-stack')).not.toHaveClass(/invisible/, { timeout: 60_000 });
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Violations in the workspace. The chrome gets every rule; the pages' own
 * content (form widgets, links) is laid out by the PDF, so it is checked
 * without target-size (WCAG 2.5.8's "essential" exception: the document
 * fixes their size).
 */
async function violations(page: Page): Promise<string[]> {
  const chrome = await new AxeBuilder({ page })
    .include('hk-pdf-workspace')
    .exclude('hk-pdf-workspace .hk-pdf-page')
    .withTags(TAGS)
    .analyze();
  const content = await new AxeBuilder({ page })
    .include('hk-pdf-workspace .hk-pdf-page-stack')
    .withTags(TAGS)
    .disableRules(['target-size'])
    .analyze();
  return [...chrome.violations, ...content.violations].map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const theme of THEMES) {
  test(`axe: no WCAG 2.2 AA violations (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1200 });
    await open(page, theme);
    expect(await violations(page)).toEqual([]);
  });
}

test('axe: the grid view and the annotation tools', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  await page.getByRole('button', { name: 'Annotate' }).click();
  await expect(page.locator('hk-pdf-workspace hk-pdf-annotation-toolbar')).toBeVisible();
  expect(await violations(page)).toEqual([]);

  await page.getByRole('button', { name: 'Grid' }).click();
  await expect(page.locator('hk-pdf-workspace hk-pdf-page-organizer [role="option"]').first()).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

for (const width of [1280, 900, 600, 375]) {
  test(`reflow: no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const overflow = await page.locator('hk-pdf-workspace').evaluate((el) => {
      const block = el.querySelector('hk-mesa-layout') as HTMLElement;
      return { host: el.scrollWidth - el.clientWidth, block: block.scrollWidth - block.clientWidth };
    });
    expect(overflow.host).toBeLessThanOrEqual(1);
    expect(overflow.block).toBeLessThanOrEqual(1);
  });
}

test('keyboard: the rail has one tab stop and arrows move the page', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  await page.locator('hk-pdf-workspace-rail').getByRole('button', { name: 'Pages', exact: true }).click();
  const first = page.locator('hk-pdf-workspace [data-thumb-button="1"]');
  await first.focus();
  await page.keyboard.press('ArrowDown');
  const second = page.locator('hk-pdf-workspace [data-thumb-button="2"]');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox', { name: 'Go to page' })).toHaveValue('2');
  // Focus is visible (an outline, not just a color change).
  const outline = await second.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  // Only the current page's thumbnail is in the tab order.
  expect(await page.locator('hk-pdf-workspace [data-thumb-button][tabindex="0"]').count()).toBe(1);
});

test('the side panes hide and come back, and fold on narrow layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  await page.getByRole('button', { name: 'Hide side panel' }).click();
  await expect(page.getByRole('button', { name: 'Show side panel' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Show side panel' }).click();
  await expect(page.locator('hk-pdf-workspace hk-mesa-document-list')).toBeVisible();

  await page.setViewportSize({ width: 700, height: 900 });
  const details = page.locator('hk-pdf-workspace hk-mesa-layout button[aria-expanded]', { hasText: 'Details' });
  await expect(details).toBeVisible();
  await details.click();
  await expect(page.locator('hk-pdf-workspace [data-section="document"]')).toBeVisible();
});

test('the document list: switch documents, and the guard before leaving unsaved edits', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await open(page);
  const row = (name: string) => page.locator('hk-pdf-workspace hk-mesa-document-list button', { hasText: name });
  await expect(row('Service agreement.pdf')).toHaveAttribute('aria-current', 'page');
  expect(await violations(page)).toEqual([]);

  await row('Invoice 0042.pdf').click();
  await expect(page.locator('hk-pdf-workspace hk-mesa-toolbar .badge')).toContainText('Invoice 0042.pdf · 1 page');

  // An edit (a square annotation), then another document: confirm first.
  await page.getByRole('button', { name: 'Annotate' }).click();
  await page.locator('hk-pdf-workspace hk-pdf-annotation-toolbar').getByRole('button', { name: 'Rectangle' }).click();
  const box = await page.locator('hk-pdf-workspace .hk-pdf-page').first().boundingBox();
  await page.mouse.move(box!.x + 80, box!.y + 120);
  await page.mouse.down();
  await page.mouse.move(box!.x + 220, box!.y + 220, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('hk-pdf-workspace hk-mesa-save-status')).toContainText('Unsaved changes');

  await row('Form W-9.pdf').click();
  const dialog = page.getByRole('dialog', { name: 'Unsaved changes' });
  await expect(dialog).toBeVisible();
  expect(await violations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Keep editing' }).first().click();
  await expect(row('Invoice 0042.pdf')).toHaveAttribute('aria-current', 'page');

  await row('Form W-9.pdf').click();
  await page.getByRole('dialog', { name: 'Unsaved changes' }).getByRole('button', { name: 'Discard and open' }).click();
  await expect(page.locator('hk-pdf-workspace hk-mesa-toolbar .badge')).toContainText('Form W-9.pdf · 6 pages', { timeout: 60_000 });
});
