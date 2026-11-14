import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { CodeBlockComponent } from './code-block.component';
import { DOCS_PLATFORM } from '../platform/docs-platform';
import { DocsLocaleService } from '../platform/i18n/docs-locale.service';
import { DEMO_STRINGS_ES } from '../platform/i18n/demo-strings.es';

@Component({
  selector: 'app-doc-section',
  imports: [CodeBlockComponent, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="card card-border card-bordered bg-base-200 overflow-hidden">
      <!-- Header: title + description on the left, code toggle on the right -->
      <div class="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div class="min-w-0">
          <h2 class="text-base font-serif leading-tight">{{ shownTitle() }}</h2>
          @if (shownDescription()) {
            <p class="text-xs text-base-content/70 mt-1 leading-relaxed">{{ shownDescription() }}</p>
          }
        </div>
        @if (codeExample()) {
          <button
            type="button"
            class="btn btn-ghost btn-xs gap-1.5 shrink-0 text-base-content/80 font-medium"
            [attr.aria-pressed]="showCode()"
            (click)="showCode.set(!showCode())"
          >
            <svg [lucideIcon]="showCode() ? 'chevron-up' : 'code'" [size]="13"></svg>
            {{ showCode() ? labels().hide : labels().show }}
          </button>
        }
      </div>

      <!-- Live demo surface -->
      <div class="px-4 sm:px-5 pb-4">
        <ng-content />
      </div>

      <!-- Inline code reveal -->
      @if (codeExample() && showCode()) {
        <div class="border-t border-base-content/8 bg-base-300/30 p-3 sm:p-4">
          <app-code-block [code]="codeExample()!" />
        </div>
      }
    </div>
  `,
})
export class DocSectionComponent {
  title = input.required<string>();
  description = input<string>('');
  codeExample = input<string>('');
  showCode = signal(false);

  // On the docs platform, Spanish comes from DEMO_STRINGS_ES (keyed by the English text, so demo
  // files stay untouched); `npm run docs:check` fails when a section has no translation.
  private readonly docs = inject(DOCS_PLATFORM, { optional: true }) ?? false;
  private readonly locale = inject(DocsLocaleService).locale;
  private readonly spanish = computed(() => this.docs && this.locale() === 'es');
  protected readonly shownTitle = computed(() => (this.spanish() ? (DEMO_STRINGS_ES[this.title()] ?? this.title()) : this.title()));
  protected readonly shownDescription = computed(() => {
    const d = this.description();
    return this.spanish() && d ? (DEMO_STRINGS_ES[d] ?? d) : d;
  });
  protected readonly labels = computed(() =>
    this.spanish() ? { show: 'Ver código', hide: 'Ocultar código' } : { show: 'Show code', hide: 'Hide code' },
  );
}
