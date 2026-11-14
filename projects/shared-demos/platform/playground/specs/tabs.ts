import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Tabs ──────────────────────────────────────────────────────────────────
export interface TabsPgState {
  [k: string]: string | number | boolean;
  variant: string;
  orientation: string;
  selectionMode: string;
  wrap: boolean;
  activeIndex: number;
}

const TABS_DEFAULTS: TabsPgState = {
  variant: 'lift',
  orientation: 'horizontal',
  selectionMode: 'explicit',
  wrap: true,
  activeIndex: 0,
};
const TABS_INPUTS = ['variant', 'orientation', 'selectionMode', 'wrap', 'activeIndex'] as const;

/** Sample panels — shared by the live preview and the generated code. */
export const TABS_PANELS: readonly { value: string; label: string; text: string }[] = [
  { value: 'overview', label: 'Overview', text: 'What the product does, in two sentences.' },
  { value: 'features', label: 'Features', text: 'Everything included in every plan.' },
  { value: 'pricing', label: 'Pricing', text: 'Simple monthly pricing, cancel anytime.' },
];

function tabsCode(s: TabsPgState): string {
  const attrs = TABS_INPUTS.filter((k) => s[k] !== TABS_DEFAULTS[k]).map((k) =>
    typeof s[k] === 'string' ? `${k}="${s[k]}"` : `[${k}]="${s[k]}"`,
  );
  attrs.push('(selectedTabChange)="onSelectedTabChange($event)"');
  const panels = TABS_PANELS.map(
    (p) => `      <hk-tab-panel value="${p.value}" label="${p.label}">
        <ng-template><p>${p.text}</p></ng-template>
      </hk-tab-panel>`,
  ).join('\n');
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [TabGroupComponent, TabPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-tab-group
      ${attrs.join('\n      ')}
    >
${panels}
    </hk-tab-group>
  \`,
})
export class ExampleComponent {
  onSelectedTabChange(value: string | undefined): void {
    console.log('selectedTabChange', value);
  }
}
`;
}

export const TABS_PLAYGROUND = definePlayground<TabsPgState>({
  symbol: 'TabGroupComponent',
  selector: 'hk-tab-group',
  defaults: TABS_DEFAULTS,
  inputs: [...TABS_INPUTS],
  events: ['selectedTabChange'],
  controls: [
    {
      key: 'variant',
      kind: 'select',
      label: l('Style (horizontal)', 'Estilo (horizontal)'),
      options: ['lift', 'box', 'border'],
    },
    { key: 'orientation', kind: 'select', label: l('Orientation', 'Orientación'), options: ['horizontal', 'vertical'] },
    {
      key: 'selectionMode',
      kind: 'select',
      label: l('When arrow keys select', 'Cuándo seleccionan las flechas'),
      hint: l(
        'follow = select on focus; explicit = press Enter or Space.',
        'follow = selecciona al enfocar; explicit = pulsa Enter o Espacio.',
      ),
      options: ['explicit', 'follow'],
    },
    { key: 'wrap', kind: 'boolean', label: l('Arrow keys wrap around', 'Las flechas dan la vuelta') },
    {
      key: 'activeIndex',
      kind: 'number',
      label: l('Initially open tab (index)', 'Pestaña abierta al inicio (índice)'),
      min: 0,
      max: 2,
      step: 1,
    },
  ],
  code: tabsCode,
});
