import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommandPaletteComponent, CommandPaletteController, CommandPaletteMode, createCommandPalette } from '@hakistack/ng-daisyui';
import { PlaygroundComponent } from '../playground.component';
import {
  COMMAND_PALETTE_PLAYGROUND,
  CommandPalettePgState,
  PALETTE_GROUPS,
  PALETTE_HELP_TEXT,
  PALETTE_ITEMS,
} from '../specs/command-palette';
import type { PlaygroundState } from '../playground.types';

type Log = (name: string, payload: unknown) => void;

@Component({
  selector: 'app-command-palette-playground',
  imports: [PlaygroundComponent, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-playground [spec]="spec">
      <ng-template let-raw let-log="log">
        @let p = palette(raw, log);
        <div class="flex flex-col items-center gap-3">
          <button type="button" class="btn btn-primary" (click)="p.open()">Open palette</button>
          @if (hotkeyHint(raw); as hint) {
            <span class="text-xs text-base-content/70"
              >or press <kbd class="kbd kbd-sm">{{ hint }}</kbd></span
            >
          }
          <p class="text-sm text-base-content/70" aria-live="polite">
            Last callback: <code>{{ last() || '—' }}</code>
          </p>
        </div>
        <hk-command-palette [config]="p.config()" />
      </ng-template>
    </app-playground>
  `,
})
export class CommandPalettePlaygroundComponent {
  protected readonly spec = COMMAND_PALETTE_PLAYGROUND;
  /** CommandPaletteComponent has no outputs, so callbacks are echoed here as well as in the log. */
  protected readonly last = signal('');
  private cache: { raw: PlaygroundState; palette: CommandPaletteController } | null = null;

  protected hotkeyHint(raw: PlaygroundState): string {
    const hotkey = (raw as CommandPalettePgState).hotkey;
    return hotkey === 'false' ? '' : hotkey;
  }

  /** One controller per playground state (the state object only changes when a control does). */
  protected palette(raw: PlaygroundState, log: Log): CommandPaletteController {
    if (this.cache?.raw !== raw) {
      const s = raw as CommandPalettePgState;
      const record = (name: string, payload: unknown): void => {
        this.last.set(name);
        log(name, payload);
      };
      const modes: CommandPaletteMode[] = [{ prefix: '?', layout: 'help', indicatorLabel: 'Help', helpText: PALETTE_HELP_TEXT }];
      if (s.groups) modes.push({ prefix: '>', filterGroups: ['actions'], indicatorLabel: 'Actions' });
      this.cache = {
        raw,
        palette: createCommandPalette({
          items: PALETTE_ITEMS.map((it) => ({
            id: it.id,
            label: it.label,
            description: it.description,
            group: s.groups ? it.group : undefined,
          })),
          groups: s.groups ? [...PALETTE_GROUPS] : undefined,
          modes: s.modes ? modes : undefined,
          filter: s.filter === 'substring' ? 'substring' : 'fuzzy',
          hotkey: s.hotkey === 'false' ? false : s.hotkey,
          closeOnSelect: s.closeOnSelect,
          emptyMessage: s.emptyMessage || undefined,
          onSelect: (item) => record('onSelect', { id: item.id, label: item.label }),
          onOpen: () => record('onOpen', undefined),
          onClose: () => record('onClose', undefined),
          onQueryChange: (query, mode) => record('onQueryChange', { query, mode: mode?.prefix ?? null }),
        }),
      };
    }
    return this.cache.palette;
  }
}
