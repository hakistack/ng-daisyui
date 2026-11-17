import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { DOC_PAGES } from '../projects/shared-demos/platform/catalog/pages';

/**
 * axe (WCAG 2.2 AA) over the live library components: every example of every docs page, auditing only the
 * `[examples]` area — the docs chrome around it is covered by docs-platform.spec.ts.
 *
 * Example routes come from the docs catalog, so a new example is audited without touching this file.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Content the library does not author: pages rendered from user documents (PDF canvases and text layers,
 * converted DOCX/EML/spreadsheet HTML). The viewer chrome around it is still audited.
 */
const THIRD_PARTY_CONTENT = ['.hk-pdf-page', '.hk-doc-rendered', '.docx-wrapper'];

const EXAMPLE_ROUTES = DOC_PAGES.flatMap((page) => (page.examples ?? []).map((example) => `${page.route}/${example.id}`));

test.describe('library components — accessibility (axe, WCAG 2.2 AA)', () => {
  // Entrance animations fade content in; with reduced motion the library renders the final state at once,
  // so axe never measures contrast mid-fade (the components honour the setting — see the motion directives).
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the catalog lists examples to audit', () => {
    expect(EXAMPLE_ROUTES.length).toBeGreaterThan(50);
  });

  for (const route of EXAMPLE_ROUTES) {
    test(`no serious violations in ${route}`, async ({ page }) => {
      await page.goto(route);
      const examples = page.locator('[examples]');
      await examples.waitFor();
      // Let lazy chunks (WASM engines, editors, document renderers) settle before auditing.
      await page.waitForLoadState('networkidle');

      let axe = new AxeBuilder({ page }).include('[examples]').withTags(TAGS);
      for (const selector of THIRD_PARTY_CONTENT) axe = axe.exclude(selector);
      const results = await axe.analyze();

      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});
