import { DocumentEditorRegistration } from '../document-editor.types';
import { DocumentTextEditor } from './text.editor';

export { DocumentTextEditor } from './text.editor';
export { DocumentPlainTextEditor } from './plain-text.editor';
export { DocumentMarkdownEditor } from './markdown.editor';
export { DocumentCsvEditor } from './csv.editor';
export { loadTextSource } from './text-source.helper';
export { renderMarkdown, escapeHtml, sanitizeMarkdownHtml } from './markdown.helpers';
export { parseCsv, serializeCsv, type ParsedCsv } from './csv.helpers';

/**
 * Library editors, searched after any user-registered ones. The single `text`
 * entry is a dispatcher that routes `.txt`/`.md`/`.csv`/… by extension.
 */
export const BUILT_IN_EDITORS: readonly DocumentEditorRegistration[] = [{ formats: ['text'], component: DocumentTextEditor }];
