import type { ComponentGroup, DocPageMeta, DocSection, Localized } from './catalog.types';
import { DOC_PAGES, GROUP_ORDER, GROUP_TITLES, SECTION_ORDER, SECTION_TITLES } from './pages';

export interface NavGroup {
  readonly id: string;
  /** Sub-heading inside a section (Components only). */
  readonly title?: Localized;
  readonly pages: readonly DocPageMeta[];
}

export interface NavSectionModel {
  readonly section: DocSection;
  readonly title: Localized;
  readonly groups: readonly NavGroup[];
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
    return { section, title: SECTION_TITLES[section], groups };
  }).filter((s) => s.groups.some((g) => g.pages.length));
}

let order: DocPageMeta[] | null = null;
/** Flat page list in sidebar order (for prev/next). */
export function navOrder(): DocPageMeta[] {
  order ??= buildNavigation().flatMap((s) => s.groups.flatMap((g) => g.pages));
  return order;
}
