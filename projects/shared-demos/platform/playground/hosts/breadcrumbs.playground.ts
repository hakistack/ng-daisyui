import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BreadcrumbItem, BreadcrumbSize, BreadcrumbsComponent } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import { BREADCRUMBS_PLAYGROUND, BreadcrumbsPgState } from '../specs/breadcrumbs';
import type { PlaygroundState } from '../playground.types';

/** Breadcrumb `action` that does nothing: the crumb stays clickable and `(itemSelect)` still fires. */
const stay = (): void => undefined;

@Component({
  selector: 'app-breadcrumbs-playground',
  imports: [PlaygroundComponent, BreadcrumbsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let s = view(raw);
        <hk-breadcrumbs
          [items]="items"
          [size]="s.size"
          [maxWidth]="s.maxWidth"
          [auto]="s.auto"
          [ariaLabel]="s.ariaLabel"
          (itemSelect)="log('itemSelect', { label: $event.label })"
        />
      </ng-template>
    </app-playground>
  `,
})
export class BreadcrumbsPlaygroundComponent {
  protected readonly spec = BREADCRUMBS_PLAYGROUND;
  // Same trail as BREADCRUMBS_ITEMS_SOURCE in the generated code, with `action`
  // instead of `routerLink` so clicking a crumb never navigates away from the docs.
  protected readonly items: BreadcrumbItem[] = [
    { label: 'Home', icon: 'house', action: stay },
    { label: 'Projects', icon: 'folder', action: stay },
    { label: 'Website redesign', action: stay },
    { label: 'Assets', action: stay },
    { label: 'logo.svg', icon: 'file-text' },
  ];

  protected view(raw: PlaygroundState) {
    const s = raw as BreadcrumbsPgState;
    return { ...s, size: s.size as BreadcrumbSize, maxWidth: s.maxWidth || undefined };
  }
}
