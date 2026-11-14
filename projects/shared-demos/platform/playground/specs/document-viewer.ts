import { definePlayground } from '../playground.types';
import { l } from './shared';

// ── Document viewer ───────────────────────────────────────────────────────
export interface DocumentViewerPgState {
  [k: string]: string | number | boolean;
  src: string;
  filename: string;
  mimeType: string;
  mode: string;
}

/**
 * Reproducible samples. Paths starting with `/samples/` are served by the docs
 * app (`public/samples/`); the others are built in memory as a `File`, the
 * same thing an `<input type="file">` hands you.
 */
export const DOCUMENT_VIEWER_SAMPLES: Readonly<Record<string, { readonly type: string; readonly content: string }>> = {
  'notes.md': {
    type: 'text/markdown',
    content: ['# Meeting notes', '', '- Ship the **beta** on Friday', '- Review the *pricing* page', '', '> Owner: Ada'].join('\n'),
  },
  'customers.csv': {
    type: 'text/csv',
    content: ['name,role,city', 'Ada,Engineer,London', 'Grace,Admiral,New York', 'Linus,Maintainer,Helsinki'].join('\n'),
  },
  'readme.txt': {
    type: 'text/plain',
    content: ['Hello from hk-document-viewer.', 'Plain text keeps its line breaks.'].join('\n'),
  },
  'logo.svg': {
    type: 'image/svg+xml',
    content:
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" rx="20" fill="#1f2937"/><circle cx="110" cy="100" r="50" fill="#f97316"/><text x="180" y="116" font-family="sans-serif" font-size="44" font-weight="700" fill="#f9fafb">hk</text></svg>',
  },
};
export const DOCUMENT_VIEWER_PDF_SAMPLE = '/samples/invoice-0042.pdf';

const DOCUMENT_VIEWER_DEFAULTS: DocumentViewerPgState = {
  src: 'notes.md',
  filename: '',
  mimeType: '',
  // Component default.
  mode: 'view',
};

const str = (v: string): string => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

function documentViewerCode(s: DocumentViewerPgState): string {
  const sample = DOCUMENT_VIEWER_SAMPLES[s.src];
  const src = sample ? `new File([${str(sample.content)}], '${s.src}', { type: '${sample.type}' })` : `'${s.src}'`;
  const config: string[] = [];
  if (s.filename) config.push(`    filename: ${str(s.filename)},`);
  if (s.mimeType) config.push(`    mimeType: '${s.mimeType}',`);
  const edit = s.mode === 'edit';
  const attrs = ['[src]="src"', ...(config.length ? ['[config]="config"'] : []), ...(edit ? ['mode="edit"', '[editor]="editor"'] : [])];
  const imports = [
    'DocumentSource',
    'DocumentViewerComponent',
    ...(config.length ? ['DocumentViewerConfig'] : []),
    ...(edit ? ['createDocumentEditor'] : []),
  ];
  const members = [
    `  /** A URL, Uint8Array, Blob or File (e.g. from <input type="file">). */\n  readonly src: DocumentSource = ${src};`,
    ...(config.length
      ? [
          `  /** Hints for format detection: they win over the URL extension and the Blob type. */\n  readonly config: DocumentViewerConfig = {\n${config.join('\n')}\n  };`,
        ]
      : []),
    ...(edit
      ? [
          `  /** Edit mode needs an editor controller. The file extension picks the editor (.md, .csv or plain text). */\n  readonly editor = createDocumentEditor({\n    onDirtyChange: (dirty) => console.log('dirty', dirty),\n    onSave: (bytes) => console.log('saved', bytes.byteLength, 'bytes'),\n  });`,
        ]
      : []),
  ];

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ${imports.join(', ')} } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <!-- Renderers such as PDF fill their parent: give it a bounded height. -->
    <div class="h-[28rem] overflow-auto">
      <hk-document-viewer class="h-full" ${attrs.join(' ')} />
    </div>
  \`,
})
export class ExampleComponent {
${members.join('\n\n')}
}
`;
}

export const DOCUMENT_VIEWER_PLAYGROUND = definePlayground<DocumentViewerPgState>({
  layout: 'wide',
  symbol: 'DocumentViewerComponent',
  optionsSymbol: 'DocumentViewerConfig',
  defaults: DOCUMENT_VIEWER_DEFAULTS,
  // `src` and `mode` are inputs; `filename` and `mimeType` are DocumentViewerConfig members.
  inputs: ['src', 'mode'],
  controls: [
    {
      key: 'src',
      kind: 'select',
      label: l('Sample file', 'Archivo de ejemplo'),
      hint: l(
        'PDFs load from the docs app; the others are in-memory Files.',
        'Los PDF se cargan desde la app de docs; los demás son File en memoria.',
      ),
      options: [...Object.keys(DOCUMENT_VIEWER_SAMPLES), DOCUMENT_VIEWER_PDF_SAMPLE],
    },
    {
      key: 'filename',
      kind: 'text',
      label: l('Filename hint (e.g. notes.md)', 'Nombre de archivo (p. ej. notes.md)'),
      hint: l(
        'Its extension drives detection, and in edit mode picks the editor (.md preview, .csv table).',
        'Su extensión guía la detección y, en modo edición, elige el editor (.md con vista previa, .csv en tabla).',
      ),
    },
    {
      key: 'mimeType',
      kind: 'select',
      label: l('MIME type hint (empty = detect)', 'Tipo MIME (vacío = detectar)'),
      options: ['', 'text/plain', 'text/markdown', 'text/csv', 'image/svg+xml', 'application/pdf'],
    },
    { key: 'mode', kind: 'select', label: l('Mode', 'Modo'), options: ['view', 'edit'] },
  ],
  code: documentViewerCode,
});
