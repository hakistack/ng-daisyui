import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import type { ArticleContent } from '../catalog/catalog.types';
import { PRODUCT_BRANDS, pageById, pageForUrl, productOf } from '../catalog/pages';
import { ARTICLE_CONTENT } from '../content';
import { DocsLocaleService, LocalizePipe, UI, localize } from '../i18n/docs-locale.service';
import { ContentSectionsComponent, RichTextComponent } from '../ui/content-blocks.component';
import { TocComponent, TocEntry } from '../ui/toc.component';
import { PageStatusComponent } from '../ui/page-status.component';
import { PrevNextComponent } from '../ui/prev-next.component';
import { DocApiIndexComponent } from './component-doc-tabs';

/**
 * Long-form page (foundations, systems, guides, architecture, contributing).
 * The page is resolved from the URL through the catalog; its prose is a lazy
 * chunk from content/articles.
 */
@Component({
  selector: 'app-article-page',
  imports: [
    RouterLink,
    LocalizePipe,
    ContentSectionsComponent,
    RichTextComponent,
    TocComponent,
    PageStatusComponent,
    PrevNextComponent,
    DocApiIndexComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page(); as p) {
      <div class="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-10">
        <article class="min-w-0 max-w-3xl" aria-labelledby="article-title">
          <header class="mb-8 space-y-3">
            <h1 id="article-title" class="text-3xl lg:text-4xl font-semibold tracking-tight">{{ p.title | loc: lang() }}</h1>
            <p class="text-lg text-base-content/80 leading-relaxed">{{ p.summary | loc: lang() }}</p>
            <app-page-status [status]="p.status" />
          </header>

          @if (content(); as c) {
            @for (para of c.intro; track $index) {
              <p class="docs-p text-base"><app-rich-text [text]="para" /></p>
            }
            <app-content-sections [sections]="c.sections" />
            @if (c.related?.length) {
              <section aria-labelledby="related" class="mt-10">
                <h2 id="related" class="docs-h2">{{ ui.related | loc: lang() }}</h2>
                <ul class="space-y-2">
                  @for (r of c.related!; track r.id) {
                    @if (pageRef(r.id); as rp) {
                      <li>
                        <a class="link link-primary font-medium" [routerLink]="rp.route">{{ rp.title | loc: lang() }}</a>
                        <span class="text-base-content/70"> — {{ r.note | loc: lang() }}</span>
                      </li>
                    }
                  }
                </ul>
              </section>
            }
          } @else if (failed()) {
            <div class="alert" role="status">{{ ui.contentMissing | loc: lang() }}</div>
          } @else {
            <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
          }
          @if (p.areas?.length || p.symbols?.length) {
            <!-- Symbols this page owns (same index as the component pages' overview tab). -->
            <div class="mt-10"><app-doc-api-index [page]="p" /></div>
          }
          <app-prev-next [pageId]="p.id" />
        </article>
        <aside class="hidden xl:block">
          <div class="sticky top-20">
            <app-toc [entries]="toc()" />
          </div>
        </aside>
      </div>
    } @else {
      <h1 class="text-2xl font-semibold">{{ ui.notFound | loc: lang() }}</h1>
    }
  `,
})
export class ArticlePageComponent {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  protected readonly lang = inject(DocsLocaleService).locale;
  protected readonly ui = UI;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly page = computed(() => pageForUrl(this.url()));
  protected readonly content = signal<ArticleContent | null>(null);
  protected readonly failed = signal(false);

  protected readonly toc = computed<TocEntry[]>(() => {
    const c = this.content();
    const lang = this.lang();
    return c ? c.sections.map((s) => ({ id: s.id, label: localize(s.heading, lang) })) : [];
  });

  constructor() {
    effect((onCleanup) => {
      const p = this.page();
      let alive = true;
      onCleanup(() => (alive = false));
      this.content.set(null);
      this.failed.set(false);
      const loader = p ? ARTICLE_CONTENT[p.id] : undefined;
      if (!loader) {
        this.failed.set(true);
        return;
      }
      loader().then(
        (c) => alive && this.content.set(c),
        () => alive && this.failed.set(true),
      );
    });
    effect(() => {
      const p = this.page();
      this.title.setTitle(p ? `${localize(p.title, this.lang())} · ${PRODUCT_BRANDS[productOf(p)]}` : 'Hakistack');
    });
  }

  protected pageRef(id: string) {
    return pageById(id);
  }
}
