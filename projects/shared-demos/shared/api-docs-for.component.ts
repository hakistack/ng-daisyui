import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ApiTableComponent } from './api-table.component';
import type { ApiDocEntry } from './api-table.types';
import { API_DOCS, type ApiComponentName, type ApiOutputEntry } from '../api-docs.generated';

/**
 * Drop-in replacement for hand-rolled API tables on demo pages.
 *
 * Pulls the component's inputs/outputs from `api-docs.generated.ts` (built
 * by `npm run extract-api-docs`) and feeds them straight into the existing
 * `<app-api-table>` chrome. The page author writes one tag instead of two
 * `ApiDocEntry[]` literals, and the table stays in sync with the lib's
 * source as long as the extractor is re-run.
 *
 * Renders nothing if both the inputs and outputs lists are empty.
 *
 * @example
 *   <app-api-docs-for component="EditorComponent" />
 */
@Component({
  selector: 'app-api-docs-for',
  imports: [ApiTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (api(); as a) {
      <div class="space-y-4">
        @if (a.description) {
          <p class="text-sm text-base-content/60 leading-relaxed">{{ a.description }}</p>
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
        >. Run <code>npm run extract-api-docs</code> after adding new components.
      </div>
    }
  `,
})
export class ApiDocsForComponent {
  readonly component = input.required<ApiComponentName>();

  protected readonly api = computed(() => API_DOCS[this.component()] ?? null);

  protected readonly inputEntries = computed<ApiDocEntry[]>(() => {
    const a = this.api();
    if (!a) return [];
    return a.inputs.map((i) => ({
      name: i.name,
      type: i.type,
      default: i.default,
      description: i.description,
    }));
  });

  protected readonly outputEntries = computed<ApiDocEntry[]>(() => {
    const a = this.api();
    if (!a) return [];
    return a.outputs.map((o: ApiOutputEntry) => ({
      name: o.name,
      type: o.type,
      // `<app-api-table>` always shows a "Default" column; outputs never
      // have one, so blank it out (the table renders "-" for missing).
      default: undefined,
      description: o.description,
    }));
  });
}
