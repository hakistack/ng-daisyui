import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocsLocaleService, LocalizePipe, UI } from '../i18n/docs-locale.service';

const T = {
  body: {
    en: 'This page does not exist (or moved). Try the search, or start from the introduction.',
    es: 'Esta página no existe (o se movió). Prueba el buscador o empieza por la introducción.',
  },
  home: { en: 'Go to the introduction', es: 'Ir a la introducción' },
};

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-xl space-y-4 py-10">
      <h1 class="text-3xl font-semibold">{{ ui.notFound | loc: lang() }}</h1>
      <p class="text-base-content/80">{{ t.body | loc: lang() }}</p>
      <a class="btn btn-primary btn-sm" routerLink="/getting-started">{{ t.home | loc: lang() }}</a>
    </div>
  `,
})
export class NotFoundComponent {
  protected readonly ui = UI;
  protected readonly t = T;
  protected readonly lang = inject(DocsLocaleService).locale;
}
