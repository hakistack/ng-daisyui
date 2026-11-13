import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Docs platform: navigation, search, language, playground, accessibility.
 * Runs against the dev server (playwright.config.ts → npm start).
 */

const MAIN_ROUTES = [
  '/getting-started',
  '/installation',
  '/foundations/theming',
  '/forms',
  '/datagrid',
  '/input?tab=playground',
  '/toast?tab=accessibility',
  '/guides/server-side-data',
  '/systems/wasm-engines',
  '/architecture/library',
  '/api',
  '/api/createDataGrid',
  '/contributing',
];

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.locator('main h1').first().waitFor();
}

test.describe('docs platform — accessibility (axe, WCAG 2.2 AA)', () => {
  for (const route of MAIN_ROUTES) {
    test(`no serious violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // Live demos embed third-party rendered content (e.g. PDF canvases); audit the docs chrome + prose.
        .exclude('[examples]')
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('docs platform — navigation', () => {
  test('every sidebar link opens a page with a heading', async ({ page }) => {
    // ~50 pages, some with PDFium/WASM demos: give it room when workers run in parallel.
    test.slow();
    await page.goto('/getting-started');
    const hrefs = await page.locator('#docs-sidebar nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(hrefs.length).toBeGreaterThan(40);
    for (const href of hrefs) {
      await page.goto(href, { waitUntil: 'load' });
      await expect(page.locator('main h1').first(), href).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('heading', { name: /page not found|página no encontrada/i })).toHaveCount(0);
    }
  });

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/forms');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content|saltar al contenido/i })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('component tabs are keyboard operable and linkable', async ({ page }) => {
    await page.goto('/datagrid');
    const overview = page.getByRole('tab', { name: /overview|resumen/i });
    await expect(overview).toHaveAttribute('aria-selected', 'true');
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/tab=examples/);
    await expect(page.getByRole('tab', { name: /examples|ejemplos/i })).toBeFocused();
  });

  test('unknown routes show the not-found page', async ({ page }) => {
    await page.goto('/does-not-exist');
    await expect(page.getByRole('heading', { name: /page not found|página no encontrada/i })).toBeVisible();
  });
});

test.describe('docs platform — search', () => {
  test('Mod+K opens search and a task query finds the guide', async ({ page }) => {
    await page.goto('/getting-started');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.locator('hk-command-palette input').first();
    await expect(input).toBeVisible();
    await input.fill('server-side pagination');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/guides\/server-side-data/);
  });

  test('API symbols are searchable', async ({ page }) => {
    await page.goto('/getting-started');
    await page.getByRole('button', { name: /search docs|buscar en la documentación/i }).click();
    await page.locator('hk-command-palette input').first().fill('createDataGrid');
    await expect(page.getByText('createDataGrid').first()).toBeVisible();
  });
});

test.describe('docs platform — language', () => {
  test('switching to Spanish translates chrome and content and is remembered', async ({ page }) => {
    await page.goto('/datagrid');
    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('tab', { name: 'Resumen' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // API names are never translated.
    await expect(page.locator('main')).toContainText('DataGrid');
    await page.getByRole('button', { name: 'English' }).click();
  });
});

test.describe('docs platform — playground', () => {
  test('controls update the live component and the generated code; state is shareable', async ({ page }) => {
    await page.goto('/input?tab=playground');
    const form = page.getByRole('form', { name: /properties|propiedades/i });
    await form.getByRole('combobox').first().selectOption('currency');
    await expect(page.locator('app-code-block').last()).toContainText('variant="currency"');
    await form.getByRole('button', { name: /copy link|copiar enlace/i }).click();
    await expect(page).toHaveURL(/pg=/);
    const url = page.url();
    await page.goto(url);
    await expect(page.locator('app-code-block').last()).toContainText('variant="currency"');
    await form.getByRole('button', { name: /reset|restablecer/i }).click();
    await expect(page.locator('app-code-block').last()).not.toContainText('variant=');
  });

  test('event inspector records real outputs', async ({ page }) => {
    await page.goto('/input?tab=playground');
    await page.getByLabel('Playground input').fill('hello');
    await expect(page.getByRole('region', { name: /events|eventos/i })).toContainText('valueChange');
  });
});

test.describe('docs platform — mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('drawer opens from the menu button, no horizontal overflow', async ({ page }) => {
    await page.goto('/datagrid');
    await settle(page);
    const menu = page.getByRole('button', { name: /open navigation|abrir navegación/i });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    // Focus moves into the navigation for keyboard users.
    await expect(page.locator('#docs-sidebar nav a').first()).toBeFocused();
    await page
      .locator('#docs-sidebar')
      .getByRole('link', { name: /^table$|^tabla$/i })
      .click();
    await expect(page).toHaveURL(/\/table$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('docs platform — visual regression @visual', () => {
  for (const route of ['/getting-started', '/datagrid', '/api', '/guides/build-a-form']) {
    test(`snapshot ${route}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(route);
      await settle(page);
      await expect(page).toHaveScreenshot(`${route.replace(/\//g, '_') || 'root'}.png`, { fullPage: false, maxDiffPixelRatio: 0.02 });
    });
  }
});
