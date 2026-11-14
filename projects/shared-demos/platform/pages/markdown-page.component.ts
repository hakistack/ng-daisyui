import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { renderMarkdown, sanitizeMarkdownHtml } from '@hakistack/ng-daisyui';
import { pageById } from '../catalog/pages';
import { DocsLocaleService, LocalizePipe, UI, localize } from '../i18n/docs-locale.service';
import { PrevNextComponent } from '../ui/prev-next.component';

/**
 * Repository Markdown rendered as a docs page, so the changelog and migration
 * guides have one source (the .md files) instead of a copy in the docs.
 * Rendered with the library's own Markdown renderer + sanitizer.
 */
const SOURCES: Record<string, () => Promise<string[]>> = {
  changelog: () => Promise.all([import('../../../hakistack/ng-daisyui/CHANGELOG.md').then((m) => m.default)]),
  migration: () =>
    Promise.all([
      import('../../../../docs/maintenance/migration-guide.md').then((m) => m.default),
      import('../../../../MIGRATION.md').then((m) => m.default),
    ]),
};

const T = {
  englishOnly: {
    en: '',
    es: 'Este documento se mantiene solo en inglés: se muestra tal cual desde el repositorio.',
  },
};

@Component({
  selector: 'app-markdown-page',
  imports: [LocalizePipe, PrevNextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page(); as p) {
      <article class="max-w-3xl" aria-labelledby="md-title">
        <header class="mb-6 space-y-2">
          <h1 id="md-title" class="text-3xl lg:text-4xl font-semibold tracking-tight">{{ p.title | loc: lang() }}</h1>
          <p class="text-lg text-base-content/80">{{ p.summary | loc: lang() }}</p>
          @if (lang() === 'es') {
            <p class="docs-note" data-tone="info" role="note">{{ t.englishOnly.es }}</p>
          }
        </header>
        @if (html(); as h) {
          <div class="docs-markdown" lang="en" [innerHTML]="h"></div>
        } @else {
          <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
        }
        <app-prev-next [pageId]="p.id" />
      </article>
    } @else {
      <h1 class="text-2xl font-semibold">{{ ui.notFound | loc: lang() }}</h1>
    }
  `,
})
export class MarkdownPageComponent {
  /** Route param `:doc` (component input binding). */
  readonly doc = input<string>();
  protected readonly lang = inject(DocsLocaleService).locale;
  private readonly title = inject(Title);
  protected readonly ui = UI;
  protected readonly t = T;
  protected readonly page = computed(() => {
    const p = pageById(this.doc() ?? '');
    return p?.markdown ? p : undefined;
  });
  protected readonly html = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const p = this.page();
      let alive = true;
      onCleanup(() => (alive = false));
      this.html.set(null);
      const load = p?.markdown ? SOURCES[p.markdown] : undefined;
      if (!load) return;
      void load()
        .then((docs) => sanitizeMarkdownHtml(renderAll(docs)))
        .then((h) => alive && this.html.set(h));
    });
    effect(() => {
      const p = this.page();
      if (p) this.title.setTitle(`${localize(p.title, this.lang())} · ng-daisyui`);
    });
  }
}

/** Render each document, then point repo-relative links at the docs pages that show them. */
function renderAll(docs: string[]): string {
  return docs
    .map((d) => renderMarkdown(d))
    .join('<hr />')
    .replace(/href="(?:\.\.\/)*MIGRATION\.md"/g, 'href="/contributing/migration"')
    .replace(/href="(?:\.\/)?CHANGELOG\.md"/g, 'href="/contributing/changelog"');
}
