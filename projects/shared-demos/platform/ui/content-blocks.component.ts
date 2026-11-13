import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { CodeBlockComponent } from '../../shared/code-block.component';
import type { CodeLang } from '../../shared/syntax-highlighter';
import type { ContentBlock, ContentSection, Localized } from '../catalog/catalog.types';
import { DocsLocaleService, localize } from '../i18n/docs-locale.service';
import { renderInline } from './rich-text';

const LANG: Record<string, CodeLang> = { ts: 'typescript', html: 'angular-html', css: 'css', json: 'json', bash: 'bash' };

/**
 * Intercepts clicks on internal links rendered from rich text so they route
 * client-side instead of reloading the app.
 */
export function handleInternalLink(event: MouseEvent, router: Router): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as HTMLElement | null)?.closest?.('a[data-internal]');
  if (!anchor) return;
  event.preventDefault();
  void router.navigateByUrl(anchor.getAttribute('href') ?? '/');
}

/** Inline rich text (`code`, **bold**, [links](/route)) in the current language. */
@Component({
  selector: 'app-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'onClick($event)', '[innerHTML]': 'html()' },
  template: '',
})
export class RichTextComponent {
  readonly text = input.required<Localized | string>();
  private readonly locale = inject(DocsLocaleService);
  private readonly router = inject(Router);
  protected readonly html = computed(() => renderInline(localize(this.text(), this.locale.locale())));
  protected onClick(event: MouseEvent): void {
    handleInternalLink(event, this.router);
  }
}

/** Renders content sections (headings with anchors + blocks). */
@Component({
  selector: 'app-content-sections',
  imports: [CodeBlockComponent, RichTextComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @for (section of sections(); track section.id) {
      <section class="docs-section" [attr.aria-labelledby]="idPrefix() + section.id">
        <h2 [id]="idPrefix() + section.id" class="docs-h2 group">
          {{ t(section.heading) }}
          <a class="docs-anchor" [href]="'#' + idPrefix() + section.id" [attr.aria-label]="'Link: ' + t(section.heading)">#</a>
        </h2>
        @for (block of section.blocks; track $index) {
          @switch (block.kind) {
            @case ('p') {
              <p class="docs-p"><app-rich-text [text]="asP(block).text" /></p>
            }
            @case ('list') {
              @if (asList(block).ordered) {
                <ol class="docs-list list-decimal">
                  @for (item of asList(block).items; track $index) {
                    <li><app-rich-text [text]="item" /></li>
                  }
                </ol>
              } @else {
                <ul class="docs-list list-disc">
                  @for (item of asList(block).items; track $index) {
                    <li><app-rich-text [text]="item" /></li>
                  }
                </ul>
              }
            }
            @case ('code') {
              <div class="my-4">
                @if (asCode(block).title) {
                  <div class="text-xs font-mono text-base-content/70 mb-1.5">{{ asCode(block).title }}</div>
                }
                <app-code-block [code]="asCode(block).code" [lang]="lang(asCode(block).lang)" />
              </div>
            }
            @case ('note') {
              <div class="docs-note" [attr.data-tone]="asNote(block).tone" role="note">
                <app-rich-text [text]="asNote(block).text" />
              </div>
            }
            @case ('table') {
              <div
                class="overflow-x-auto my-4 rounded-box border border-base-content/10"
                tabindex="0"
                role="region"
                [attr.aria-label]="t(section.heading)"
              >
                <table class="table table-sm">
                  <thead>
                    <tr>
                      @for (h of asTable(block).head; track $index) {
                        <th scope="col">{{ t(h) }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of asTable(block).rows; track $index) {
                      <tr>
                        @for (cell of row; track $index) {
                          <td class="align-top"><app-rich-text [text]="cell" /></td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            @case ('flow') {
              <ol class="docs-flow" [attr.aria-label]="t(section.heading)">
                @for (step of asFlow(block).steps; track $index) {
                  <li class="docs-flow-step">
                    <span class="docs-flow-index" aria-hidden="true">{{ $index + 1 }}</span>
                    <div class="min-w-0">
                      <div class="font-medium">{{ t(step.label) }}</div>
                      @if (step.detail) {
                        <div class="text-sm text-base-content/70 mt-0.5"><app-rich-text [text]="step.detail" /></div>
                      }
                    </div>
                  </li>
                }
              </ol>
            }
          }
        }
      </section>
    }
  `,
})
export class ContentSectionsComponent {
  readonly sections = input.required<readonly ContentSection[]>();
  /** Prefix for anchor ids, to keep them unique when several lists share a page. */
  readonly idPrefix = input('');
  private readonly locale = inject(DocsLocaleService);

  protected t(v: Localized): string {
    return localize(v, this.locale.locale());
  }
  protected lang(l: string): CodeLang {
    return LANG[l] ?? 'typescript';
  }
  protected asP(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'p' }>;
  }
  protected asList(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'list' }>;
  }
  protected asCode(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'code' }>;
  }
  protected asNote(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'note' }>;
  }
  protected asTable(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'table' }>;
  }
  protected asFlow(b: ContentBlock) {
    return b as Extract<ContentBlock, { kind: 'flow' }>;
  }
}
