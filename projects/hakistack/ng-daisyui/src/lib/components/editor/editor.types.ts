/**
 * Public types for `<hk-editor>`. See docs/plans/editor.md.
 */

export type EditorToolbarPreset = 'full' | 'basic' | 'minimal' | 'none';

export type EditorToolbarItem =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'link'
  | 'image'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'undo'
  | 'redo'
  | 'divider';

/**
 * Callback the editor invokes when the consumer wants to insert an image via
 * file picker. Return the URL the image should be inserted at. Library
 * doesn't ship a storage backend — consumer chooses (S3, Cloudinary, etc.).
 */
export type EditorImageUploader = (file: File) => Promise<string>;

export type EditorToolbarConfig = EditorToolbarPreset | readonly EditorToolbarItem[];

export interface EditorTextChangeEvent {
  readonly html: string;
  readonly text: string;
}
