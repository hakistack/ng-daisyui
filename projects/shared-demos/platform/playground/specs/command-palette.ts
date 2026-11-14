import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Command palette (createCommandPalette config) ─────────────────────────
export interface CommandPalettePgState {
  [k: string]: string | number | boolean;
  filter: string;
  hotkey: string;
  closeOnSelect: boolean;
  emptyMessage: string;
  groups: boolean;
  modes: boolean;
}

/**
 * Library defaults, except `hotkey`: the docs site already owns Mod+K (its own
 * search palette), so the playground starts with the hotkey off and opens from
 * a button. The option `'false'` stands for `hotkey: false`.
 */
const PALETTE_DEFAULTS: CommandPalettePgState = {
  filter: 'fuzzy',
  hotkey: 'false',
  closeOnSelect: true,
  emptyMessage: '',
  groups: false,
  modes: false,
};
/** What the library uses when `hotkey` is omitted. */
const LIBRARY_HOTKEY = 'Mod+K';

/** Sample entries — shared by the live preview and the generated code. */
export const PALETTE_ITEMS: readonly { id: string; label: string; description: string; group: 'pages' | 'actions' }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Go to the overview', group: 'pages' },
  { id: 'projects', label: 'Projects', description: 'Browse every project', group: 'pages' },
  { id: 'settings', label: 'Settings', description: 'Workspace preferences', group: 'pages' },
  { id: 'new-project', label: 'New project', description: 'Start from scratch', group: 'actions' },
  { id: 'invite', label: 'Invite teammate', description: 'Send an email invite', group: 'actions' },
  { id: 'sign-out', label: 'Sign out', description: 'End your session', group: 'actions' },
];
export const PALETTE_GROUPS = [
  { id: 'pages', label: 'Pages' },
  { id: 'actions', label: 'Actions' },
] as const;
export const PALETTE_HELP_TEXT = 'Type to search pages and actions.';

/** Single-quoted TS string literal. */
const str = (v: string): string => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function paletteCode(s: CommandPalettePgState): string {
  const items = PALETTE_ITEMS.map((it) => {
    const group = s.groups ? `, group: '${it.group}'` : '';
    return `      { id: '${it.id}', label: '${it.label}', description: '${it.description}'${group} },`;
  });
  const opts: string[] = [`    items: [\n${items.join('\n')}\n    ],`];
  if (s.groups) {
    opts.push(`    groups: [\n${PALETTE_GROUPS.map((g) => `      { id: '${g.id}', label: '${g.label}' },`).join('\n')}\n    ],`);
  }
  if (s.modes) {
    const modes = [`      { prefix: '?', layout: 'help', indicatorLabel: 'Help', helpText: ${str(PALETTE_HELP_TEXT)} },`];
    if (s.groups) modes.push(`      { prefix: '>', filterGroups: ['actions'], indicatorLabel: 'Actions' },`);
    opts.push(`    modes: [\n${modes.join('\n')}\n    ],`);
  }
  if (s.filter !== PALETTE_DEFAULTS.filter) opts.push(`    filter: '${s.filter}',`);
  if (s.hotkey !== LIBRARY_HOTKEY) opts.push(`    hotkey: ${s.hotkey === 'false' ? 'false' : str(s.hotkey)},`);
  if (s.closeOnSelect !== PALETTE_DEFAULTS.closeOnSelect) opts.push(`    closeOnSelect: ${s.closeOnSelect},`);
  if (s.emptyMessage) opts.push(`    emptyMessage: ${str(s.emptyMessage)},`);
  opts.push(`    onSelect: (item) => console.log('onSelect', item.label),`);

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommandPaletteComponent, createCommandPalette } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button type="button" class="btn btn-primary" (click)="palette.open()">Open palette</button>
    <hk-command-palette [config]="palette.config()" />
  \`,
})
export class ExampleComponent {
  readonly palette = createCommandPalette({
${opts.join('\n')}
  });
}
`;
}

export const COMMAND_PALETTE_PLAYGROUND = definePlayground<CommandPalettePgState>({
  symbol: 'createCommandPalette',
  optionsSymbol: 'CommandPaletteConfig',
  defaults: PALETTE_DEFAULTS,
  controls: [
    {
      key: 'filter',
      kind: 'select',
      label: l('Matching', 'Coincidencia'),
      hint: l('fuzzy tolerates typos; substring needs the exact text.', 'fuzzy tolera errores; substring exige el texto exacto.'),
      options: ['fuzzy', 'substring'],
    },
    {
      key: 'hotkey',
      kind: 'select',
      label: l('Keyboard shortcut (false = none)', 'Atajo de teclado (false = ninguno)'),
      hint: l(
        'Mod+K is left out here because this docs site already uses it for search.',
        'Mod+K no aparece aquí porque esta documentación ya lo usa para buscar.',
      ),
      options: ['false', 'Mod+/', 'Shift+Mod+P', '/'],
    },
    { key: 'closeOnSelect', kind: 'boolean', label: l('Close after choosing', 'Cerrar al elegir') },
    { key: 'emptyMessage', kind: 'text', label: l('No-results message', 'Mensaje sin resultados') },
    { key: 'groups', kind: 'boolean', label: l('Group results', 'Agrupar resultados') },
    {
      key: 'modes',
      kind: 'boolean',
      label: l('Prefix modes (? and >)', 'Modos con prefijo (? y >)'),
      hint: l('? shows help; > (with groups) searches only actions.', '? muestra la ayuda; > (con grupos) busca solo acciones.'),
    },
  ],
  code: paletteCode,
});
