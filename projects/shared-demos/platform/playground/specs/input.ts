import { definePlayground } from '../playground.types';
import { l, COLORS, SIZES } from './shared';

// ── Input ─────────────────────────────────────────────────────────────────
export interface InputPgState {
  [k: string]: string | number | boolean;
  variant: string;
  size: string;
  color: string;
  placeholder: string;
  disabled: boolean;
  readonly: boolean;
  prefixText: string;
  suffixText: string;
}
export const INPUT_PLAYGROUND = definePlayground<InputPgState>({
  symbol: 'InputComponent',
  selector: 'hk-input',
  defaults: { variant: 'text', size: 'md', color: '', placeholder: '', disabled: false, readonly: false, prefixText: '', suffixText: '' },
  inputs: ['variant', 'size', 'color', 'placeholder', 'disabled', 'readonly', 'prefixText', 'suffixText'],
  events: ['valueChange'],
  controls: [
    {
      key: 'variant',
      kind: 'select',
      label: l('Formatting behavior', 'Comportamiento de formato'),
      options: ['text', 'currency', 'phone', 'percentage', 'password'],
    },
    { key: 'size', kind: 'select', label: l('Size', 'Tamaño'), options: SIZES },
    { key: 'color', kind: 'select', label: l('Color (empty = none)', 'Color (vacío = ninguno)'), options: COLORS },
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'prefixText', kind: 'text', label: l('Text before', 'Texto antes') },
    { key: 'suffixText', kind: 'text', label: l('Text after', 'Texto después') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
    { key: 'readonly', kind: 'boolean', label: l('Read-only', 'Solo lectura') },
  ],
});
