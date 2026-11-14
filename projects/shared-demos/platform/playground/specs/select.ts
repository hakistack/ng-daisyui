import { definePlayground } from '../playground.types';
import { l, COLORS, SIZES } from './shared';

// ── Select ────────────────────────────────────────────────────────────────
export interface SelectPgState {
  [k: string]: string | number | boolean;
  placeholder: string;
  enableSearch: boolean;
  multiple: boolean;
  allowClear: boolean;
  disabled: boolean;
  size: string;
  color: string;
  maxChipsVisible: number;
}
export const SELECT_OPTIONS_SOURCE = `options: SelectOption<string>[] = [
  { label: 'Angular', value: 'angular' },
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Solid', value: 'solid' },
];`;
export const SELECT_PLAYGROUND = definePlayground<SelectPgState>({
  symbol: 'SelectComponent',
  selector: 'hk-select',
  defaults: {
    placeholder: 'Select an option',
    enableSearch: false,
    multiple: false,
    allowClear: true,
    disabled: false,
    size: 'md',
    color: '',
    maxChipsVisible: 3,
  },
  inputs: ['placeholder', 'enableSearch', 'multiple', 'allowClear', 'disabled', 'size', 'color', 'maxChipsVisible'],
  events: ['selectionChange', 'searchChange', 'dropdownToggle'],
  extraTemplateAttrs: '[options]="options"',
  extraMembers: SELECT_OPTIONS_SOURCE,
  extraImports: ['SelectOption'],
  controls: [
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'enableSearch', kind: 'boolean', label: l('Search box', 'Caja de búsqueda') },
    { key: 'multiple', kind: 'boolean', label: l('Pick several', 'Elegir varios') },
    { key: 'maxChipsVisible', kind: 'number', label: l('Chips shown (multiple)', 'Chips visibles (múltiple)'), min: 1, max: 10, step: 1 },
    { key: 'allowClear', kind: 'boolean', label: l('Clear button', 'Botón para limpiar') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: SIZES },
    { key: 'color', kind: 'select', label: l('Color (empty = none)', 'Color (vacío = ninguno)'), options: COLORS },
  ],
});
