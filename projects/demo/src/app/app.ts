import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter } from 'rxjs';
import { CommandPaletteLabels, HK_COMMAND_PALETTE_LABELS, NotificationHostComponent, createCommandPalette } from '@hakistack/ng-daisyui';
import { buildSidebar } from '@shared-demos/platform/catalog/navigation';
import { pageForUrl } from '@shared-demos/platform/catalog/pages';
import type { DocsLocale } from '@shared-demos/platform/catalog/catalog.types';
import { ApiManifestService } from '@shared-demos/platform/api/api-manifest.service';
import { DOCS_LOCALES, DocsLocaleService, LocalizePipe, UI, localize } from '@shared-demos/platform/i18n/docs-locale.service';
import { DocsSearchService } from '@shared-demos/platform/search/docs-search.service';
import { DocsSearchHostComponent } from '@shared-demos/platform/search/docs-search-host.component';

const THEMES = [
  'kaizen',
  'kaizen-light',
  'light',
  'dark',
  'cupcake',
  'bumblebee',
  'emerald',
  'corporate',
  'synthwave',
  'retro',
  'cyberpunk',
  'valentine',
  'halloween',
  'garden',
  'forest',
  'aqua',
  'lofi',
  'pastel',
  'fantasy',
  'wireframe',
  'black',
  'luxury',
  'dracula',
  'cmyk',
  'autumn',
  'business',
  'acid',
  'lemonade',
  'night',
  'coffee',
  'winter',
  'dim',
  'nord',
  'sunset',
  'caramellatte',
  'abyss',
  'silk',
] as const;

const PALETTE_LABELS: Record<DocsLocale, CommandPaletteLabels> = {
  en: {
    searchPlaceholder: UI.searchPlaceholder.en,
    searchAriaLabel: UI.search.en,
    noResults: 'No results',
    noResultsHint: 'Try a task ("server-side pagination"), a component or an API symbol.',
    closeAriaLabel: 'Close search',
  },
  es: {
    searchPlaceholder: UI.searchPlaceholder.es,
    searchAriaLabel: UI.search.es,
    noResults: 'Sin resultados',
    noResultsHint: 'Prueba una tarea ("paginación en servidor"), un componente o un símbolo de la API.',
    closeAriaLabel: 'Cerrar búsqueda',
  },
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideDynamicIcon,
    NotificationHostComponent,
    DocsSearchHostComponent,
    LocalizePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Getters read the locale signal, so the palette's labels computed re-runs on language switch.
    {
      provide: HK_COMMAND_PALETTE_LABELS,
      useFactory: (): CommandPaletteLabels => {
        const locale = inject(DocsLocaleService);
        const pick = (k: keyof CommandPaletteLabels) => () => PALETTE_LABELS[locale.locale()][k];
        const labels = {};
        for (const k of Object.keys(PALETTE_LABELS.en) as (keyof CommandPaletteLabels)[]) {
          Object.defineProperty(labels, k, { get: pick(k), enumerable: true });
        }
        return labels;
      },
    },
  ],
  host: { '(document:keydown.escape)': 'closeNav()' },
  template: `
    <a href="#main" class="docs-skip-link" (click)="skipToMain($event)">{{ ui.skipToContent | loc: lang() }}</a>

    <div class="drawer lg:drawer-open min-h-screen bg-base-100">
      <input
        id="docs-nav"
        type="checkbox"
        class="drawer-toggle"
        [checked]="navOpen()"
        (change)="navOpen.set($any($event.target).checked)"
        tabindex="-1"
        aria-hidden="true"
      />

      <div class="drawer-content flex flex-col min-w-0">
        <header class="sticky top-0 z-30 bg-base-100 border-b border-base-content/10">
          <div class="flex items-center gap-2 h-14 px-4 lg:px-8">
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square lg:hidden"
              [attr.aria-label]="ui.openNavigation | loc: lang()"
              [attr.aria-expanded]="navOpen()"
              aria-controls="docs-sidebar"
              (click)="openNav()"
            >
              <svg lucideIcon="menu" [size]="20" aria-hidden="true"></svg>
            </button>
            <a routerLink="/" class="font-semibold tracking-tight lg:hidden">ng-daisyui</a>

            <button
              #searchTrigger
              type="button"
              class="docs-search-trigger"
              (click)="openSearch()"
              [attr.aria-label]="ui.search | loc: lang()"
            >
              <svg lucideIcon="search" [size]="15" aria-hidden="true"></svg>
              <span class="hidden sm:inline truncate">{{ ui.search | loc: lang() }}</span>
              <kbd class="kbd kbd-xs hidden sm:inline-flex ml-auto">{{ modKey }} K</kbd>
            </button>

            <div class="ml-auto flex items-center gap-1 sm:gap-2">
              <div class="join" role="group" [attr.aria-label]="ui.language | loc: lang()">
                @for (l of locales; track l.id) {
                  <button
                    type="button"
                    class="btn btn-xs join-item"
                    [class]="lang() === l.id ? 'btn-neutral' : 'btn-ghost'"
                    [attr.aria-pressed]="lang() === l.id"
                    [attr.lang]="l.id"
                    [attr.aria-label]="l.label"
                    (click)="setLocale(l.id)"
                  >
                    {{ l.short }}
                  </button>
                }
              </div>
              <label class="hidden sm:flex items-center">
                <span class="sr-only">{{ ui.theme | loc: lang() }}</span>
                <select
                  class="select select-bordered select-xs w-32 capitalize"
                  [value]="currentTheme()"
                  (change)="setTheme($any($event.target).value)"
                >
                  @for (theme of themes; track theme) {
                    <option [value]="theme">{{ theme }}</option>
                  }
                </select>
              </label>
              <a
                href="https://github.com/hakistack/ng-daisyui"
                class="btn btn-ghost btn-sm hidden md:inline-flex font-normal"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </header>

        <main id="main" #main tabindex="-1" class="flex-1 px-4 py-6 lg:px-10 lg:py-8 focus:outline-none">
          <div class="max-w-6xl mx-auto">
            <router-outlet />
          </div>
        </main>

        <footer class="px-4 lg:px-10 py-5 border-t border-base-content/10">
          <div class="max-w-6xl mx-auto flex flex-wrap gap-x-6 gap-y-1 items-center justify-between text-xs text-base-content/70">
            <span>&#64;hakistack/ng-daisyui · MIT · Angular 21 · daisyUI 5</span>
            <a href="/v4/" class="link link-hover">daisyUI 4 / Tailwind 3 compatibility demo</a>
          </div>
        </footer>

        <hk-notification-host />
        <!-- Search UI is code-split: loaded when the browser is idle or on first click of the search button. -->
        @defer (on idle; on interaction(searchTrigger)) {
          <app-docs-search-host [config]="paletteConfig()" [controller]="palette" [openOnMount]="searchRequested()" />
        }
      </div>

      <div class="drawer-side z-40">
        <button
          type="button"
          class="drawer-overlay"
          tabindex="-1"
          [attr.aria-label]="ui.closeNavigation | loc: lang()"
          (click)="closeNav()"
        ></button>
        <aside id="docs-sidebar" class="bg-base-100 w-72 min-h-full border-r border-base-content/10 flex flex-col">
          <div class="flex items-center justify-between px-5 h-14 border-b border-base-content/10">
            <a routerLink="/" class="flex items-baseline gap-2">
              <span class="font-semibold tracking-tight">ng-daisyui</span>
              <span class="text-xs font-mono text-base-content/70">v0.3</span>
            </a>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square lg:hidden"
              [attr.aria-label]="ui.closeNavigation | loc: lang()"
              (click)="closeNav()"
            >
              <svg lucideIcon="x" [size]="18" aria-hidden="true"></svg>
            </button>
          </div>
          <nav class="flex-1 overflow-y-auto px-3 py-4 docs-sidebar" [attr.aria-label]="ui.mainNavigation | loc: lang()" #sidebarNav>
            @for (block of sidebar; track $index) {
              <!-- A package's sections form one labelled group; ecosystem sections (overview, contributing) stand alone. -->
              <div
                [class.docs-nav-product-block]="!!block.label"
                [attr.role]="block.label ? 'group' : null"
                [attr.aria-labelledby]="block.label ? 'docs-nav-product-' + block.product : null"
              >
                @if (block.label) {
                  <p class="docs-nav-product" [id]="'docs-nav-product-' + block.product">{{ block.label }}</p>
                }
                @for (section of block.sections; track section.section) {
                  <div class="mb-5">
                    <h2 class="docs-nav-section">{{ section.title | loc: lang() }}</h2>
                    @for (group of section.groups; track group.id) {
                      @if (group.title) {
                        <h3 class="docs-nav-group">{{ group.title | loc: lang() }}</h3>
                      }
                      <ul class="space-y-px">
                        @for (p of group.pages; track p.id) {
                          <li>
                            <a
                              [routerLink]="p.route"
                              routerLinkActive="docs-nav-active"
                              #rla="routerLinkActive"
                              [attr.aria-current]="rla.isActive ? 'page' : null"
                              class="docs-nav-link"
                            >
                              <span class="truncate">{{ p.title | loc: lang() }}</span>
                              @if (p.status !== 'stable') {
                                <span class="docs-nav-status">{{ statusLabel(p.status) }}</span>
                              }
                            </a>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
              </div>
            }
          </nav>
        </aside>
      </div>
    </div>
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(DocsLocaleService);
  private readonly search = inject(DocsSearchService);
  private readonly manifest = inject(ApiManifestService);
  private readonly injector = inject(Injector);
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly sidebarNav = viewChild.required<ElementRef<HTMLElement>>('sidebarNav');

  protected readonly ui = UI;
  protected readonly lang = this.locale.locale;
  protected readonly locales = DOCS_LOCALES;
  protected readonly themes = THEMES;
  protected readonly sidebar = buildSidebar();
  protected readonly currentTheme = signal(this.readTheme());
  protected readonly navOpen = signal(false);
  protected readonly searchRequested = signal(false);
  private returnFocusToMain = false;
  protected readonly modKey = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '') ? '⌘' : 'Ctrl';

  protected readonly palette = createCommandPalette({
    items: [],
    groups: [
      { id: 'pages', label: 'Pages' },
      { id: 'examples', label: 'Examples' },
      { id: 'api', label: 'API' },
    ],
    filter: (query) => this.search.filter(query),
    hotkey: 'Mod+K',
    // The manifest (API symbols) is a lazy chunk: fetch it the first time search opens.
    onOpen: () => void this.manifest.load(),
  });

  /** Merge live items + localized group labels into the controller's config (keeps its internal bridge). */
  protected readonly paletteConfig = computed(() => {
    const lang = this.lang();
    return {
      ...this.palette.config(),
      items: this.search.items(),
      groups: [
        { id: 'pages', label: localize(UI.pages, lang) },
        { id: 'examples', label: localize(UI.examplesGroup, lang) },
        { id: 'api', label: localize(UI.apiGroup, lang) },
      ],
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Close the drawer when a navigation *starts* (a link was followed). Closing on NavigationEnd would also
    // fire for a slow initial navigation that completes after the user already opened the drawer.
    this.router.events
      .pipe(
        filter((e): e is NavigationStart => e instanceof NavigationStart),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => {
        if (!this.navOpen()) return;
        this.navOpen.set(false);
        this.returnFocusToMain = true;
      });
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((e) => {
        if (this.returnFocusToMain) {
          this.returnFocusToMain = false;
          this.main().nativeElement.focus({ preventScroll: true });
        }
        // Section switch without a page match → generic title (pages set their own).
        if (!pageForUrl(e.urlAfterRedirects)) this.document.title = 'ng-daisyui';
      });
    effect(() => this.document.documentElement.setAttribute('data-theme', this.currentTheme()));
  }

  protected openSearch(): void {
    void this.manifest.load();
    // Before the deferred palette mounts, open() is a no-op; the host opens it on mount instead.
    this.searchRequested.set(true);
    this.palette.open();
  }

  protected openNav(): void {
    this.navOpen.set(true);
    // Move focus into the drawer so keyboard users land in the navigation.
    afterNextRender(
      () => {
        // daisyUI transitions the drawer's visibility (0.3s); focus once it is visible.
        setTimeout(() => {
          if (this.navOpen()) this.sidebarNav().nativeElement.querySelector<HTMLElement>('a')?.focus();
        }, 320);
      },
      { injector: this.injector },
    );
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected setLocale(locale: DocsLocale): void {
    this.locale.set(locale);
  }

  protected setTheme(theme: string): void {
    this.currentTheme.set(theme);
    try {
      localStorage.setItem('hk-demo-theme', theme);
    } catch {
      /* storage blocked */
    }
  }

  protected statusLabel(status: string): string {
    const key = status === 'beta' ? UI.statusBeta : status === 'experimental' ? UI.statusExperimental : UI.statusPlanned;
    return localize(key, this.lang());
  }

  private readTheme(): string {
    try {
      return localStorage.getItem('hk-demo-theme') ?? 'kaizen';
    } catch {
      return 'kaizen';
    }
  }
}
