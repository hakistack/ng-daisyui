import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * App-wide default text for every `<hk-command-palette>`. Override globally
 * via `provideHkCommandPaletteLabels({...})`. Mirrors the pattern used by
 * `provideDynamicFormLabels` and `provideHkPdfLabels`.
 */
export interface CommandPaletteLabels {
  /** Search input placeholder. Default: "Search…" */
  searchPlaceholder?: string;
  /** Search input aria-label. Default: "Command palette search" */
  searchAriaLabel?: string;
  /** Empty-state heading. Default: "No results found" */
  noResults?: string;
  /** Empty-state body. Default: "We couldn't find anything with that term. Please try again." */
  noResultsHint?: string;
  /** Help heading shown in `?` mode. Default: "Help with searching" */
  helpHeading?: string;
  /** "Close" button aria-label. Default: "Close command palette" */
  closeAriaLabel?: string;
  /** Hotkey hint shown in the trigger button (when consumer renders one). Default: "Mod+K" */
  hotkeyHint?: string;
  /** Mode-indicator chip prefix. Default: "Mode:" */
  modePrefix?: string;
}

/** Resolved labels — every field guaranteed to be a string. */
export type ResolvedCommandPaletteLabels = Required<CommandPaletteLabels>;

/** Default English label set. */
export const DEFAULT_COMMAND_PALETTE_LABELS: ResolvedCommandPaletteLabels = {
  searchPlaceholder: 'Search…',
  searchAriaLabel: 'Command palette search',
  noResults: 'No results found',
  noResultsHint: "We couldn't find anything with that term. Please try again.",
  helpHeading: 'Help with searching',
  closeAriaLabel: 'Close command palette',
  hotkeyHint: 'Mod+K',
  modePrefix: 'Mode:',
};

export const HK_COMMAND_PALETTE_LABELS = new InjectionToken<CommandPaletteLabels>('HK_COMMAND_PALETTE_LABELS');

/**
 * Register app-wide text defaults for `<hk-command-palette>`. Any field
 * omitted falls back to the English default in `DEFAULT_COMMAND_PALETTE_LABELS`.
 *
 * @example
 * providers: [
 *   provideHkCommandPaletteLabels({
 *     searchPlaceholder: 'Buscar…',
 *     noResults: 'Sin resultados',
 *     noResultsHint: 'No encontramos nada con ese término. Inténtalo de nuevo.',
 *   }),
 * ]
 */
export function provideHkCommandPaletteLabels(labels: CommandPaletteLabels): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HK_COMMAND_PALETTE_LABELS, useValue: labels }]);
}
