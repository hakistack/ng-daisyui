import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';
import { SHOW_IMPORT } from '../config';
import type { ComponentDocContent, Localized } from '../platform/catalog/catalog.types';
import { pageForUrl } from '../platform/catalog/pages';
import { DOCS_PLATFORM } from '../platform/docs-platform';
import { DocsLocaleService, LocalizePipe, UI, localize } from '../platform/i18n/docs-locale.service';
import {
  DocAccessibilityComponent,
  DocApiIndexComponent,
  DocOverviewComponent,
  DocPlaygroundComponent,
  DocTechnicalComponent,
  loadComponentContent,
} from '../platform/pages/component-doc-tabs';
import { PLAYGROUNDS } from '../platform/playground/hosts';
import { PageStatusComponent } from '../platform/ui/page-status.component';
import { PrevNextComponent } from '../platform/ui/prev-next.component';

type DocTab = 'overview' | 'examples' | 'playground' | 'api' | 'accessibility' | 'technical';

const TAB_LABELS: Record<DocTab, Localized> = {
  overview: UI.overview,
  examples: UI.examples,
  playground: UI.playground,
  api: UI.api,
  accessibility: UI.accessibility,
  technical: { en: 'Technical', es: 'Técnico' },
};

/**
 * Page frame shared by every component demo.
 *
 * With the docs platform enabled (main app), the page is resolved from the
 * URL through the docs catalog and becomes a full documentation page:
 * Overview · Examples · Playground · API · Accessibility · Technical, with the
 * active tab in `?tab=` so every view is linkable. Without it (v4 demo), the
 * classic Examples/API layout is kept.
 */
@Component({
  selector: 'app-demo-page',
  imports: [
    NgTemplateOutlet,
    LucideDynamicIcon,
    RouterLink,
    LocalizePipe,
    DocOverviewComponent,
    DocAccessibilityComponent,
    DocTechnicalComponent,
    DocApiIndexComponent,
    DocPlaygroundComponent,
    PageStatusComponent,
    PrevNextComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (docs && page(); as p) {
      <div class="space-y-6">
        <header class="space-y-3">
          <h1 class="text-3xl lg:text-4xl font-semibold tracking-tight">{{ p.title | loc: lang() }}</h1>
          <p class="text-base lg:text-lg text-base-content/80 max-w-3xl leading-relaxed">{{ p.summary | loc: lang() }}</p>
          <div class="flex flex-wrap items-center gap-3">
            <code class="text-xs bg-base-200 border border-base-content/10 px-2.5 py-1 rounded-md font-mono text-base-content/80">
              import {{ '{' }} {{ importName() }} {{ '}' }} from '&#64;hakistack/ng-daisyui';
            </code>
            <app-page-status [status]="p.status" />
          </div>
        </header>

        <div role="tablist" class="docs-tabs" [attr.aria-label]="(p.title | loc: lang()) + ' documentation'">
          @for (t of tabs(); track t) {
            <button
              #tabBtn
              type="button"
              role="tab"
              class="docs-tab"
              [id]="'tab-' + t"
              [attr.aria-selected]="activeTab() === t"
              [attr.aria-controls]="'panel-' + t"
              [attr.tabindex]="activeTab() === t ? 0 : -1"
              (click)="selectTab(t)"
              (keydown)="onTabKey($event)"
            >
              {{ tabLabel(t) }}
            </button>
          }
        </div>

        <div
          role="tabpanel"
          [id]="'panel-' + activeTab()"
          [attr.aria-labelledby]="'tab-' + activeTab()"
          tabindex="0"
          class="focus:outline-none"
        >
          @switch (activeTab()) {
            @case ('overview') {
              <app-doc-overview [content]="content()" />
            }
            @case ('examples') {
              @if (p.examples?.length) {
                <nav class="docs-example-nav" [attr.aria-label]="ui.examples | loc: lang()">
                  @for (e of p.examples!; track e.id) {
                    <a
                      [routerLink]="p.route + '/' + e.id"
                      [queryParams]="{ tab: 'examples' }"
                      class="docs-chip"
                      [attr.aria-current]="feature() === e.id ? 'page' : null"
                      >{{ e.label | loc: lang() }}</a
                    >
                  }
                </nav>
              }
              <ng-container *ngTemplateOutlet="examplesTpl" />
            }
            @case ('playground') {
              <app-doc-playground [pageId]="p.id" />
            }
            @case ('api') {
              <app-doc-api-index [page]="p" />
              <ng-container *ngTemplateOutlet="apiTpl" />
            }
            @case ('accessibility') {
              <app-doc-accessibility [content]="content()" />
            }
            @case ('technical') {
              <app-doc-technical [content]="content()" />
            }
          }
        </div>
        <app-prev-next [pageId]="p.id" />
      </div>
    } @else {
      <div class="space-y-6">
        <header class="flex items-start gap-4 sm:gap-5">
          <div
            class="shrink-0 mt-0.5 w-12 h-12 rounded-2xl bg-primary/10 ring-1 ring-primary/15 text-primary flex items-center justify-center"
          >
            <svg [lucideIcon]="icon()" [size]="22"></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70 mb-2">{{ category() }}</div>
            <h1 class="text-3xl lg:text-[2.5rem] font-serif tracking-tight leading-[1.05]">{{ title() }}</h1>
            <p class="text-base-content/55 text-sm sm:text-[15px] max-w-2xl leading-relaxed mt-3">{{ description() }}</p>
            @if (showImport) {
              <code
                class="text-[11px] bg-base-200 border border-base-content/8 px-2.5 py-1 rounded-md font-mono text-base-content/45 inline-block mt-3"
              >
                import {{ '{' }} {{ importName() }} {{ '}' }} from '&#64;hakistack/ng-daisyui'
              </code>
            }
          </div>
        </header>
        <div role="tablist" class="tabs tabs-border tabs-bordered border-b border-base-content/10">
          <button
            role="tab"
            type="button"
            class="tab gap-1.5 font-medium"
            [class.tab-active]="legacyTab() === 'examples'"
            (click)="legacyTab.set('examples')"
          >
            <svg lucideIcon="layout-grid" [size]="14"></svg>
            Examples
          </button>
          <button
            role="tab"
            type="button"
            class="tab gap-1.5 font-medium"
            [class.tab-active]="legacyTab() === 'api'"
            (click)="legacyTab.set('api')"
          >
            <svg lucideIcon="code" [size]="14"></svg>
            API
          </button>
        </div>
        @if (legacyTab() === 'examples') {
          <ng-container *ngTemplateOutlet="examplesTpl" />
        } @else {
          <ng-container *ngTemplateOutlet="apiTpl" />
        }
      </div>
    }

    <!-- Projected slots are captured once and re-used by whichever layout renders. -->
    <ng-template #examplesTpl><ng-content select="[examples]" /></ng-template>
    <ng-template #apiTpl><ng-content select="[api]" /></ng-template>
  `,
})
export class DemoPageComponent {
  title = input.required<string>();
  description = input.required<string>();
  icon = input.required<string>();
  category = input.required<string>();
  importName = input.required<string>();

  protected readonly docs = inject(DOCS_PLATFORM, { optional: true }) ?? false;
  readonly showImport = SHOW_IMPORT;
  protected readonly ui = UI;
  protected readonly legacyTab = signal<'examples' | 'api'>('examples');

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  protected readonly lang = inject(DocsLocaleService).locale;
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  protected readonly page = computed(() => pageForUrl(this.url()));
  protected readonly feature = computed(() => this.params().get('feature'));
  protected readonly content = signal<ComponentDocContent | null | undefined>(undefined);

  protected readonly tabs = computed<DocTab[]>(() => {
    const p = this.page();
    if (!p) return ['examples', 'api'];
    const tabs: DocTab[] = [];
    if (p.hasContent) tabs.push('overview');
    tabs.push('examples');
    if (PLAYGROUNDS[p.id]) tabs.push('playground');
    tabs.push('api');
    if (p.hasContent) tabs.push('accessibility', 'technical');
    return tabs;
  });

  /** `?tab=` wins; otherwise an example URL (`/table/full`) opens Examples and the bare page opens Overview. */
  protected readonly activeTab = computed<DocTab>(() => {
    const requested = this.query().get('tab') as DocTab | null;
    const tabs = this.tabs();
    if (requested && tabs.includes(requested)) return requested;
    if (this.feature()) return 'examples';
    return tabs[0];
  });

  constructor() {
    effect((onCleanup) => {
      const p = this.page();
      this.content.set(p?.hasContent ? undefined : null);
      if (!this.docs || !p?.hasContent) return;
      let alive = true;
      onCleanup(() => (alive = false));
      void loadComponentContent(p).then((c) => alive && this.content.set(c));
    });
    effect(() => {
      const p = this.page();
      if (this.docs && p) this.titleService.setTitle(`${localize(p.title, this.lang())} · ng-daisyui`);
    });
  }

  protected tabLabel(t: DocTab): string {
    return localize(TAB_LABELS[t], this.lang());
  }

  protected selectTab(tab: DocTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, pg: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** WAI-ARIA tabs: arrows / Home / End move between tabs (automatic activation). */
  protected onTabKey(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const i = tabs.indexOf(this.activeTab());
    let next = -1;
    if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    this.selectTab(tabs[next]);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
