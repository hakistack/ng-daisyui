import { computed, signal } from '@angular/core';

import { ResolvedFormat } from '../document-viewer/document-viewer.types';
import { CommandStack } from '../../utils/command-stack';
import { resolveSerializer } from './document-editor.registry';
import { BUILT_IN_SERIALIZERS } from './serializers';
import {
  DocumentEditorConfig,
  DocumentEditorController,
  DocumentEditorInternalApi,
  DocumentEditorInternalHandlers,
  ExportTarget,
} from './document-editor.types';

/**
 * Create a `DocumentEditorController` for `<hk-document-viewer mode="edit">`.
 *
 * Returns a controller with reactive state signals plus imperative
 * undo/redo/save/export/reset, following the same `createX()` shape as
 * `createPdfViewer`: writable state lives in this closure, and a hidden
 * `_internal` channel rides alongside `config()` so the mounted editor
 * component (which only sees `[editor]`) can push edits and bind handlers back.
 * Every action is a safe no-op until an editor mounts.
 *
 * @example
 * editor = createDocumentEditor({
 *   filename: 'notes.md',
 *   onSave: (bytes) => this.api.upload(bytes),
 * });
 * // template: <hk-document-viewer [src]="src()" mode="edit" [editor]="editor.config()" />
 * // anywhere: this.editor.save(); this.editor.undo();
 */
export function createDocumentEditor(input: DocumentEditorConfig = {}): DocumentEditorController {
  const stack = new CommandStack();

  // Writable state. `baseline` is the originally-loaded model (reset target);
  // `content` is the live edited model; `format` is reported by the shell once
  // the source's format is resolved.
  let baseline: unknown = null;
  const content = signal<unknown>(null);
  const format = signal<ResolvedFormat | null>(null);
  const isDirty = signal(false);

  // Handler bag filled by the component on init; no-op until then.
  let handlers: DocumentEditorInternalHandlers = {};

  const setDirty = (next: boolean): void => {
    if (isDirty() === next) return;
    isDirty.set(next);
    input.onDirtyChange?.(next);
  };

  const internal: DocumentEditorInternalApi = {
    stack,
    bind(next) {
      handlers = next;
      return () => {
        handlers = {};
      };
    },
    setInitial: (next) => {
      baseline = next;
      content.set(next);
      stack.clear();
      setDirty(false);
    },
    setContent: (next) => {
      content.set(next);
      setDirty(true);
      input.onContentChange?.(next);
    },
    markDirty: () => setDirty(true),
    setFormat: (next) => format.set(next),
  };

  const config = computed<DocumentEditorConfig>(() => ({
    editors: input.editors,
    serializers: input.serializers,
    mimeType: input.mimeType,
    filename: input.filename,
    onContentChange: input.onContentChange,
    onDirtyChange: input.onDirtyChange,
    onSave: input.onSave,
    _internal: internal,
  }));

  const serialize = async (): Promise<Uint8Array> => {
    const fmt = format();
    if (!fmt) throw new Error('Document editor: no source loaded yet — nothing to save.');
    const serializer = resolveSerializer(fmt.format, input.serializers, BUILT_IN_SERIALIZERS);
    if (!serializer) throw new Error(`Document editor: no serializer registered for format "${fmt.format}".`);
    return serializer(content(), fmt);
  };

  const controller: DocumentEditorController = {
    content: content.asReadonly(),
    format: format.asReadonly(),
    isDirty: isDirty.asReadonly(),
    canUndo: stack.canUndo,
    canRedo: stack.canRedo,

    undo: () => stack.undo(),
    redo: () => stack.redo(),

    save: async () => {
      const bytes = await serialize();
      setDirty(false);
      input.onSave?.(bytes);
      return bytes;
    },

    exportAs: async (target: ExportTarget) => {
      if (target === 'original') {
        const bytes = await serialize();
        const mime = format()?.mimeType ?? 'application/octet-stream';
        // Copy into a fresh ArrayBuffer so the Blob never aliases a WASM heap view.
        return new Blob([bytes.slice()], { type: mime });
      }
      // PDF export is wired in Phases 3–4; the dispatch seam exists now.
      throw new Error(`Document editor: export target "${target}" is not supported yet.`);
    },

    reset: () => {
      stack.clear();
      content.set(baseline);
      setDirty(false);
      handlers.reset?.(baseline);
    },

    config,
  };

  return controller;
}
