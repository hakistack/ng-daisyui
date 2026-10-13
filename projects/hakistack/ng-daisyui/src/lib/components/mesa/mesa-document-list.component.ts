import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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
  /** The filter field's label ("Filter documents"). */
  readonly filter: string;
  /** No document matches the filter ("No documents match"). */
  readonly noMatches: string;
}

/** Height of a row (px): fixed, so long lists virtualize. */
export const MESA_DOCUMENT_ROW = 56;
/** Lists this long get a filter field. */
export const MESA_DOCUMENT_FILTER_AT = 8;
/** Lists longer than this render only the rows in view. */
const VIRTUAL_AT = 60;
/** Lower-case, without accents, for matching. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
  /** Folded name and description, for the filter. */
  readonly haystack: string;
}

/**
 * A workspace's document list (the rail of `hk-document-workspace` and
 * `hk-pdf-workspace`, docs/design/mesa-style-guide.md): one fixed-height row
 * per document with a preview (or a format icon), its name and a meta line.
 *
 * - Long lists get a filter field (name and description, accent-insensitive)
 *   and, past {@link VIRTUAL_AT} rows, render only the rows in view.
 * - Arrows move focus (one tab stop; ↓ from the filter enters the list),
 *   Enter / click opens; the open one is `aria-current` and kept in view.
 */
@Component({
  selector: 'hk-mesa-document-list',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    NgTemplateOutlet,
    LucideFile,
    LucideFileText,
    LucideFileImage,
    LucideFileSpreadsheet,
    LucideMail,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <p [id]="uid + '-hint'" class="sr-only">{{ labels().listHint }}</p>
    @if (showFilter()) {
      <div class="shrink-0 px-2.5 pt-2.5 pb-1.5">
        <label class="input input-sm input-bordered flex w-full items-center gap-2">
          <span class="sr-only">{{ labels().filter }}</span>
          <input
            #filterInput
            type="search"
            class="min-w-0 flex-1"
            [placeholder]="labels().filter"
            [value]="query()"
            (input)="query.set(filterInput.value)"
            (keydown)="onFilterKey($event)"
          />
          @if (query()) {
            <span class="text-base-content/70 shrink-0 font-mono text-xs tabular-nums" aria-hidden="true"
              >{{ rows().length }}/{{ documents().length }}</span
            >
          }
        </label>
      </div>
    }

    @if (rows().length === 0) {
      <p class="text-base-content/70 px-4 py-6 text-center text-sm" role="status">{{ labels().noMatches }}</p>
    } @else if (virtual()) {
      <cdk-virtual-scroll-viewport #viewport [itemSize]="rowHeight" minBufferPx="300" maxBufferPx="600" class="min-h-0 flex-1">
        <ul class="px-1.5" [attr.aria-label]="labels().documents">
          <li
            *cdkVirtualFor="let row of rows(); let i = index; trackBy: trackRow"
            [style.height.px]="rowHeight"
            class="py-0.5"
            [attr.aria-setsize]="rows().length"
            [attr.aria-posinset]="i + 1"
          >
            <ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: row, i }" />
          </li>
        </ul>
      </cdk-virtual-scroll-viewport>
    } @else {
      <ul #plainList class="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5" [attr.aria-label]="labels().documents">
        @for (row of rows(); track row.doc.id; let i = $index) {
          <li class="py-0.5" [style.height.px]="rowHeight">
            <ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: row, i }" />
          </li>
        }
      </ul>
    }

    <ng-template #rowTpl let-row let-i="i">
      <button
        type="button"
        class="rounded-field hover:bg-base-200 flex h-full w-full min-w-0 items-center gap-2.5 px-2 text-left focus-visible:outline-2 focus-visible:outline-base-content"
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
          <span class="block truncate text-sm leading-snug font-medium">{{ row.doc.name }}</span>
          <span
            class="mt-0.5 block truncate text-xs tabular-nums"
            [class.text-base-content/70]="row.doc.id !== active()"
            [class.text-base-content]="row.doc.id === active()"
            >{{ row.meta }}</span
          >
        </span>
      </button>
    </ng-template>
  `,
})
export class MesaDocumentListComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly uid = `hk-mesa-document-list-${++nextId}`;
  protected readonly rowHeight = MESA_DOCUMENT_ROW;

  readonly documents = input.required<readonly WorkspaceDocument[]>();
  readonly active = input<string | null>(null);
  readonly labels = input.required<MesaDocumentListLabels>();
  /** A document was chosen (click or Enter). */
  readonly choose = output<string>();

  protected readonly query = signal('');
  /** The row holding the tab stop (an index into the shown rows). */
  protected readonly focusIndex = signal(0);
  private readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');

  private readonly allRows = computed<Row[]>(() =>
    this.documents().map((doc) => {
      const ext = extensionOf(doc.name);
      const kind = kindOf(doc, ext);
      const pages = doc.pages ? this.labels().pageCountShort.replace('{count}', String(doc.pages)) : '';
      const preview = doc.thumbnail ?? (kind === 'image' && typeof doc.src === 'string' ? doc.src : null);
      const meta = [ext.toUpperCase(), doc.description, pages].filter(Boolean).join(' · ');
      return { doc, kind, meta, preview, haystack: fold(`${doc.name} ${doc.description ?? ''}`) };
    }),
  );

  protected readonly showFilter = computed(() => this.documents().length >= MESA_DOCUMENT_FILTER_AT);

  /** The rows shown (filtered). */
  protected readonly rows = computed(() => {
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    const rows = this.allRows();
    return words.length ? rows.filter((r) => words.every((w) => r.haystack.includes(w))) : rows;
  });

  protected readonly virtual = computed(() => this.rows().length > VIRTUAL_AT);

  protected readonly trackRow = (_: number, row: Row) => row.doc.id;

  constructor() {
    // The tab stop follows the open document, which is kept in view.
    effect(() => {
      const active = this.active();
      const index = this.rows().findIndex((r) => r.doc.id === active);
      untracked(() => {
        if (index < 0) return;
        this.focusIndex.set(index);
        requestAnimationFrame(() => this.reveal(index));
      });
    });
    // A new filter result starts at its first row.
    effect(() => {
      this.query();
      untracked(() => {
        const active = this.rows().findIndex((r) => r.doc.id === this.active());
        this.focusIndex.set(Math.max(0, active));
      });
    });
  }

  protected open(index: number): void {
    const row = this.rows()[index];
    if (row) this.choose.emit(row.doc.id);
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const last = this.rows().length - 1;
    const page = Math.max(1, Math.floor((this.host.clientHeight || 300) / MESA_DOCUMENT_ROW) - 1);
    const to: Record<string, number> = {
      ArrowUp: index - 1,
      ArrowDown: index + 1,
      PageUp: index - page,
      PageDown: index + page,
      Home: 0,
      End: last,
    };
    const target = to[event.key];
    if (target === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    if (target < 0 && this.showFilter()) {
      this.host.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
      return;
    }
    this.focusRow(Math.max(0, Math.min(last, target)));
  }

  /** ↓ / Enter from the filter: into the list. */
  protected onFilterKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'Enter') return;
    if (!this.rows().length) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Enter' && this.rows().length === 1) this.open(0);
    else this.focusRow(0);
  }

  private focusRow(index: number): void {
    this.focusIndex.set(index);
    this.reveal(index);
    this.focusWhenMounted(index, 8);
  }

  /** Scroll a row into view (rendering it, in a virtual list). */
  private reveal(index: number): void {
    const viewport = this.viewport();
    if (viewport) {
      const { start, end } = viewport.getRenderedRange();
      const top = viewport.measureScrollOffset();
      const height = viewport.getViewportSize();
      const rowTop = index * MESA_DOCUMENT_ROW;
      if (index < start || index >= end || rowTop < top || rowTop + MESA_DOCUMENT_ROW > top + height) {
        viewport.scrollToOffset(Math.max(0, rowTop - Math.max(0, (height - MESA_DOCUMENT_ROW) / 2)));
      }
      return;
    }
    this.rowEl(index)?.scrollIntoView?.({ block: 'nearest' });
  }

  private focusWhenMounted(index: number, tries: number): void {
    const el = this.rowEl(index);
    if (el) {
      el.focus({ preventScroll: !!this.viewport() });
      return;
    }
    if (tries > 0) requestAnimationFrame(() => this.focusWhenMounted(index, tries - 1));
  }

  private rowEl(index: number): HTMLElement | null {
    return this.host.querySelector<HTMLElement>(`[data-document-index="${index}"]`);
  }
}
