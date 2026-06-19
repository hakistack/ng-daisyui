import { loadSourceAsBytes } from '../../document-viewer/document-viewer.helpers';
import { decodeTextWithFallback } from '../../document-viewer/renderers/text.renderer';
import { DocumentEditorInputs } from '../document-editor.types';

/**
 * Load any document source as decoded text. Composes the viewer's
 * `loadSourceAsBytes` (URL fetch / Blob unwrap / pass-through) with
 * `decodeTextWithFallback` (UTF-8, Latin-1 fallback). Shared by every
 * text-family editor (plain / markdown / csv) so the decode policy lives in
 * one place.
 */
export function loadTextSource(src: DocumentEditorInputs['source']): Promise<string> {
  return loadSourceAsBytes(src).then(decodeTextWithFallback);
}
