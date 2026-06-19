import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, effect, input, signal, viewChild } from '@angular/core';

import { DocumentEditorInputs } from '../document-editor.types';
import { loadTextSource } from './text-source.helper';

/**
 * Plain-text surface for `.txt`, `.log`, `.json` and anything text-shaped that
 * isn't Markdown or CSV. A `<textarea>` paired with a scroll-synced line-number
 * gutter. Reports edits back through the `bridge`:
 *
 *  - on load → `bridge.setInitial(text)` (clean baseline);
 *  - on edit → snapshot `EditorCommand` on `bridge.stack` + `bridge.setContent`;
 *  - on controller reset → re-seed via `bridge.onReset`.
 *
 * The gutter is `aria-hidden` decoration; the textarea carries the accessible
 * label, so screen readers get the editable content without line-number noise.
 */
@Component({
  selector: 'hk-document-plain-text-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else {
      <div class="border-base-300 bg-base-100 flex max-h-[28rem] overflow-hidden rounded-lg border font-mono text-sm leading-relaxed">
        <div #gutter class="text-base-content/40 bg-base-200 select-none overflow-hidden py-3 pr-2 pl-3 text-right" aria-hidden="true">
          @for (n of lineNumbers(); track n) {
            <div>{{ n }}</div>
          }
        </div>
        <textarea
          #ta
          class="flex-1 resize-none overflow-auto bg-transparent px-3 py-3 leading-relaxed outline-none"
          [value]="text()"
          (input)="onInput($event)"
          (scroll)="syncScroll()"
          [attr.aria-label]="filename() ?? 'Document text'"
          spellcheck="false"
        ></textarea>
      </div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentPlainTextEditor implements OnDestroy {
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<DocumentEditorInputs['format']>();
  readonly filename = input.required<DocumentEditorInputs['filename']>();
  readonly bridge = input.required<DocumentEditorInputs['bridge']>();

  private readonly gutter = viewChild<ElementRef<HTMLElement>>('gutter');
  private readonly ta = viewChild<ElementRef<HTMLTextAreaElement>>('ta');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly text = signal<string>('');

  /** Line numbers for the gutter — one per `\n`-delimited line (min 1). */
  readonly lineNumbers = computed(() => {
    const count = Math.max(1, this.text().split('\n').length);
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  private unbindReset: (() => void) | null = null;

  constructor() {
    effect((onCleanup) => {
      const bridge = this.bridge();
      this.unbindReset = bridge.onReset((content) => this.text.set(asText(content)));
      onCleanup(() => this.unbindReset?.());
    });

    effect(() => {
      const src = this.source();
      void this.load(src);
    });
  }

  ngOnDestroy(): void {
    this.unbindReset?.();
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    const prev = this.text();
    if (next === prev) return;
    const bridge = this.bridge();
    bridge.stack.execute({
      label: 'Edit text',
      do: () => {
        this.text.set(next);
        bridge.setContent(next);
      },
      undo: () => {
        this.text.set(prev);
        bridge.setContent(prev);
      },
    });
  }

  /** Keep the gutter's vertical scroll locked to the textarea's. */
  syncScroll(): void {
    const gutter = this.gutter()?.nativeElement;
    const ta = this.ta()?.nativeElement;
    if (gutter && ta) gutter.scrollTop = ta.scrollTop;
  }

  private async load(src: DocumentEditorInputs['source']): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const decoded = await loadTextSource(src);
      this.text.set(decoded);
      this.bridge().setInitial(decoded);
    } catch (e) {
      this.error.set((e as Error).message ?? 'Failed to load document.');
    } finally {
      this.loading.set(false);
    }
  }
}

function asText(content: unknown): string {
  return typeof content === 'string' ? content : String(content ?? '');
}
