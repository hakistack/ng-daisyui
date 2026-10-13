import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { LucideFile, LucideFileImage, LucideFileSpreadsheet, LucideFileText, LucideMail } from '@lucide/angular';
import { WorkspaceDocument } from './workspace-document';

/** Text of the list. */
export interface MesaDocumentListLabels {
  /** The list's accessible name ("Documents"). */
  readonly documents: string;
  /** How to use it, for screen readers. */
  readonly listHint: string;
  /** Page count in a row; `{count}` ("{count} p."). */
  readonly pageCountShort: string;
}

/** The icon family of a file, from its extension or MIME type. */
type DocumentKind = 'pdf' | 'sheet' | 'image' | 'mail' | 'other';

const KIND_BY_EXT: Record<string, DocumentKind> = {
  pdf: 'pdf',
  xlsx: 'sheet',
  xls: 'sheet',
  xlsb: 'sheet',
  ods: 'sheet',
  csv: 'sheet',
  eml: 'mail',
  msg: 'mail',
  ...Object.fromEntries(
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif', 'heic', 'heif', 'tif', 'tiff'].map((e) => [e, 'image']),
  ),
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function kindOf(doc: WorkspaceDocument, ext: string): DocumentKind {
  if (KIND_BY_EXT[ext]) return KIND_BY_EXT[ext];
  const mime = doc.mimeType ?? (doc.src instanceof Blob ? doc.src.type : '');
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

let nextId = 0;

interface Row {
  readonly doc: WorkspaceDocument;
  readonly kind: DocumentKind;
  /** "PDF · Contracts · 6 p." */
  readonly meta: string;
  /** Preview image URL, if there is one. */
  readonly preview: string | null;
}

/**
 * A workspace's document list (the rail of `hk-document-workspace` and
 * `hk-pdf-workspace`, docs/design/mesa-style-guide.md): one row per document
 * with a preview (or a format icon), its name and a meta line. Arrows move
 * focus (one tab stop), Enter / click opens; the open one is `aria-current`.
 */
@Component({
  selector: 'hk-mesa-document-list',
  imports: [LucideFile, LucideFileText, LucideFileImage, LucideFileSpreadsheet, LucideMail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <p [id]="uid + '-hint'" class="sr-only">{{ labels().listHint }}</p>
    <ul class="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5" [attr.aria-label]="labels().documents">
      @for (row of rows(); track row.doc.id; let i = $index) {
        <li class="py-0.5">
          <button
            type="button"
            class="rounded-field hover:bg-base-200 flex w-full min-w-0 items-center gap-2.5 px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-base-content"
            [class.bg-base-200]="row.doc.id === active()"
            [class.ring-1]="row.doc.id === active()"
            [class.ring-inset]="row.doc.id === active()"
            [class.ring-base-content/45]="row.doc.id === active()"
            [attr.data-document-index]="i"
            [attr.tabindex]="i === focusIndex() ? 0 : -1"
            [attr.aria-current]="row.doc.id === active() ? 'page' : null"
            [attr.aria-describedby]="uid + '-hint'"
            [title]="row.doc.name"
            (click)="open(i)"
            (focus)="focusIndex.set(i)"
            (keydown)="onKey($event, i)"
          >
            <span
              class="bg-base-100 ring-base-content/45 flex h-10 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm ring-1"
              aria-hidden="true"
            >
              @if (row.preview) {
                <img [src]="row.preview" alt="" class="h-full w-full object-cover object-top" loading="lazy" decoding="async" />
              } @else {
                @switch (row.kind) {
                  @case ('sheet') {
                    <svg lucideFileSpreadsheet [size]="16"></svg>
                  }
                  @case ('image') {
                    <svg lucideFileImage [size]="16"></svg>
                  }
                  @case ('mail') {
                    <svg lucideMail [size]="16"></svg>
                  }
                  @case ('other') {
                    <svg lucideFile [size]="16"></svg>
                  }
                  @default {
                    <svg lucideFileText [size]="16"></svg>
                  }
                }
              }
            </span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 text-sm leading-snug font-medium break-words">{{ row.doc.name }}</span>
              <span
                class="mt-0.5 block truncate text-xs tabular-nums"
                [class.text-base-content/70]="row.doc.id !== active()"
                [class.text-base-content]="row.doc.id === active()"
                >{{ row.meta }}</span
              >
            </span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class MesaDocumentListComponent {
  protected readonly uid = `hk-mesa-document-list-${++nextId}`;

  readonly documents = input.required<readonly WorkspaceDocument[]>();
  readonly active = input<string | null>(null);
  readonly labels = input.required<MesaDocumentListLabels>();
  /** A document was chosen (click or Enter). */
  readonly choose = output<string>();

  /** The row holding the tab stop: the open document until focus moves. */
  protected readonly focusIndex = signal(0);

  protected readonly rows = computed<Row[]>(() =>
    this.documents().map((doc) => {
      const ext = extensionOf(doc.name);
      const kind = kindOf(doc, ext);
      const pages = doc.pages ? this.labels().pageCountShort.replace('{count}', String(doc.pages)) : '';
      const preview = doc.thumbnail ?? (kind === 'image' && typeof doc.src === 'string' ? doc.src : null);
      return { doc, kind, meta: [ext.toUpperCase(), doc.description, pages].filter(Boolean).join(' · '), preview };
    }),
  );

  constructor() {
    // The tab stop follows the open document (focus can move away from it with the arrows).
    effect(() => {
      const active = this.active();
      const index = this.documents().findIndex((d) => d.id === active);
      untracked(() => {
        if (index >= 0) this.focusIndex.set(index);
      });
    });
  }

  protected open(index: number): void {
    const doc = this.documents()[index];
    if (doc) this.choose.emit(doc.id);
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const last = this.documents().length - 1;
    const to: Record<string, number> = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: last };
    const target = to[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const next = Math.max(0, Math.min(last, target));
    this.focusIndex.set(next);
    const list = (event.currentTarget as HTMLElement).closest('ul');
    list?.querySelector<HTMLElement>(`[data-document-index="${next}"]`)?.focus();
  }
}
