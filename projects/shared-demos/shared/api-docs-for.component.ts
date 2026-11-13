import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ApiTableComponent } from './api-table.component';
import type { ApiDocEntry } from './api-table.types';
import type { ApiSymbolName } from '../platform/api/api-manifest.generated';
import { ApiManifestService } from '../platform/api/api-manifest.service';

/**
 * Inputs/outputs table for one component, read from the generated API
 * manifest (`npm run extract-api-docs`). The `component` name is type-checked
 * against the exported symbols, so a renamed or removed component fails the
 * demo build instead of silently showing stale docs.
 *
 * @example
 *   <app-api-docs-for component="EditorComponent" />
 */
@Component({
  selector: 'app-api-docs-for',
  imports: [ApiTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!manifest.symbols()) {
      <p class="text-sm text-base-content/70" role="status">Loading API…</p>
    } @else if (api(); as a) {
      <div class="space-y-4">
        @if (a.description) {
          <p class="text-sm text-base-content/70 leading-relaxed">{{ a.description }}</p>
        }
        @if (inputEntries().length > 0) {
          <app-api-table title="Inputs" [entries]="inputEntries()" />
        }
        @if (outputEntries().length > 0) {
          <app-api-table title="Outputs" [entries]="outputEntries()" />
        }
      </div>
    } @else {
      <div class="alert alert-warning text-sm">
        No API metadata found for <code>{{ component() }}</code
        >. Run <code>npm run extract-api-docs</code>.
      </div>
    }
  `,
})
export class ApiDocsForComponent {
  readonly component = input.required<ApiSymbolName>();
  protected readonly manifest = inject(ApiManifestService);

  protected readonly api = computed(() => this.manifest.byName().get(this.component()) ?? null);

  protected readonly inputEntries = computed<ApiDocEntry[]>(() =>
    (this.api()?.inputs ?? []).map((i) => ({
      name: i.required ? `${i.name} (required)` : i.model ? `${i.name} (model)` : i.name,
      type: i.type,
      default: i.default,
      description: i.description ?? '',
    })),
  );

  protected readonly outputEntries = computed<ApiDocEntry[]>(() =>
    (this.api()?.outputs ?? []).map((o) => ({ name: o.name, type: o.type, default: undefined, description: o.description ?? '' })),
  );

  constructor() {
    void this.manifest.load();
  }
}
