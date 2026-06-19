import { DocumentSerialize } from '../document-editor.types';

/**
 * Serialize the text editor's model (a plain string) back to UTF-8 bytes.
 * The trivial round-trip — and the reference implementation every other
 * serializer follows: `(model, format) => bytes`.
 */
export const serializeText: DocumentSerialize = (content) => {
  const text = typeof content === 'string' ? content : String(content ?? '');
  return new TextEncoder().encode(text);
};
