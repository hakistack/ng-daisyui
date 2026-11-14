import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Rich text editor ──────────────────────────────────────────────────────
export interface EditorPgState {
  [k: string]: string | number | boolean;
  toolbar: string;
  placeholder: string;
  editorHeight: string;
  slashCommands: boolean;
  readonly: boolean;
  disabled: boolean;
}
export const EDITOR_PLAYGROUND = definePlayground<EditorPgState>({
  layout: 'wide',
  symbol: 'EditorComponent',
  selector: 'hk-editor',
  defaults: {
    toolbar: 'basic',
    placeholder: 'Write something…',
    editorHeight: '200px',
    slashCommands: false,
    readonly: false,
    disabled: false,
  },
  inputs: ['toolbar', 'placeholder', 'editorHeight', 'slashCommands', 'readonly', 'disabled'],
  events: ['textChange', 'editorFocus', 'editorBlur', 'editorReady'],
  controls: [
    {
      key: 'toolbar',
      kind: 'select',
      label: l('Toolbar preset', 'Barra de herramientas'),
      options: ['basic', 'full', 'minimal', 'document', 'none'],
    },
    { key: 'placeholder', kind: 'text', label: l('Placeholder', 'Placeholder') },
    { key: 'editorHeight', kind: 'text', label: l('Minimum height (CSS)', 'Altura mínima (CSS)') },
    { key: 'slashCommands', kind: 'boolean', label: l('Slash commands (type /)', 'Comandos con barra (escribe /)') },
    { key: 'readonly', kind: 'boolean', label: l('Read-only', 'Solo lectura') },
    { key: 'disabled', kind: 'boolean', label: l('Disabled', 'Deshabilitado') },
  ],
});
