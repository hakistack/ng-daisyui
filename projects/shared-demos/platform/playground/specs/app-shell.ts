import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── App shell (ShellConfig) ───────────────────────────────────────────────
export interface AppShellPgState {
  [k: string]: string | number | boolean;
  responsiveBreakpoint: string;
  mode: string;
  collapsed: boolean;
  'navbar.shadow': boolean;
  'sidebar.collapsible': boolean;
  'sidebar.side': string;
  'sidebar.width': string;
}

/** Library defaults (AppShellComponent / NavbarComponent / SidebarComponent). */
const APP_SHELL_DEFAULTS: AppShellPgState = {
  responsiveBreakpoint: 'lg',
  mode: 'push',
  collapsed: false,
  'navbar.shadow': true,
  'sidebar.collapsible': false,
  'sidebar.side': 'start',
  'sidebar.width': '18rem',
};

const SIDEBAR_MENU_SOURCE = `menu: {
        items: [
          { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
          { label: 'Projects', routerLink: '/projects', icon: 'folder' },
          { label: 'Team', routerLink: '/team', icon: 'users' },
          { label: 'Settings', routerLink: '/settings', icon: 'settings' },
        ],
      },`;

function appShellCode(s: AppShellPgState): string {
  const d = APP_SHELL_DEFAULTS;
  const lit = (v: string | number | boolean): string => (typeof v === 'string' ? `'${v}'` : String(v));
  const top: string[] = [];
  if (s.responsiveBreakpoint !== d.responsiveBreakpoint) top.push(`    responsiveBreakpoint: ${lit(s.responsiveBreakpoint)},`);
  if (s.mode !== d.mode) top.push(`    mode: ${lit(s.mode)},`);
  if (s['navbar.shadow'] !== d['navbar.shadow']) top.push(`    navbar: { shadow: ${s['navbar.shadow']} },`);
  const sidebar: string[] = [];
  if (s['sidebar.collapsible'] !== d['sidebar.collapsible']) sidebar.push(`      collapsible: ${s['sidebar.collapsible']},`);
  if (s['sidebar.side'] !== d['sidebar.side']) sidebar.push(`      side: ${lit(s['sidebar.side'])},`);
  if (s['sidebar.width'] !== d['sidebar.width']) sidebar.push(`      width: ${lit(s['sidebar.width'])},`);
  sidebar.push(`      ${SIDEBAR_MENU_SOURCE}`);
  top.push(`    sidebar: {\n${sidebar.join('\n')}\n    },`);

  const attrs = ['[config]="shell"'];
  if (s.collapsed !== d.collapsed) attrs.push(`[collapsed]="${s.collapsed}"`);
  attrs.push('(drawerOpenChange)="onDrawerOpenChange($event)"', '(collapsedChange)="onCollapsedChange($event)"');

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShellComponent, ShellConfig } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [AppShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-app-shell
      ${attrs.join('\n      ')}
    >
      <span hk-brand class="text-lg font-bold px-2">Acme</span>
      <div class="p-6">
        <h1 class="text-xl font-semibold">Dashboard</h1>
      </div>
    </hk-app-shell>
  \`,
})
export class ExampleComponent {
  readonly shell: ShellConfig = {
${top.join('\n')}
  };

  onDrawerOpenChange(open: boolean): void {
    console.log('drawerOpenChange', open);
  }

  onCollapsedChange(collapsed: boolean): void {
    console.log('collapsedChange', collapsed);
  }
}
`;
}

export const APP_SHELL_PLAYGROUND = definePlayground<AppShellPgState>({
  layout: 'wide',
  symbol: 'AppShellComponent',
  selector: 'hk-app-shell',
  optionsSymbol: 'ShellConfig',
  defaults: APP_SHELL_DEFAULTS,
  inputs: ['collapsed'],
  events: ['drawerOpenChange', 'collapsedChange'],
  controls: [
    {
      key: 'responsiveBreakpoint',
      kind: 'select',
      label: l('Sidebar stays open from', 'Barra lateral fija desde'),
      hint: l(
        'Below this window width the sidebar becomes a drawer opened from the menu button.',
        'Por debajo de este ancho de ventana la barra lateral pasa a ser un cajón que se abre con el botón de menú.',
      ),
      options: ['sm', 'md', 'lg', 'xl'],
    },
    {
      key: 'mode',
      kind: 'select',
      label: l('Sidebar mode', 'Modo de la barra lateral'),
      hint: l('overlay = always a drawer, at every width.', 'overlay = siempre un cajón, en cualquier ancho.'),
      options: ['push', 'overlay'],
    },
    { key: 'collapsed', kind: 'boolean', label: l('Sidebar as icon rail', 'Barra lateral solo con iconos') },
    { key: 'sidebar.collapsible', kind: 'boolean', label: l('Collapse button in the sidebar', 'Botón para plegar la barra lateral') },
    { key: 'sidebar.side', kind: 'select', label: l('Sidebar side', 'Lado de la barra lateral'), options: ['start', 'end'] },
    { key: 'sidebar.width', kind: 'select', label: l('Sidebar width', 'Ancho de la barra lateral'), options: ['18rem', '14rem', '12rem'] },
    { key: 'navbar.shadow', kind: 'boolean', label: l('Navbar shadow', 'Sombra de la barra superior') },
  ],
  code: appShellCode,
});
