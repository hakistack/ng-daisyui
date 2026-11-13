import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { DocumentViewerComponent, createDocumentEditor } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocsForComponent } from '../shared/api-docs-for.component';

type ExampleTab = 'text' | 'markdown' | 'csv';

/** Reproducible in-memory samples — no network, no files on disk. */
const SAMPLES: Record<ExampleTab, { filename: string; mime: string; body: string }> = {
  text: {
    filename: 'notes.txt',
    mime: 'text/plain',
    body: 'Meeting notes\n\n- Ship the docs platform\n- Review the DataGrid server demo\n- Translate guides to Spanish\n',
  },
  markdown: {
    filename: 'README.md',
    mime: 'text/markdown',
    body: '# Release notes\n\nThis **Markdown** file is editable.\n\n- Undo / redo share one history\n- Save serializes back to `.md`\n',
  },
  csv: {
    filename: 'inventory.csv',
    mime: 'text/csv',
    body: 'sku,name,stock\nA-100,Keyboard,12\nA-101,Mouse,40\nA-102,Monitor,7\n',
  },
};

const CODE = `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DocumentViewerComponent, createDocumentEditor } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-notes-editor',
  imports: [DocumentViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-document-viewer [src]="file" [config]="{ filename: 'notes.txt' }" mode="edit" [editor]="editor" />
    <button type="button" class="btn btn-sm" [disabled]="!editor.isDirty()" (click)="save()">Save</button>
  \`,
})
export class NotesEditorComponent {
  readonly file = new Blob(['Hello'], { type: 'text/plain' });
  readonly editor = createDocumentEditor();

  async save(): Promise<void> {
    const bytes = await this.editor.save();
    console.log('saved', bytes.byteLength, 'bytes');
  }
}`;

@Component({
  selector: 'app-document-editor-demo',
  imports: [DocumentViewerComponent, DocSectionComponent, DemoPageComponent, ApiDocsForComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-demo-page
      title="Document Editor"
      description="Edit plain text, Markdown and CSV inside the document viewer, with undo/redo and save."
      icon="file-pen-line"
      category="Documents"
      importName="createDocumentEditor"
    >
      <div examples class="space-y-6">
        <app-doc-section [title]="sample().filename" [description]="description()" [codeExample]="code">
          @for (key of [activeTab()]; track key) {
            <hk-document-viewer [src]="blob()" [config]="{ filename: sample().filename }" mode="edit" [editor]="editor" />
          }
          <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <button type="button" class="btn btn-sm btn-primary" [disabled]="!editor.isDirty()" (click)="save()">Save</button>
            <button type="button" class="btn btn-sm" (click)="download()">Export original format</button>
            <button type="button" class="btn btn-sm btn-ghost" [disabled]="!editor.isDirty()" (click)="editor.reset()">Reset</button>
            <span class="text-base-content/70" role="status" aria-live="polite">
              {{ editor.isDirty() ? 'Unsaved changes' : 'No changes' }} · undo {{ editor.canUndo() ? 'available' : '—' }}
              @if (savedBytes() !== null) {
                · last save {{ savedBytes() }} bytes
              }
            </span>
          </div>
        </app-doc-section>
      </div>
      <div api class="space-y-6">
        <app-api-docs-for component="DocumentViewerComponent" />
        <app-api-docs-for component="DocumentEditorShellComponent" />
      </div>
    </app-demo-page>
  `,
})
export class DocumentEditorDemoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly feature = toSignal(this.route.params.pipe(map((p) => p['feature'] as string | undefined)));
  protected readonly activeTab = computed<ExampleTab>(() => {
    const f = this.feature();
    return f === 'markdown' || f === 'csv' ? f : 'text';
  });
  protected readonly sample = computed(() => SAMPLES[this.activeTab()]);
  protected readonly blob = computed(() => new Blob([this.sample().body], { type: this.sample().mime }));
  protected readonly description = computed(() =>
    this.activeTab() === 'csv'
      ? 'CSV is edited as a grid and serialized back to CSV on save.'
      : this.activeTab() === 'markdown'
        ? 'Markdown source with a rendered preview; save writes the .md text.'
        : 'Plain text editing; save writes UTF-8 bytes.',
  );

  protected readonly editor = createDocumentEditor({ onSave: (bytes) => this.savedBytes.set(bytes.byteLength) });
  protected readonly savedBytes = signal<number | null>(null);
  protected readonly code = CODE;

  protected async save(): Promise<void> {
    await this.editor.save();
  }

  protected async download(): Promise<void> {
    const blob = await this.editor.exportAs('original');
    const a = this.document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = this.sample().filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
