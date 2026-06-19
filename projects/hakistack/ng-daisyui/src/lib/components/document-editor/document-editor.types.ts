import { Signal, Type } from '@angular/core';

import { DocumentFormat, DocumentRendererInputs, ResolvedFormat } from '../document-viewer/document-viewer.types';
import { CommandStack } from '../../utils/command-stack';

/** Whether the facade renders read-only or editable. */
export type DocumentEditorMode = 'view' | 'edit';

/** Target of an export. `'original'` round-trips to the source format; `'pdf'` lands in a later phase. */
export type ExportTarget = 'original' | 'pdf';

/**
 * Bridge handed to an editor component instance. The editor reports edits back
 * through this object instead of reaching into the controller directly — this
 * keeps editors decoupled from the controller's internals and mirrors how the
 * read-only renderers stay decoupled from the facade.
 *
 *  - `setInitial` seeds the freshly-loaded model as the clean baseline; it does
 *    NOT mark dirty and becomes the target of `reset()`. Call once per load.
 *  - `setContent` records a user edit — replaces the model and marks dirty.
 *  - `markDirty` flags unsaved changes for in-place mutations that don't swap
 *    the whole model.
 *  - `stack` is the shared undo/redo history — editors push `EditorCommand`s
 *    so the shell's single Undo/Redo pair drives every format.
 */
export interface DocumentEditorBridge {
  setInitial(content: unknown): void;
  setContent(content: unknown): void;
  markDirty(): void;
  /**
   * Register a listener invoked when the controller resets to baseline, so the
   * editor can re-seed its local view. Returns an unbind function for teardown.
   */
  onReset(listener: (content: unknown) => void): () => void;
  readonly stack: CommandStack;
}

/**
 * Inputs given to an editor component instance. Extends the read-only renderer
 * contract with the editing bridge, so an editor is "a renderer that can also
 * write back". Editors read these via `input.required(...)`, exactly like
 * renderers do.
 */
export interface DocumentEditorInputs extends DocumentRendererInputs {
  readonly bridge: DocumentEditorBridge;
}

/**
 * Turns the current editable model into bytes in the **original** format — the
 * heart of the round-trip. Registered per format alongside the editor. May be
 * async (WASM writers, lazy libs).
 */
export type DocumentSerialize = (content: unknown, format: ResolvedFormat) => Uint8Array | Promise<Uint8Array>;

/**
 * Registry entry pairing formats to an editor component. Matched in
 * declaration order, user entries before built-ins — same rules as
 * `DocumentRendererRegistration`.
 */
export interface DocumentEditorRegistration {
  readonly formats: readonly DocumentFormat[];
  readonly component: Type<unknown>;
}

/** Registry entry pairing formats to a serializer function. */
export interface DocumentSerializerRegistration {
  readonly formats: readonly DocumentFormat[];
  readonly serialize: DocumentSerialize;
}

/**
 * Handler bag the mounted editor component registers back to the controller
 * via `_internal.bind()`. Until an editor mounts, every controller action is a
 * safe no-op — same late-binding pattern as `PdfViewerInternalHandlers`.
 */
export interface DocumentEditorInternalHandlers {
  /** Re-seed the editor's local view to the given (baseline) model on reset. */
  reset?: (content: unknown) => void;
}

/** Hidden channel the controller threads through `config` so the component can bind back. */
export interface DocumentEditorInternalApi {
  readonly stack: CommandStack;
  /** Component calls this on init; returns an unbind function for teardown. */
  bind(handlers: DocumentEditorInternalHandlers): () => void;
  /** Seed the clean baseline (no dirty). */
  readonly setInitial: (content: unknown) => void;
  /** Record a user edit (marks dirty). */
  readonly setContent: (content: unknown) => void;
  readonly markDirty: () => void;
  /** Shell reports the resolved format so the controller can pick a serializer. */
  readonly setFormat: (format: ResolvedFormat) => void;
}

/**
 * Public configuration for `createDocumentEditor`. Stable per-instance options
 * live here; the volatile document source stays on the component's `[src]`
 * input (same split as `createPdfViewer`).
 */
export interface DocumentEditorConfig {
  /** Editor components per format. User entries searched before built-ins. */
  readonly editors?: readonly DocumentEditorRegistration[];
  /** Serializers per format. User entries searched before built-ins. */
  readonly serializers?: readonly DocumentSerializerRegistration[];

  /** Optional MIME-type hint, forwarded to format detection. */
  readonly mimeType?: string;
  /** Optional filename hint + the name used for downloads. */
  readonly filename?: string;

  /** Fires whenever the editable model changes. */
  readonly onContentChange?: (content: unknown) => void;
  /** Fires when the dirty flag flips. */
  readonly onDirtyChange?: (dirty: boolean) => void;
  /** Fires after a successful `save()`, with the serialized bytes. */
  readonly onSave?: (bytes: Uint8Array) => void;

  /** @internal — controller↔component channel. Never set by consumers. */
  readonly _internal?: DocumentEditorInternalApi;
}

/**
 * Controller returned by `createDocumentEditor`. Pass `config()` to the
 * facade's `[editor]` input; call the imperative methods from anywhere in the
 * host component. Contract per roadmap §2.1.
 */
export interface DocumentEditorController {
  /** Reactive state (signals). */
  readonly content: Signal<unknown>;
  readonly format: Signal<ResolvedFormat | null>;
  readonly isDirty: Signal<boolean>;
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;

  /** Actions. */
  undo(): void;
  redo(): void;
  /** Serialize the current model to bytes in the **original** format. */
  save(): Promise<Uint8Array>;
  /** Produce a downloadable Blob in the requested target format. */
  exportAs(target: ExportTarget): Promise<Blob>;
  /** Revert to the originally-loaded document and clear history. */
  reset(): void;

  /** Template wiring — bind to the facade's `[editor]` input. */
  readonly config: Signal<DocumentEditorConfig>;
}
