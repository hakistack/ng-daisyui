import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

import { ResolvedFormat } from '../document-viewer/document-viewer.types';
import { EditorToolbarComponent } from '../editor/editor-toolbar.component';
import type { EditorToolbarItem } from '../editor/editor.types';
import { resolveEditor } from './document-editor.registry';
import { BUILT_IN_EDITORS } from './editors';
import { DocumentEditorBridge, DocumentEditorController, DocumentEditorInputs } from './document-editor.types';

/**
 * Reusable chrome around an editor: the shared `hk-editor-toolbar` (document
 * preset — undo/redo/save/export), a status bar (dirty dot + format), a
 * back-to-view toggle, and the editor surface itself (resolved from the editor
 * registry and hosted via `ngComponentOutlet`).
 *
 * The shell is the only place that knows both the controller and the editor
 * component. It builds the `DocumentEditorBridge` from the controller's hidden
 * `_internal` channel and hands it to the editor, so editors never touch the
 * controller directly. Toolbar commands map straight onto controller actions.
 */
@Component({
  selector: 'hk-document-editor-shell',
  imports: [NgComponentOutlet, EditorToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-base-300 flex items-center justify-between border-b">
      <hk-editor-toolbar config="document" [canRun]="toolbarCanRun" (toolbarCommand)="onCommand($event)" />
      <button type="button" class="btn btn-ghost btn-sm mr-2" (click)="requestView.emit()" aria-label="Switch to read-only view">
        Done
      </button>
    </div>

    @if (editorComponent(); as cmp) {
      <div class="p-3">
        <ng-container *ngComponentOutlet="cmp; inputs: editorInputs()" />
      </div>
    } @else {
      <div class="alert alert-warning m-3">No editor registered for format “{{ format().format }}”.</div>
    }

    <div class="border-base-300 text-base-content/70 flex items-center gap-3 border-t px-3 py-1.5 text-xs" role="status" aria-live="polite">
      <span class="flex items-center gap-1.5">
        <span
          class="inline-block h-2 w-2 rounded-full"
          [class]="controller().isDirty() ? 'bg-warning' : 'bg-success'"
          aria-hidden="true"
        ></span>
        {{ controller().isDirty() ? 'Unsaved changes' : 'Saved' }}
      </span>
      <span class="text-base-content/40">·</span>
      <span class="uppercase">{{ format().format }}</span>
      @if (saveError(); as e) {
        <span class="text-base-content/40">·</span>
        <span class="text-error">{{ e }}</span>
      }
    </div>
  `,
  host: { class: 'border-base-300 bg-base-100 block w-full overflow-hidden rounded-lg border' },
})
export class DocumentEditorShellComponent {
  readonly controller = input.required<DocumentEditorController>();
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<ResolvedFormat>();
  readonly filename = input.required<string | null>();

  /** Emitted when the user toggles back to the read-only view. */
  readonly requestView = output<void>();

  readonly saveError = signal<string | null>(null);

  /** The editor component for the current format, resolved from the registry. */
  readonly editorComponent = computed(() => {
    const editors = this.controller().config().editors;
    return resolveEditor(this.format().format, editors, BUILT_IN_EDITORS);
  });

  /** Bridge built from the controller's `_internal` channel; stable per controller. */
  private readonly bridge = computed<DocumentEditorBridge>(() => {
    const api = this.controller().config()._internal;
    if (!api) throw new Error('DocumentEditorShell: controller has no internal channel.');
    return {
      setInitial: api.setInitial,
      setContent: api.setContent,
      markDirty: api.markDirty,
      onReset: (listener) => api.bind({ reset: listener }),
      stack: api.stack,
    };
  });

  /** Inputs map for the hosted editor component. */
  readonly editorInputs = computed(() => ({
    source: this.source(),
    format: this.format(),
    filename: this.filename(),
    bridge: this.bridge(),
  }));

  constructor() {
    // Report the resolved format to the controller so it can pick a serializer.
    effect(() => this.controller().config()._internal?.setFormat(this.format()));
  }

  /** Stable callback for the toolbar's `canRun` — gates each document action. */
  readonly toolbarCanRun = (item: EditorToolbarItem): boolean => {
    const c = this.controller();
    switch (item) {
      case 'undo':
        return c.canUndo();
      case 'redo':
        return c.canRedo();
      case 'save':
        return c.isDirty();
      default:
        return true;
    }
  };

  onCommand(item: EditorToolbarItem): void {
    const c = this.controller();
    switch (item) {
      case 'undo':
        c.undo();
        break;
      case 'redo':
        c.redo();
        break;
      case 'save':
        this.saveError.set(null);
        void c.save().catch((e) => this.saveError.set((e as Error).message));
        break;
      case 'export':
        this.saveError.set(null);
        void this.downloadExport();
        break;
    }
  }

  private async downloadExport(): Promise<void> {
    try {
      const blob = await this.controller().exportAs('original');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.filename() ?? 'document';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.saveError.set((e as Error).message);
    }
  }
}
