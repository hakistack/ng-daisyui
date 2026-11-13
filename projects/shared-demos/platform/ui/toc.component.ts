import { ChangeDetectionStrategy, Component, DestroyRef, afterRenderEffect, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DocsLocaleService, LocalizePipe, UI } from '../i18n/docs-locale.service';

export interface TocEntry {
  readonly id: string;
  readonly label: string;
}

/**
 * "On this page" list. Highlights the section currently in view with an
 * IntersectionObserver (no scroll listeners). Anchors are plain hash links,
 * so it works without JS too.
 */
@Component({
  selector: 'app-toc',
  imports: [LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entries().length > 1) {
      <nav [attr.aria-label]="ui.onThisPage | loc: lang()" class="text-sm">
        <div class="text-xs font-semibold uppercase tracking-wider text-base-content/70 mb-2">{{ ui.onThisPage | loc: lang() }}</div>
        <ul class="space-y-1 border-l border-base-content/10">
          @for (e of entries(); track e.id) {
            <li>
              <a
                [href]="'#' + e.id"
                class="block -ml-px border-l pl-3 py-0.5 leading-snug hover:text-base-content"
                [class]="active() === e.id ? 'border-primary text-base-content font-medium' : 'border-transparent text-base-content/70'"
                [attr.aria-current]="active() === e.id ? 'location' : null"
                (click)="go($event, e.id)"
                >{{ e.label }}</a
              >
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class TocComponent {
  readonly entries = input.required<readonly TocEntry[]>();
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
  protected readonly active = signal<string | null>(null);
  private readonly document = inject(DOCUMENT);
  private observer?: IntersectionObserver;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
    afterRenderEffect(() => {
      const ids = this.entries().map((e) => e.id);
      this.observer?.disconnect();
      if (typeof IntersectionObserver === 'undefined') return;
      this.observer = new IntersectionObserver(
        (records) => {
          const visible = records.filter((r) => r.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) this.active.set(visible[0].target.id);
        },
        { rootMargin: '-64px 0px -70% 0px' },
      );
      for (const id of ids) {
        const el = this.document.getElementById(id);
        if (el) this.observer.observe(el);
      }
    });
  }

  protected go(event: MouseEvent, id: string): void {
    const el = this.document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    // Move focus for keyboard / screen-reader users without a visible outline jump.
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    this.active.set(id);
  }
}
