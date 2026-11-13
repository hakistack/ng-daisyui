import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { navOrder } from '../catalog/navigation';
import { DocsLocaleService, LocalizePipe, UI } from '../i18n/docs-locale.service';

/** Previous / next page links in sidebar order. */
@Component({
  selector: 'app-prev-next',
  imports: [RouterLink, LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="mt-12 pt-6 border-t border-base-content/10 grid grid-cols-2 gap-4" [attr.aria-label]="'Pager'">
      <div>
        @if (prev(); as p) {
          <a [routerLink]="p.route" class="group block rounded-box p-3 hover:bg-base-200">
            <span class="block text-xs text-base-content/70">← {{ ui.previous | loc: lang() }}</span>
            <span class="font-medium group-hover:text-primary">{{ p.title | loc: lang() }}</span>
          </a>
        }
      </div>
      <div class="text-right">
        @if (next(); as n) {
          <a [routerLink]="n.route" class="group block rounded-box p-3 hover:bg-base-200">
            <span class="block text-xs text-base-content/70">{{ ui.next | loc: lang() }} →</span>
            <span class="font-medium group-hover:text-primary">{{ n.title | loc: lang() }}</span>
          </a>
        }
      </div>
    </nav>
  `,
})
export class PrevNextComponent {
  readonly pageId = input.required<string>();
  protected readonly ui = UI;
  protected readonly lang = inject(DocsLocaleService).locale;
  private readonly index = computed(() => navOrder().findIndex((p) => p.id === this.pageId()));
  protected readonly prev = computed(() => (this.index() > 0 ? navOrder()[this.index() - 1] : null));
  protected readonly next = computed(() => {
    const i = this.index();
    return i >= 0 && i < navOrder().length - 1 ? navOrder()[i + 1] : null;
  });
}
