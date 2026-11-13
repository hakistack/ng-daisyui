import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { DocStatus } from '../catalog/catalog.types';
import { DocsLocaleService, LocalizePipe, UI } from '../i18n/docs-locale.service';

const LABEL = { stable: UI.statusStable, beta: UI.statusBeta, experimental: UI.statusExperimental, planned: UI.statusPlanned };
const HINT = {
  stable: {
    en: 'API is settled; breaking changes go through MIGRATION.md.',
    es: 'La API está asentada; los cambios incompatibles se documentan en MIGRATION.md.',
  },
  beta: {
    en: 'Usable today; the API may still change between minor versions.',
    es: 'Se puede usar hoy; la API aún puede cambiar entre versiones menores.',
  },
  experimental: { en: 'Early phase — expect gaps and API changes.', es: 'Fase temprana: espera huecos y cambios de API.' },
  planned: { en: 'Not implemented yet.', es: 'Aún no está implementado.' },
};

/** Maturity marker. Only rendered for non-stable pages, to keep stable pages quiet. */
@Component({
  selector: 'app-page-status',
  imports: [LocalizePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() !== 'stable') {
      <p class="inline-flex items-center gap-2 text-sm">
        <span class="badge badge-sm" [class]="badge()">{{ label() | loc: lang() }}</span>
        <span class="text-base-content/70">{{ hint() | loc: lang() }}</span>
      </p>
    }
  `,
})
export class PageStatusComponent {
  readonly status = input.required<DocStatus>();
  protected readonly lang = inject(DocsLocaleService).locale;
  protected readonly label = computed(() => LABEL[this.status()]);
  protected readonly hint = computed(() => HINT[this.status()]);
  protected readonly badge = computed(() =>
    this.status() === 'planned'
      ? 'badge-ghost'
      : this.status() === 'experimental'
        ? 'badge-warning badge-outline'
        : 'badge-info badge-outline',
  );
}
