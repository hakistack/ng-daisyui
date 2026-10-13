import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createDocumentEditor } from '../../document-editor/document-editor.helpers';
import { DocumentViewerHost } from '../document-viewer-host';
import { DocumentRendererInputs, DocumentSource, DocumentViewerConfig } from '../document-viewer.types';
import { DocumentWorkspaceComponent } from './document-workspace.component';

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
  template: `<hk-document-workspace [src]="src()" [config]="config()" [editor]="withEditor() ? editor : null" [storageKey]="null" />`,
})
class Host {
  readonly src = signal<DocumentSource>(new Blob(['hello'], { type: 'text/plain' }));
  readonly config = signal<DocumentViewerConfig>({ filename: 'book.txt', renderers: [{ formats: ['text'], component: ChaptersRenderer }] });
  readonly withEditor = signal(false);
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

  it('works without a rail for renderers that publish nothing', async () => {
    const { el } = await render((h) => h.config.set({ filename: 'a.txt', renderers: [{ formats: ['text'], component: PlainRenderer }] }));
    expect(el.querySelector('[data-plain]')).not.toBeNull();
    expect(el.querySelector('hk-mesa-layout section[aria-label="Sections"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Next section"]')).toBeNull();
  });

  it('a new document forgets the previous one’s sections and zoom', async () => {
    const { fixture, el, settle } = await render();
    el.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!.click();
    await settle();
    expect(el.querySelector('button[aria-label^="Reset zoom"]')?.textContent?.trim()).toBe('110%');
    fixture.componentInstance.config.set({ filename: 'b.txt', renderers: [{ formats: ['text'], component: PlainRenderer }] });
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
});
