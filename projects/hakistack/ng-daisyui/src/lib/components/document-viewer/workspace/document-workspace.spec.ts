import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createDocumentEditor } from '../../document-editor/document-editor.helpers';
import { DocumentViewerHost } from '../document-viewer-host';
import { DocumentRendererInputs, DocumentViewerConfig } from '../document-viewer.types';
import { DocumentWorkspaceComponent } from './document-workspace.component';
import { WorkspaceDocument } from '../../mesa/workspace-document';

/** `hk-document-workspace` (jsdom): the chrome around the renderers and the host channel they publish through. */

/** A renderer with three "chapters" that publishes them, and its properties, through the host. */
@Component({
  selector: 'hk-test-chapters-renderer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p data-chapter>{{ shown() }}</p>`,
})
class ChaptersRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();
  protected readonly shown = signal('c0');

  constructor() {
    const host = inject(DocumentViewerHost, { optional: true });
    if (!host) return;
    host.onGoTo((id) => {
      this.shown.set(id);
      host.current.set(id);
    });
    queueMicrotask(() => {
      host.sections.set(['c0', 'c1', 'c2'].map((id, i) => ({ id, label: `Chapter ${i + 1}`, kind: 'chapter' as const })));
      host.current.set('c0');
      host.metadata.set([{ label: 'Author', value: 'Ada' }]);
    });
  }
}

/** A renderer that knows nothing about the workspace. */
@Component({ selector: 'hk-test-plain-renderer', template: `<p data-plain>plain</p>` })
class PlainRenderer {
  readonly source = input.required<DocumentRendererInputs['source']>();
  readonly format = input.required<DocumentRendererInputs['format']>();
  readonly filename = input.required<DocumentRendererInputs['filename']>();
}

const editor = createDocumentEditor({});

@Component({
  imports: [DocumentWorkspaceComponent],
  template: `<hk-document-workspace
    [documents]="documents()"
    [config]="config()"
    [editor]="withEditor() ? editor : null"
    [storageKey]="null"
  />`,
})
class Host {
  readonly documents = signal<WorkspaceDocument[]>([{ id: 'book', name: 'book.txt', src: new Blob(['hello'], { type: 'text/plain' }) }]);
  readonly config = signal<DocumentViewerConfig>({ renderers: [{ formats: ['text'], component: ChaptersRenderer }] });
  readonly withEditor = signal(false);
  readonly editor = editor;
}

@Component({
  imports: [DocumentWorkspaceComponent],
  template: `<hk-document-workspace
    [documents]="documents()"
    [(active)]="active"
    [config]="config"
    [editor]="editor"
    [storageKey]="null"
  />`,
})
class ListHost {
  readonly documents = signal<WorkspaceDocument[]>([
    { id: 'a', name: 'Alpha.txt', src: new Blob(['alpha']), description: 'Notes', pages: 2 },
    { id: 'b', name: 'Beta.txt', src: new Blob(['beta']), description: 'Drafts' },
    { id: 'c', name: 'Gamma.txt', src: new Blob(['gamma']) },
  ]);
  readonly active = signal<string | null>(null);
  readonly config: DocumentViewerConfig = { renderers: [{ formats: ['text'], component: PlainRenderer }] };
  readonly editor = editor;
}

describe('hk-document-workspace', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    setup?.(fixture.componentInstance);
    for (let i = 0; i < 5; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
    }
    const settle = async () => {
      for (let i = 0; i < 3; i++) {
        fixture.detectChanges();
        await fixture.whenStable();
        await new Promise((r) => setTimeout(r, 0));
      }
    };
    return { fixture, el: fixture.nativeElement as HTMLElement, settle };
  }

  const dd = (el: HTMLElement) => Array.from(el.querySelectorAll('dd')).map((d) => d.textContent?.trim());

  it('lists the sections a renderer publishes in the rail, and pages through them', async () => {
    const { el, settle } = await render();
    // The documents on top; the open one's sections below, headed by its name.
    expect(Array.from(el.querySelectorAll('hk-mesa-layout h2')).map((h) => h.textContent?.trim())).toContain('book.txt · 3 sections');
    const rows = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[data-section-index]'));
    expect(rows().map((r) => r.querySelector('.truncate')?.textContent?.trim())).toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);
    expect(rows().map((r) => r.tabIndex)).toEqual([0, -1, -1]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Next section"]')!.click();
    await settle();
    expect(el.querySelector('[data-chapter]')?.textContent).toBe('c1');
    expect(rows()[1].getAttribute('aria-current')).toBe('page');
    expect((el.querySelector('hk-mesa-toolbar input') as HTMLInputElement).value).toBe('2');

    rows()[2].click();
    await settle();
    expect(el.querySelector('[data-chapter]')?.textContent).toBe('c2');
  });

  it('shows the file and the renderer’s properties in the inspector', async () => {
    const { el } = await render();
    expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent?.trim()).toBe('book.txt · TXT');
    expect(dd(el)).toEqual(['book.txt', 'TXT', '5 B', 'Ada']);
  });

  it('lists no sections for renderers that publish nothing', async () => {
    const { el } = await render((h) => h.config.set({ renderers: [{ formats: ['text'], component: PlainRenderer }] }));
    expect(el.querySelector('[data-plain]')).not.toBeNull();
    expect(el.querySelectorAll('[data-section-index]').length).toBe(0);
    expect(el.querySelectorAll('hk-mesa-document-list [data-document-index]').length).toBe(1);
    expect(el.querySelector('button[aria-label="Next section"]')).toBeNull();
  });

  it('a new document forgets the previous one’s sections and zoom', async () => {
    const { fixture, el, settle } = await render();
    el.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!.click();
    await settle();
    expect(el.querySelector('button[aria-label^="Reset zoom"]')?.textContent?.trim()).toBe('110%');
    fixture.componentInstance.documents.set([{ id: 'b', name: 'b.txt', src: new Blob(['b']) }]);
    fixture.componentInstance.config.set({ renderers: [{ formats: ['text'], component: PlainRenderer }] });
    await settle();
    expect(el.querySelectorAll('[data-section-index]').length).toBe(0);
    expect(el.querySelector('button[aria-label^="Reset zoom"]')?.textContent?.trim()).toBe('100%');
  });

  it('offers Edit only with an editor for the format, and swaps the document for the editor', async () => {
    const { fixture, el, settle } = await render();
    const edit = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('hk-mesa-toolbar button')).find((b) => b.textContent?.trim() === 'Edit');
    expect(edit()).toBeUndefined();
    fixture.componentInstance.withEditor.set(true);
    await settle();
    edit()!.click();
    await settle();
    expect(el.querySelector('hk-document-editor-shell')).not.toBeNull();
    expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent).toContain('Editing');
  });

  describe('with a document list', () => {
    async function renderList() {
      const fixture = TestBed.createComponent(ListHost);
      const settle = async () => {
        for (let i = 0; i < 4; i++) {
          fixture.detectChanges();
          await fixture.whenStable();
          await new Promise((r) => setTimeout(r, 0));
        }
      };
      await settle();
      return { fixture, el: fixture.nativeElement as HTMLElement, settle };
    }
    const rows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('hk-mesa-document-list [data-document-index]'));

    it('lists the documents and opens the first', async () => {
      const { fixture, el } = await renderList();
      expect(rows(el).map((r) => r.querySelector('.line-clamp-2')?.textContent?.trim())).toEqual(['Alpha.txt', 'Beta.txt', 'Gamma.txt']);
      expect(rows(el)[0].textContent).toContain('TXT · Notes · 2 p.');
      expect(rows(el)[0].getAttribute('aria-current')).toBe('page');
      expect(fixture.componentInstance.active()).toBe('a');
      expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent?.trim()).toBe('Alpha.txt · TXT');
    });

    it('opens another document, two-way', async () => {
      const { fixture, el, settle } = await renderList();
      rows(el)[1].click();
      await settle();
      expect(fixture.componentInstance.active()).toBe('b');
      expect(rows(el)[1].getAttribute('aria-current')).toBe('page');
      expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent?.trim()).toBe('Beta.txt · TXT');

      fixture.componentInstance.active.set('c');
      await settle();
      expect(el.querySelector('hk-mesa-toolbar .badge')?.textContent?.trim()).toBe('Gamma.txt · TXT');
    });

    it('arrows move focus along the list without opening; Enter opens', async () => {
      const { fixture, el, settle } = await renderList();
      rows(el)[0].focus();
      rows(el)[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      await settle();
      expect(document.activeElement).toBe(rows(el)[1]);
      expect(rows(el).map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
      expect(fixture.componentInstance.active()).toBe('a');
    });

    it('asks before leaving a document with unsaved edits', async () => {
      const { fixture, el, settle } = await renderList();
      const edit = Array.from(el.querySelectorAll<HTMLButtonElement>('hk-mesa-toolbar button')).find(
        (b) => b.textContent?.trim() === 'Edit',
      );
      edit!.click();
      await settle();
      vi.spyOn(editor, 'isDirty').mockReturnValue(true);
      HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      };

      rows(el)[2].click();
      await settle();
      expect(fixture.componentInstance.active()).toBe('a');
      const dialog = el.querySelector<HTMLDialogElement>('dialog[open]');
      expect(dialog?.textContent).toContain('“Alpha.txt” has unsaved changes');

      Array.from(dialog!.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Discard and open')!
        .click();
      await settle();
      expect(fixture.componentInstance.active()).toBe('c');
    });
  });
});
