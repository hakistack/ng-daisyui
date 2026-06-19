import { ChangeDetectionStrategy, Component, OnDestroy, effect, input, signal } from '@angular/core';

import { DocumentEditorInputs } from '../document-editor.types';
import { renderMarkdown, sanitizeMarkdownHtml } from './markdown.helpers';
import { loadTextSource } from './text-source.helper';

/**
 * Markdown editor with a live split preview: raw Markdown in a `<textarea>` on
 * the left, the rendered (and sanitized) HTML on the right. The document model
 * stays the raw Markdown string — the preview is derived, never the source of
 * truth — so the Phase 0 `serializeText` round-trip is unchanged.
 *
 * Edits flow through the `bridge` exactly like the plain editor (snapshot
 * commands on the shared stack). The preview re-renders from `text()` on a
 * race-guarded async effect (`renderMarkdown` → `sanitizeMarkdownHtml`).
 */
@Component({
  selector: 'hk-document-markdown-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="text-base-content/60 py-8 text-center text-sm">Loading…</div>
    } @else if (error(); as e) {
      <div class="alert alert-error">{{ e }}</div>
    } @else {
      <div class="border-base-300 grid max-h-[28rem] grid-cols-1 gap-px overflow-hidden rounded-lg border md:grid-cols-2">
        <textarea
          class="bg-base-100 min-h-72 resize-none overflow-auto p-3 font-mono text-sm leading-relaxed outline-none"
          [value]="text()"
          (input)="onInput($event)"
          [attr.aria-label]="(filename() ?? 'Markdown') + ' source'"
          spellcheck="false"
        ></textarea>
        <div
          class="hk-markdown-preview bg-base-100 overflow-auto p-3 text-sm"
          [innerHTML]="previewHtml()"
          aria-label="Markdown preview"
          role="region"
        ></div>
      </div>
    }
  `,
  host: { class: 'block w-full' },
})
export class DocumentMarkdownEditor implements OnDestroy {
  readonly source = input.required<DocumentEditorInputs['source']>();
  readonly format = input.required<DocumentEditorInputs['format']>();
  readonly filename = input.required<DocumentEditorInputs['filename']>();
  readonly bridge = input.required<DocumentEditorInputs['bridge']>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly text = signal<string>('');
  readonly previewHtml = signal<string>('');

  private unbindReset: (() => void) | null = null;
  /** Monotonic token so a slow sanitize can't overwrite a newer render. */
  private renderToken = 0;

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

    // Re-render the preview whenever the markdown changes.
    effect(() => {
      const md = this.text();
      void this.renderPreview(md);
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
      label: 'Edit markdown',
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

  private async renderPreview(markdown: string): Promise<void> {
    const token = ++this.renderToken;
    const safe = await sanitizeMarkdownHtml(renderMarkdown(markdown));
    if (token === this.renderToken) this.previewHtml.set(safe);
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
