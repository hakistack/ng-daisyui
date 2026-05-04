import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HK_THEME } from '../../theme/theme.config';
import { DEFAULT_COMMAND_PALETTE_LABELS, HK_COMMAND_PALETTE_LABELS, ResolvedCommandPaletteLabels } from './command-palette.labels';
import { CommandPaletteConfig } from './command-palette.types';

/**
 * Modal command palette — a search-driven launcher with grouped results,
 * mode prefixes, and a global hotkey. Inspired by Tailwind Plus's command
 * palette pattern, built native to this lib (no web-component runtime
 * dependency, no commercial license).
 *
 * **Phase 1 status (current):** scaffolding only — accepts `[config]`,
 * exposes the controller API, renders a "loading…" placeholder. Modal,
 * search, mode prefixes, hotkey listener, and keyboard nav land in
 * follow-up commits.
 *
 * Configuration is **builder-only** (matching `createForm` / `createTable`
 * / `createPdfViewer`):
 * - `[config]` — pass `controller.config()` from a `createCommandPalette({...})`
 *   call. All items, groups, modes, hotkey, and callbacks live there.
 * - Imperative actions (`open`, `close`, `toggle`, `setQuery`, `clear`)
 *   live on the controller — no `@ViewChild` needed.
 *
 * @example
 * // class:
 * palette = createCommandPalette({
 *   items: [
 *     { id: 'p1', label: 'Website Redesign', group: 'projects', onSelect: () => goto('/p1') },
 *   ],
 *   groups: [{ id: 'projects', label: 'Projects' }],
 *   modes: [{ prefix: '#', filterGroups: ['projects'], indicatorLabel: 'Searching projects' }],
 * });
 *
 * // template:
 * // <hk-command-palette [config]="palette.config()" />
 * // <button (click)="palette.open()">Open</button>
 *
 * // anywhere:
 * // this.palette.open();
 * // this.palette.setQuery('#design');
 */
@Component({
  selector: 'hk-command-palette',
  imports: [CommonModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class CommandPaletteComponent {
  private readonly theme = inject(HK_THEME);
  private readonly userLabels = inject(HK_COMMAND_PALETTE_LABELS, { optional: true });

  /**
   * Configuration object — pass `controller.config()` from a `createCommandPalette({...})` call.
   * See `CommandPaletteConfig` for the full shape.
   */
  readonly config = input.required<CommandPaletteConfig>();

  /** Labels with consumer overrides applied; falls back to English defaults. */
  readonly labels = computed<ResolvedCommandPaletteLabels>(() => ({
    ...DEFAULT_COMMAND_PALETTE_LABELS,
    ...this.userLabels,
  }));

  /** Modal panel container — theme-bridged card matching the rest of the lib. */
  readonly panelClass = computed(() => `card ${this.theme.classes.cardBorder} bg-base-100 overflow-hidden flex flex-col`);
}
