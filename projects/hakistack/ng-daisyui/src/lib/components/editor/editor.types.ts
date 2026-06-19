/**
 * Public types for `<hk-editor>`. See docs/plans/editor.md.
 */
import type { LucideIcon } from '@lucide/angular';

export type EditorToolbarPreset = 'full' | 'basic' | 'minimal' | 'none' | 'document';

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
  // Document-level actions — used by the document-editor shell toolbar. The
  // rich-text editor's own presets don't reference these, so it is unaffected.
  | 'save'
  | 'export'
  | 'print'
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

/**
 * Notion-style slash-command item — shown in the popup that appears when the
 * user types `/` at the start of a block. Matches the suggestion-popup
 * pattern: filterable label + description for screen readers / hover, an
 * optional icon (Lucide name string), and an `action` invoked on commit.
 *
 * The action receives the live `Editor` instance plus the document range that
 * covers the trigger text (`/heading` etc.) — the typical pattern is
 * `editor.chain().focus().deleteRange(range).<command>().run()` so the
 * trigger is removed and replaced with the inserted content.
 */
export interface EditorSlashCommand {
  /** Stable id used for tracking + as the default search target. */
  readonly id: string;
  /** Human-readable label rendered in the popup. */
  readonly label: string;
  /** Optional one-line description rendered as muted secondary text. */
  readonly description?: string;
  /** Optional Lucide icon component (e.g. `LucideHeading1`). Renders left of the label in the popup. */
  readonly icon?: LucideIcon;
  /** Extra search keywords beyond `label` — e.g. `['h1', 'title']` for Heading 1. */
  readonly keywords?: readonly string[];
  /** Optional grouping header. Items with the same group render under one heading. */
  readonly group?: string;
  /**
   * Editor command to run when the user commits this item (Enter / click).
   * Receives the live Editor and the range covering the slash-trigger text.
   * Implementations should typically call `deleteRange(range)` first so the
   * `/foo` trigger text is removed before the command's content is inserted.
   *
   * Returning a `Promise<void>` is supported — the popup closes immediately
   * on commit, and the action's async work (e.g. fetching a snippet) runs
   * in the background before the editor mutation is performed.
   */
  readonly action: (ctx: { editor: import('@tiptap/core').Editor; range: { from: number; to: number } }) => void | Promise<void>;
}

/**
 * Configuration for the slash-command popup.
 *
 * - `false` / undefined → slash commands disabled.
 * - `true` → enabled with the built-in command set (heading 1–3, bullet/ordered list, blockquote, code block, divider).
 * - `EditorSlashCommand[]` → enabled with the consumer's custom set (overrides built-ins).
 * - `{ items, append }` → mix-and-match: extend the built-ins with additional items.
 */
export type EditorSlashCommandConfig =
  | boolean
  | readonly EditorSlashCommand[]
  | { readonly items: readonly EditorSlashCommand[]; readonly append?: boolean };
