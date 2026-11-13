import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlockComponent } from '../../shared/code-block.component';
import { ApiManifestService, KIND_LABELS, KIND_ORDER } from '../api/api-manifest.service';
import type { ComponentDocContent, DocPageMeta } from '../catalog/catalog.types';
import { pageById } from '../catalog/pages';
import { COMPONENT_CONTENT } from '../content';
import { DocsLocaleService, LocalizePipe, UI, localize } from '../i18n/docs-locale.service';
import { PLAYGROUNDS } from '../playground/hosts';
import { ContentSectionsComponent, RichTextComponent } from '../ui/content-blocks.component';

/** Loads the lazy content chunk for a component page. Shared by the tab panels. */
export function loadComponentContent(page: DocPageMeta | undefined): Promise<ComponentDocContent | null> {
  const loader = page ? COMPONENT_CONTENT[page.id] : undefined;
  return loader ? loader().catch(() => null) : Promise.resolve(null);
}

@Component({
  selector: 'app-doc-overview',
  imports: [RouterLink, LocalizePipe, RichTextComponent, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (content(); as c) {
      <div class="max-w-3xl space-y-8">
        <div class="space-y-3">
          @for (p of c.overview; track $index) {
            <p class="docs-p text-base"><app-rich-text [text]="p" /></p>
          }
        </div>
        <div class="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="when-yes">
            <h2 id="when-yes" class="docs-h3">{{ ui.whenToUse | loc: lang() }}</h2>
            <ul class="docs-list list-disc">
              @for (i of c.whenToUse; track $index) {
                <li><app-rich-text [text]="i" /></li>
              }
            </ul>
          </section>
          <section aria-labelledby="when-no">
            <h2 id="when-no" class="docs-h3">{{ ui.whenNotToUse | loc: lang() }}</h2>
            <ul class="docs-list list-disc">
              @for (i of c.whenNotToUse; track $index) {
                <li><app-rich-text [text]="i" /></li>
              }
            </ul>
          </section>
        </div>
        @if (c.quickStart; as qs) {
          <section aria-labelledby="quick-start" class="space-y-2">
            <h2 id="quick-start" class="docs-h3">{{ ui.quickStart | loc: lang() }}</h2>
            @if (qs.note) {
              <div class="docs-note" data-tone="info" role="note"><app-rich-text [text]="qs.note" /></div>
            }
            <app-code-block [code]="qs.ts" />
          </section>
        }
        @if (c.related.length) {
          <section aria-labelledby="related-components">
            <h2 id="related-components" class="docs-h3">{{ ui.related | loc: lang() }}</h2>
            <ul class="space-y-2">
              @for (r of c.related; track r.id) {
                @if (ref(r.id); as rp) {
                  <li>
                    <a class="link link-primary font-medium" [routerLink]="rp.route">{{ rp.title | loc: lang() }}</a>
                    <span class="text-base-content/70"> — {{ r.note | loc: lang() }}</span>
                  </li>
                }
              }
            </ul>
          </section>
        }
      </div>
    } @else if (content() === null) {
      <p class="text-base-content/70">{{ ui.contentMissing | loc: lang() }}</p>
    } @else {
      <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
    }
  `,
})
export class DocOverviewComponent {
  /** `undefined` while the lazy chunk loads, `null` when the page has no written content. */
  readonly content = input<ComponentDocContent | null | undefined>(undefined);
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
  protected ref(id: string) {
    return pageById(id);
  }
}

@Component({
  selector: 'app-doc-accessibility',
  imports: [LocalizePipe, RichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (content(); as c) {
      <div class="max-w-3xl space-y-6">
        <section aria-labelledby="a11y-keys">
          <h2 id="a11y-keys" class="docs-h3">{{ ui.keyboard | loc: lang() }}</h2>
          @if (c.accessibility.keyboard.length) {
            <div class="overflow-x-auto rounded-box border border-base-content/10">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th scope="col">{{ ui.keys | loc: lang() }}</th>
                    <th scope="col">{{ ui.action | loc: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (k of c.accessibility.keyboard; track $index) {
                    <tr>
                      <td class="whitespace-nowrap">
                        <kbd class="kbd kbd-sm">{{ k.keys }}</kbd>
                      </td>
                      <td>{{ k.action | loc: lang() }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-sm text-base-content/70">{{ ui.noKeyboard | loc: lang() }}</p>
          }
        </section>
        @if (c.accessibility.notes.length) {
          <section aria-labelledby="a11y-notes">
            <h2 id="a11y-notes" class="docs-h3">ARIA &amp; focus</h2>
            <ul class="docs-list list-disc">
              @for (n of c.accessibility.notes; track $index) {
                <li><app-rich-text [text]="n" /></li>
              }
            </ul>
          </section>
        }
      </div>
    } @else if (content() === null) {
      <p class="text-base-content/70">{{ ui.contentMissing | loc: lang() }}</p>
    } @else {
      <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
    }
  `,
})
export class DocAccessibilityComponent {
  /** `undefined` while the lazy chunk loads, `null` when the page has no written content. */
  readonly content = input<ComponentDocContent | null | undefined>(undefined);
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
}

@Component({
  selector: 'app-doc-technical',
  imports: [LocalizePipe, RichTextComponent, ContentSectionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (content(); as c) {
      <div class="max-w-3xl">
        <app-content-sections [sections]="c.technical" idPrefix="tech-" />
        @if (c.performance.length) {
          <section aria-labelledby="perf" class="docs-section">
            <h2 id="perf" class="docs-h2">{{ ui.performance | loc: lang() }}</h2>
            <ul class="docs-list list-disc">
              @for (p of c.performance; track $index) {
                <li><app-rich-text [text]="p" /></li>
              }
            </ul>
          </section>
        }
      </div>
    } @else if (content() === null) {
      <p class="text-base-content/70">{{ ui.contentMissing | loc: lang() }}</p>
    } @else {
      <p class="text-base-content/70" role="status">{{ ui.loading | loc: lang() }}</p>
    }
  `,
})
export class DocTechnicalComponent {
  /** `undefined` while the lazy chunk loads, `null` when the page has no written content. */
  readonly content = input<ComponentDocContent | null | undefined>(undefined);
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
}

/** Generated index of every public symbol the page owns (from the manifest). */
@Component({
  selector: 'app-doc-api-index',
  imports: [RouterLink, LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groups().length) {
      <section aria-labelledby="page-api" class="rounded-box border border-base-content/10 p-4 mb-6">
        <h2 id="page-api" class="docs-h3 mt-0">{{ ui.publicApi | loc: lang() }}</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (g of groups(); track g.kind) {
            <div>
              <h3 class="text-xs font-semibold uppercase tracking-wider text-base-content/70 mb-1">{{ g.label }}</h3>
              <ul class="space-y-0.5">
                @for (s of g.items; track s.name) {
                  <li>
                    <a class="link link-hover font-mono text-sm" [routerLink]="['/api', s.name]">{{ s.name }}</a>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class DocApiIndexComponent {
  readonly page = input.required<DocPageMeta>();
  private readonly manifest = inject(ApiManifestService);
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
  protected readonly groups = computed(() => {
    this.manifest.symbols();
    const owned = this.manifest.forPage(this.page());
    const lang = this.lang();
    return KIND_ORDER.map((kind) => ({
      kind,
      label: localize(KIND_LABELS[kind], lang),
      items: owned.filter((s) => s.kind === kind),
    })).filter((g) => g.items.length);
  });
  constructor() {
    void this.manifest.load();
  }
}

/** Lazy-loads and renders the page's playground component. */
@Component({
  selector: 'app-doc-playground',
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (component(); as cmp) {
      <ng-container *ngComponentOutlet="cmp" />
    }
  `,
})
export class DocPlaygroundComponent {
  readonly pageId = input.required<string>();
  protected readonly component = signal<Type<unknown> | null>(null);
  constructor() {
    effect(() => {
      const loader = PLAYGROUNDS[this.pageId()];
      this.component.set(null);
      if (loader) void loader().then((c) => this.component.set(c));
    });
  }
}
