import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A Mesa panel header (docs/design/mesa-style-guide.md §3): what you're
 * looking at on the left (the default slot — a `badge badge-lg` whose text
 * truncates, then an optional save status), and the actions (`[hkMesaActions]`)
 * in a cluster pushed to the end that wraps instead of being cut.
 */
@Component({
  selector: 'hk-mesa-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'border-base-300 flex flex-wrap items-center gap-3 border-b px-3.5 py-2.5' },
  template: `
    <ng-content />
    <div class="ml-auto flex min-w-0 flex-wrap items-center gap-2">
      <ng-content select="[hkMesaActions]" />
    </div>
  `,
})
export class MesaToolbarComponent {}
