import { definePlayground } from '../playground.types';
import { l, serviceSnippet } from './shared';

// ── Toast (service) ───────────────────────────────────────────────────────
export interface ToastPgState {
  [k: string]: string | number | boolean;
  severity: string;
  summary: string;
  detail: string;
  life: number;
  sticky: boolean;
  soft: boolean;
  progressBar: boolean;
  pauseOnHover: boolean;
}
const TOAST_DEFAULTS: ToastPgState = {
  severity: 'success',
  summary: 'Saved',
  detail: 'Your changes are stored.',
  // Matches DEFAULT_TOAST_CONFIG (defaultLife / progressBar / pauseOnHover).
  life: 5000,
  sticky: false,
  soft: false,
  progressBar: true,
  pauseOnHover: true,
};
export const TOAST_PLAYGROUND = definePlayground<ToastPgState>({
  symbol: 'ToastService',
  optionsSymbol: 'ToastOptions',
  defaults: TOAST_DEFAULTS,
  controls: [
    { key: 'severity', kind: 'select', label: l('Kind', 'Tipo'), options: ['success', 'info', 'warning', 'error'] },
    { key: 'summary', kind: 'text', label: l('Title', 'Título') },
    { key: 'detail', kind: 'text', label: l('Message', 'Mensaje') },
    { key: 'life', kind: 'number', label: l('Visible for (ms)', 'Visible durante (ms)'), min: 500, max: 20000, step: 500 },
    { key: 'sticky', kind: 'boolean', label: l('Stay until closed', 'Permanecer hasta cerrar') },
    { key: 'soft', kind: 'boolean', label: l('Soft colors', 'Colores suaves') },
    { key: 'progressBar', kind: 'boolean', label: l('Progress bar', 'Barra de progreso') },
    { key: 'pauseOnHover', kind: 'boolean', label: l('Pause on hover', 'Pausar al pasar el mouse') },
  ],
  code: (s) => serviceSnippet('ToastService', 'toast', 'show', s, TOAST_DEFAULTS, ['severity', 'summary', 'detail']),
});
