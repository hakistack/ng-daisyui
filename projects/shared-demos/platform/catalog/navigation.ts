import type { ComponentGroup, DocPageMeta, DocProduct, DocSection, Localized } from './catalog.types';
import { DOC_PAGES, GROUP_ORDER, GROUP_TITLES, PRODUCT_TITLES, SECTION_ORDER, SECTION_PRODUCT, SECTION_TITLES } from './pages';

export interface NavGroup {
  readonly id: string;
  /** Sub-heading inside a section (Components only). */
  readonly title?: Localized;
  readonly pages: readonly DocPageMeta[];
}

export interface NavSectionModel {
  readonly section: DocSection;
  readonly product: DocProduct;
  readonly title: Localized;
  readonly groups: readonly NavGroup[];
}

/**
 * A run of consecutive sections of the same product. Package blocks (`ng-daisyui`, `i18n`) carry
 * the npm name as their label; ecosystem sections (overview, contributing) have none.
 */
export interface NavProductBlock {
  readonly product: DocProduct;
  readonly label?: string;
  readonly sections: readonly NavSectionModel[];
}

/** Sidebar model derived from the catalog — no hand-maintained nav arrays. */
export function buildNavigation(pages: readonly DocPageMeta[] = DOC_PAGES): NavSectionModel[] {
  const visible = pages.filter((p) => !p.hidden);
  return SECTION_ORDER.map((section) => {
    const inSection = visible.filter((p) => p.section === section);
    const groups: NavGroup[] =
      section === 'components'
        ? GROUP_ORDER.map((g: ComponentGroup) => ({ id: g, title: GROUP_TITLES[g], pages: inSection.filter((p) => p.group === g) })).filter(
            (g) => g.pages.length,
          )
        : [{ id: section, pages: inSection }];
    return { section, product: SECTION_PRODUCT[section], title: SECTION_TITLES[section], groups };
  }).filter((s) => s.groups.some((g) => g.pages.length));
}

/** The sidebar grouped by product, in section order. */
export function buildSidebar(pages: readonly DocPageMeta[] = DOC_PAGES): NavProductBlock[] {
  const blocks: { product: DocProduct; label?: string; sections: NavSectionModel[] }[] = [];
  for (const section of buildNavigation(pages)) {
    const last = blocks.at(-1);
    if (last && last.product === section.product) last.sections.push(section);
    else
      blocks.push({
        product: section.product,
        label: section.product === 'hakistack' ? undefined : PRODUCT_TITLES[section.product],
        sections: [section],
      });
  }
  return blocks;
}

let order: DocPageMeta[] | null = null;
/** Flat page list in sidebar order (for prev/next). */
export function navOrder(): DocPageMeta[] {
  order ??= buildNavigation().flatMap((s) => s.groups.flatMap((g) => g.pages));
  return order;
}
