import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Breadcrumbs ───────────────────────────────────────────────────────────
export interface BreadcrumbsPgState {
  [k: string]: string | number | boolean;
  size: string;
  maxWidth: string;
  auto: boolean;
  ariaLabel: string;
}

/** Generated code uses router links; the live preview swaps them for `action` so clicks stay on the docs page. */
export const BREADCRUMBS_ITEMS_SOURCE = `items: BreadcrumbItem[] = [
  { label: 'Home', routerLink: '/', icon: 'house' },
  { label: 'Projects', routerLink: '/projects', icon: 'folder' },
  { label: 'Website redesign', routerLink: '/projects/website' },
  { label: 'Assets', routerLink: '/projects/website/assets' },
  { label: 'logo.svg', icon: 'file-text' },
];`;

export const BREADCRUMBS_PLAYGROUND = definePlayground<BreadcrumbsPgState>({
  symbol: 'BreadcrumbsComponent',
  selector: 'hk-breadcrumbs',
  defaults: {
    size: 'sm',
    maxWidth: '',
    auto: false,
    ariaLabel: 'Breadcrumb',
  },
  inputs: ['size', 'maxWidth', 'auto', 'ariaLabel'],
  events: ['itemSelect'],
  extraTemplateAttrs: '[items]="items"',
  extraMembers: BREADCRUMBS_ITEMS_SOURCE,
  extraImports: ['BreadcrumbItem'],
  controls: [
    { key: 'size', kind: 'select', label: l('Text size', 'Tamaño del texto'), options: ['xs', 'sm', 'md', 'lg'] },
    {
      key: 'maxWidth',
      kind: 'select',
      label: l('Max width (empty = none)', 'Ancho máximo (vacío = sin límite)'),
      hint: l('A long trail scrolls sideways inside this width.', 'Un recorrido largo se desplaza en horizontal dentro de este ancho.'),
      options: ['', '10rem', '16rem', '24rem'],
    },
    {
      key: 'auto',
      kind: 'boolean',
      label: l('Build from the router', 'Construir desde el router'),
      hint: l(
        'Ignores items and reads data.breadcrumb from the current routes (this docs page).',
        'Ignora items y lee data.breadcrumb de las rutas actuales (esta página de la documentación).',
      ),
    },
    { key: 'ariaLabel', kind: 'text', label: l('Accessible name', 'Nombre accesible') },
  ],
});
