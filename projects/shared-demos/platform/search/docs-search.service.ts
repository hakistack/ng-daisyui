import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CommandPaletteItem } from '@hakistack/ng-daisyui';
import { ApiManifestService, KIND_LABELS } from '../api/api-manifest.service';
import { DOC_PAGES, SECTION_TITLES } from '../catalog/pages';
import { DocsLocaleService, localize } from '../i18n/docs-locale.service';
import { SearchDoc, buildIndex, search } from './docs-search';

type Item = CommandPaletteItem & SearchDoc;

/**
 * Builds the docs search index (pages → example tabs → API symbols) for the
 * current language and exposes a `filter` for `<hk-command-palette>`.
 *
 * Pages and examples come from the eager catalog. API symbols are added once
 * the (lazy) manifest has loaded — the shell triggers that the first time the
 * palette opens, so the initial bundle never carries the manifest.
 */
@Injectable({ providedIn: 'root' })
export class DocsSearchService {
  private readonly router = inject(Router);
  private readonly locale = inject(DocsLocaleService);
  private readonly manifest = inject(ApiManifestService);

  readonly items = computed<Item[]>(() => {
    const lang = this.locale.locale();
    const other = lang === 'en' ? 'es' : 'en';
    const go = (url: string) => () => void this.router.navigateByUrl(url);
    const items: Item[] = [];

    for (const p of DOC_PAGES) {
      items.push({
        id: `page:${p.id}`,
        group: 'pages',
        rank: 0,
        label: localize(p.title, lang),
        description: `${localize(SECTION_TITLES[p.section], lang)} · ${localize(p.summary, lang)}`,
        keywords: [...p.keywords, p.title[other], p.summary[other], ...(p.symbols ?? [])],
        onSelect: go(p.route),
      });
      for (const e of p.examples ?? []) {
        items.push({
          id: `example:${p.id}:${e.id}`,
          group: 'examples',
          rank: 1,
          label: `${localize(p.title, lang)} › ${localize(e.label, lang)}`,
          description: localize(p.summary, lang),
          keywords: [e.label[other], e.id, ...p.keywords.slice(0, 4)],
          onSelect: go(`${p.route}/${e.id}`),
        });
      }
    }

    for (const s of this.manifest.symbols() ?? []) {
      items.push({
        id: `api:${s.name}`,
        group: 'api',
        rank: 2,
        label: s.name,
        description: `${localize(KIND_LABELS[s.kind], lang)}${s.description ? ' · ' + firstSentence(s.description) : ''}`,
        keywords: [s.kind, s.area, ...(s.selector ? [s.selector] : [])],
        onSelect: go(`/api/${s.name}`),
      });
    }
    return items;
  });

  private readonly index = computed(() => buildIndex(this.items()));

  /** Custom filter for the palette (replaces its default fuzzy filter). */
  readonly filter = (query: string): readonly CommandPaletteItem[] => search<Item>(this.index(), query, 30);
}

function firstSentence(text: string): string {
  const plain = text.replace(/`/g, '');
  const m = /^(.{0,140}?[.!?])(\s|$)/.exec(plain);
  return m ? m[1] : plain.slice(0, 140);
}
