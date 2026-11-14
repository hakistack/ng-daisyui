import { definePlayground } from '../playground.types';
import { l, SIZES } from './shared';

// ── Menu (createMenu config) ──────────────────────────────────────────────
export interface MenuPgState {
  [k: string]: string | number | boolean;
  orientation: string;
  size: string;
  collapsed: boolean;
  accordion: boolean;
  rounded: boolean;
  background: boolean;
}

/** Library defaults (MenuConfig). `accordion` defaults to true only for horizontal menus. */
const MENU_DEFAULTS: MenuPgState = {
  orientation: 'vertical',
  size: 'md',
  collapsed: false,
  accordion: false,
  rounded: true,
  background: true,
};

/** Effective library default of `accordion` for an orientation. */
export const menuAccordionDefault = (orientation: string): boolean => orientation === 'horizontal';

/** Generated code uses router links; the live preview uses plain items so clicks stay on the docs page. */
const MENU_ITEMS_SOURCE = `items: [
      { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
      { label: 'Projects', routerLink: '/projects', icon: 'folder', badge: 3 },
      {
        label: 'Team',
        icon: 'users',
        children: [
          { label: 'Members', routerLink: '/team/members' },
          { label: 'Roles', routerLink: '/team/roles' },
        ],
      },
      {
        label: 'Settings',
        icon: 'settings',
        children: [
          { label: 'Profile', routerLink: '/settings/profile' },
          { label: 'Billing', routerLink: '/settings/billing' },
        ],
      },
    ],`;

function menuCode(s: MenuPgState): string {
  const opts: string[] = [];
  if (s.orientation !== MENU_DEFAULTS.orientation) opts.push(`orientation: '${s.orientation}',`);
  if (s.size !== MENU_DEFAULTS.size) opts.push(`size: '${s.size}',`);
  if (s.collapsed !== MENU_DEFAULTS.collapsed) opts.push(`collapsed: ${s.collapsed},`);
  if (s.accordion !== menuAccordionDefault(s.orientation)) opts.push(`accordion: ${s.accordion},`);
  if (s.rounded !== MENU_DEFAULTS.rounded) opts.push(`rounded: ${s.rounded},`);
  if (s.background !== MENU_DEFAULTS.background) opts.push(`background: ${s.background},`);
  const config = [...opts.map((o) => `    ${o}`), `    ${MENU_ITEMS_SOURCE}`].join('\n');
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuComponent, MenuExpandEvent, MenuItem, createMenu } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-menu [config]="menu.config()" (itemSelect)="onItemSelect($event)" (expandedChange)="onExpandedChange($event)" />
  \`,
})
export class ExampleComponent {
  readonly menu = createMenu({
${config}
  });

  onItemSelect(item: MenuItem): void {
    console.log('itemSelect', item.label);
  }

  onExpandedChange(event: MenuExpandEvent): void {
    console.log('expandedChange', event);
  }
}
`;
}

export const MENU_PLAYGROUND = definePlayground<MenuPgState>({
  symbol: 'MenuComponent',
  optionsSymbol: 'MenuConfig',
  defaults: MENU_DEFAULTS,
  events: ['itemSelect', 'expandedChange'],
  controls: [
    { key: 'orientation', kind: 'select', label: l('Orientation', 'Orientación'), options: ['vertical', 'horizontal'] },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: SIZES },
    {
      key: 'collapsed',
      kind: 'boolean',
      label: l('Icon-only rail (vertical)', 'Solo iconos (vertical)'),
      hint: l('Labels move to tooltips; groups open as flyouts.', 'Las etiquetas pasan a tooltips y los grupos se abren como flyouts.'),
    },
    {
      key: 'accordion',
      kind: 'boolean',
      label: l('One group open at a time', 'Un grupo abierto a la vez'),
      hint: l('Library default: on for horizontal, off for vertical.', 'Por defecto: activo en horizontal, inactivo en vertical.'),
    },
    { key: 'rounded', kind: 'boolean', label: l('Rounded corners', 'Esquinas redondeadas') },
    { key: 'background', kind: 'boolean', label: l('Background surface', 'Fondo') },
  ],
  code: menuCode,
});
