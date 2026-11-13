import { ChangeDetectionStrategy, Component, afterNextRender, input } from '@angular/core';
import { CommandPaletteComponent, CommandPaletteConfig, CommandPaletteController } from '@hakistack/ng-daisyui';

/**
 * Mounts the docs search palette. Rendered inside an `@defer` block by the
 * shell, so the palette code is not in the initial bundle. If the user asked
 * for search before the chunk arrived (`openOnMount`), it opens as soon as it
 * has rendered.
 */
@Component({
  selector: 'app-docs-search-host',
  imports: [CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<hk-command-palette [config]="config()" />`,
})
export class DocsSearchHostComponent {
  readonly config = input.required<CommandPaletteConfig>();
  readonly controller = input.required<CommandPaletteController>();
  readonly openOnMount = input(false);

  constructor() {
    afterNextRender(() => {
      if (this.openOnMount()) this.controller().open();
    });
  }
}
