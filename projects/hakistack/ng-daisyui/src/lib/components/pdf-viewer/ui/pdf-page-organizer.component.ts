import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  LucideCopy,
  LucideFilePlus,
  LucideFileOutput,
  LucideRedo2,
  LucideRotateCcw,
  LucideRotateCw,
  LucideSquarePlus,
  LucideTrash2,
  LucideUndo2,
} from '@lucide/angular';
import { isQuarterTurn } from '../core/geometry';
import { PdfVirtualPage, deletePages, duplicatePages, insertPages, movePages, rotatePages, sameLayout } from '../core/pages/page-model';
import { PdfAnnotationsService } from '../services/pdf-annotations.service';
import { PdfDocumentService } from '../services/pdf-document.service';
import { PdfFormsService } from '../services/pdf-forms.service';
import { PdfPagesService } from '../services/pdf-pages.service';
import { PdfThumbnailContent, PdfThumbnailsService } from '../services/pdf-thumbnails.service';
import { PdfViewerStore } from '../services/pdf-viewer.store';

let nextId = 0;

/** Raster widths thumbnails render at (the box scales them): fewer widths, more cache hits. */
const RASTER_WIDTHS = [120, 180, 240, 320];

/**
 * Paints one organizer thumbnail while it's on screen (and frees its pixels
 * when it scrolls away), from the shared thumbnail raster cache.
 */
@Directive({
  selector: 'canvas[hkPdfOrganizerThumb]',
  host: { '[style.width.px]': 'box().width', '[style.height.px]': 'box().height' },
})
export class PdfOrganizerThumbDirective {
  private readonly thumbnails = inject(PdfThumbnailsService);
  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;

  readonly content = input.required<PdfThumbnailContent>({ alias: 'hkPdfOrganizerThumb' });
  /** The square the thumbnail fits in (CSS px). */
  readonly size = input.required<number>();

  private readonly visible = signal(typeof IntersectionObserver === 'undefined');

  /** CSS size of the (rotated) thumbnail inside its square. */
  protected readonly box = computed(() => {
    const { page, rotation } = this.content();
    const swap = isQuarterTurn(rotation);
    const w = swap ? page.baseHeight : page.baseWidth;
    const h = swap ? page.baseWidth : page.baseHeight;
    const scale = this.size() / Math.max(w, h, 1);
    return { width: Math.round(w * scale), height: Math.round(h * scale), rasterWidth: page.baseWidth * scale };
  });

  constructor() {
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => this.visible.set(entries.some((e) => e.isIntersecting)), { rootMargin: '200px' });
      io.observe(this.canvas);
      inject(DestroyRef).onDestroy(() => io.disconnect());
    }
    effect(() => {
      const content = this.content();
      const box = this.box();
      if (!this.visible()) {
        untracked(() => {
          this.canvas.width = 1; // frees the backing store; repainted from the cache on return
          this.canvas.height = 1;
        });
        return;
      }
      const width = RASTER_WIDTHS.find((w) => w >= box.rasterWidth) ?? RASTER_WIDTHS[RASTER_WIDTHS.length - 1];
      untracked(() => void this.thumbnails.paintThumbnail(this.canvas, content, width).catch(() => false));
    });
  }
}

/**
 * The Organize pages dialog: every page as a thumbnail to select (click,
 * Ctrl/⌘ and Shift, or the keyboard), drag into place (CDK drag and drop;
 * dragging a selected page moves the whole selection), rotate, duplicate,
 * delete, insert blank pages or pages from another PDF, and extract. Edits
 * apply to a draft with its own undo; Apply makes it one step of the
 * document's history.
 */
@Component({
  selector: 'hk-pdf-page-organizer',
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    CdkDragPlaceholder,
    PdfOrganizerThumbDirective,
    LucideUndo2,
    LucideRedo2,
    LucideRotateCcw,
    LucideRotateCw,
    LucideCopy,
    LucideTrash2,
    LucideSquarePlus,
    LucideFilePlus,
    LucideFileOutput,
  ],
  templateUrl: './pdf-page-organizer.component.html',
  styles: `
    .cdk-drag-preview {
      box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.25);
    }
    .cdk-drag-animating,
    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 200ms cubic-bezier(0, 0, 0.2, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      .cdk-drag-animating,
      .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class PdfPageOrganizerComponent {
  protected readonly store = inject(PdfViewerStore);
  protected readonly pages = inject(PdfPagesService);
  private readonly document = inject(PdfDocumentService);
  private readonly annotations = inject(PdfAnnotationsService);
  private readonly forms = inject(PdfFormsService);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly grid = viewChild<ElementRef<HTMLElement>>('grid');

  protected readonly uid = `hk-pdf-organizer-${++nextId}`;
  /** The layout being edited. */
  protected readonly draft = signal<readonly PdfVirtualPage[]>([]);
  private readonly past = signal<readonly (readonly PdfVirtualPage[])[]>([]);
  private readonly future = signal<readonly (readonly PdfVirtualPage[])[]>([]);
  protected readonly selected = signal<ReadonlySet<number>>(new Set());
  /** The page with the roving tab stop. */
  protected readonly focusUid = signal<number | null>(null);
  private anchor: number | null = null;
  /** Thumbnail square size (px). */
  protected readonly size = signal(160);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly announcement = signal('');
  protected readonly dragging = signal<number | null>(null);

  protected readonly canUndo = computed(() => this.past().length > 0);
  protected readonly canRedo = computed(() => this.future().length > 0);
  protected readonly changed = computed(() => !sameLayout(this.draft(), this.store.pageLayout()));
  protected readonly selectionCount = computed(() => this.selected().size);
  protected readonly countText = computed(() => {
    const l = this.store.labels();
    const pages = l.organizerPageCount.replace('{count}', String(this.draft().length));
    const n = this.selected().size;
    return n ? `${pages} · ${l.pagesSelected.replace('{count}', String(n))}` : pages;
  });
  protected readonly extractTitle = computed(() => {
    const l = this.store.labels();
    if (!this.pages.canExtract()) return l.extractUnavailable;
    return this.changed() ? l.applyBeforeExtract : l.extractPages;
  });

  /** Thumbnail content per page, keyed by uid (annotations and widgets of the page it is, or copies). */
  protected readonly contents = computed(() => {
    const layout = this.store.pageLayout();
    const position = new Map(layout.map((p, i) => [p.uid, i]));
    const byUid = new Map(this.draft().map((p) => [p.uid, p]));
    const out = new Map<number, PdfThumbnailContent>();
    for (const p of this.draft()) {
      let origin: number | undefined = p.uid;
      for (let hops = 0; origin !== undefined && !position.has(origin) && hops < 64; hops++) origin = byUid.get(origin)?.copyOf;
      const at = origin !== undefined ? position.get(origin) : undefined;
      const source = this.store.sources.get(p.source);
      out.set(p.uid, {
        page: { doc: source?.handle ?? -1, index: p.index, key: `${p.source}:${p.index}`, baseWidth: p.width, baseHeight: p.height },
        rotation: p.rotation,
        annotations: at === undefined ? [] : this.annotations.forPage(at + 1),
        widgets: at === undefined || p.copyOf !== undefined ? [] : this.forms.widgetsForPage(at + 1),
      });
    }
    return out;
  });

  /** Accessible name per page, keyed by uid. */
  protected readonly itemLabels = computed(() => {
    const l = this.store.labels();
    return new Map(
      this.draft().map((p, i) => [
        p.uid,
        (p.rotation ? l.organizerPageRotated : l.organizerPage).replace('{page}', String(i + 1)).replace('{degrees}', String(p.rotation)),
      ]),
    );
  });

  constructor() {
    effect(() => {
      const open = this.pages.organizerOpen();
      const el = this.dialog()?.nativeElement;
      if (!el) return;
      untracked(() => {
        if (open && !el.open) this.start(el);
        else if (!open && el.open) el.close();
      });
    });
  }

  private start(el: HTMLDialogElement): void {
    const layout = this.store.pageLayout();
    this.draft.set(layout);
    this.past.set([]);
    this.future.set([]);
    this.error.set(null);
    this.announcement.set('');
    const current = layout[(this.store.state()?.page ?? 1) - 1]?.uid ?? layout[0]?.uid ?? null;
    this.selected.set(current === null ? new Set() : new Set([current]));
    this.focusUid.set(current);
    this.anchor = current;
    el.showModal?.();
    queueMicrotask(() => this.focusItem(current));
  }

  // ── Draft edits ─────────────────────────────────────────────────────────

  private edit(next: readonly PdfVirtualPage[]): void {
    const now = this.draft();
    if (next === now || sameLayout(now, next)) return;
    this.past.update((p) => [...p, now]);
    this.future.set([]);
    this.draft.set(next);
    this.error.set(null);
    const alive = new Set(next.map((p) => p.uid));
    this.selected.update((s) => new Set([...s].filter((u) => alive.has(u))));
    if (this.focusUid() !== null && !alive.has(this.focusUid()!)) this.focusUid.set(next[0]?.uid ?? null);
  }

  protected undo(): void {
    const past = this.past();
    if (!past.length) return;
    this.future.update((f) => [...f, this.draft()]);
    this.past.set(past.slice(0, -1));
    this.draft.set(past[past.length - 1]);
  }

  protected redo(): void {
    const future = this.future();
    if (!future.length) return;
    this.past.update((p) => [...p, this.draft()]);
    this.future.set(future.slice(0, -1));
    this.draft.set(future[future.length - 1]);
  }

  /** The selection, or the focused page when nothing is selected. */
  private targets(): Set<number> {
    const s = this.selected();
    if (s.size) return new Set(s);
    const f = this.focusUid();
    return f === null ? new Set() : new Set([f]);
  }

  protected rotate(delta: number): void {
    this.edit(rotatePages(this.draft(), this.targets(), delta));
  }

  protected remove(): void {
    const targets = this.targets();
    if (!targets.size || targets.size >= this.draft().length) return;
    const first = this.draft().findIndex((p) => targets.has(p.uid));
    this.edit(deletePages(this.draft(), targets));
    const next = this.draft()[Math.min(first, this.draft().length - 1)]?.uid ?? null;
    this.selected.set(next === null ? new Set() : new Set([next]));
    this.focusUid.set(next);
    this.anchor = next;
    queueMicrotask(() => this.focusItem(next));
  }

  protected duplicate(): void {
    const next = duplicatePages(this.draft(), this.targets(), () => this.store.newPageUid());
    this.pages.register(next);
    this.edit(next);
  }

  /** Where new pages go: after the last selected page, or at the end. */
  private insertionIndex(): number {
    const targets = this.targets();
    const draft = this.draft();
    let last = -1;
    draft.forEach((p, i) => {
      if (targets.has(p.uid)) last = i;
    });
    return last >= 0 ? last + 1 : draft.length;
  }

  protected async insertBlank(): Promise<void> {
    const at = this.insertionIndex();
    const ref = this.draft()[Math.max(0, at - 1)];
    await this.run(async () => {
      const page = await this.pages.blankPage(ref ? { width: ref.width, height: ref.height } : { width: 612, height: 792 });
      this.edit(insertPages(this.draft(), at, [page]));
      this.selectOnly([page.uid]);
    });
  }

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const at = this.insertionIndex();
    await this.run(async () => {
      const added = await this.pages.openPdf(file);
      this.edit(insertPages(this.draft(), at, added));
      this.selectOnly(added.map((p) => p.uid));
    });
  }

  protected async extract(): Promise<void> {
    if (this.changed() || !this.pages.canExtract()) return;
    const targets = this.targets();
    const numbers = this.draft().flatMap((p, i) => (targets.has(p.uid) ? [i + 1] : []));
    if (!numbers.length) return;
    await this.run(() => this.document.downloadExtracted(numbers));
  }

  protected async apply(): Promise<void> {
    if (this.busy()) return;
    const draft = this.draft();
    await this.run(async () => {
      if (this.changed()) await this.pages.apply(draft);
      this.pages.organizerOpen.set(false);
    });
  }

  protected cancel(): void {
    if (!this.busy()) this.pages.organizerOpen.set(false);
  }

  /** Esc / backdrop: keep the service in sync (or stay open while busy). */
  protected onNativeClose(): void {
    if (this.busy()) {
      this.dialog()?.nativeElement.showModal?.();
      return;
    }
    if (this.pages.organizerOpen()) this.pages.organizerOpen.set(false);
  }

  private async run(work: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (err) {
      this.error.set((err as Error)?.message || String(err));
    } finally {
      this.busy.set(false);
    }
  }

  // ── Selection and keyboard ──────────────────────────────────────────────

  protected selectAll(): void {
    this.selected.set(new Set(this.draft().map((p) => p.uid)));
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  private selectOnly(uids: readonly number[]): void {
    this.selected.set(new Set(uids));
    this.focusUid.set(uids[0] ?? null);
    this.anchor = uids[0] ?? null;
    queueMicrotask(() => this.focusItem(uids[0] ?? null));
  }

  protected onItemClick(event: MouseEvent, uid: number): void {
    this.focusUid.set(uid);
    if (event.shiftKey && this.anchor !== null) this.selectRange(this.anchor, uid);
    else if (event.metaKey || event.ctrlKey) {
      this.selected.update((s) => {
        const next = new Set(s);
        if (next.has(uid)) next.delete(uid);
        else next.add(uid);
        return next;
      });
      this.anchor = uid;
    } else {
      this.selected.set(new Set([uid]));
      this.anchor = uid;
    }
  }

  private selectRange(from: number, to: number): void {
    const draft = this.draft();
    const a = draft.findIndex((p) => p.uid === from);
    const b = draft.findIndex((p) => p.uid === to);
    if (a < 0 || b < 0) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    this.selected.set(new Set(draft.slice(lo, hi + 1).map((p) => p.uid)));
  }

  protected onItemKey(event: KeyboardEvent, index: number): void {
    const draft = this.draft();
    const uid = draft[index]?.uid;
    if (uid === undefined) return;
    const mod = event.metaKey || event.ctrlKey;
    const columns = this.columns();
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    if (event.key in step && event.altKey) {
      event.preventDefault();
      this.moveSelection(step[event.key]);
      return;
    }
    let to: number | null = null;
    if (event.key in step) to = index + step[event.key];
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = draft.length - 1;
    if (to !== null) {
      event.preventDefault();
      to = Math.max(0, Math.min(draft.length - 1, to));
      const target = draft[to].uid;
      this.focusUid.set(target);
      if (event.shiftKey && this.anchor !== null) this.selectRange(this.anchor, target);
      else if (!mod) {
        this.selected.set(new Set([target]));
        this.anchor = target;
      }
      this.focusItem(target);
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (mod || event.key === ' ') {
        this.selected.update((s) => {
          const next = new Set(s);
          if (next.has(uid)) next.delete(uid);
          else next.add(uid);
          return next;
        });
        this.anchor = uid;
      }
    } else if (mod && (event.key === 'a' || event.key === 'A')) {
      event.preventDefault();
      this.selectAll();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.remove();
    } else if (mod && (event.key === 'z' || event.key === 'Z')) {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
    } else if (mod && (event.key === 'y' || event.key === 'Y')) {
      event.preventDefault();
      this.redo();
    }
  }

  /** Move the selection by `delta` positions (Alt + arrows). */
  private moveSelection(delta: number): void {
    const draft = this.draft();
    const targets = this.targets();
    const indices = draft.flatMap((p, i) => (targets.has(p.uid) ? [i] : []));
    if (!indices.length) return;
    const first = indices[0];
    const count = indices.length;
    const newFirst = Math.max(0, Math.min(draft.length - count, first + delta));
    if (newFirst === first && indices[count - 1] - first === count - 1) return;
    const rest = draft.filter((p) => !targets.has(p.uid));
    const to = newFirst < rest.length ? draft.indexOf(rest[newFirst]) : draft.length;
    this.edit(movePages(draft, targets, to));
    this.selected.set(targets);
    this.announcement.set(this.store.labels().pagesMoved.replace('{position}', String(newFirst + 1)));
    queueMicrotask(() => this.focusItem(this.focusUid()));
  }

  /** Items per row in the grid (for Up / Down). */
  private columns(): number {
    const items = this.grid()?.nativeElement.querySelectorAll<HTMLElement>('[data-organizer-item]');
    if (!items?.length) return 1;
    const top = items[0].offsetTop;
    let n = 0;
    while (n < items.length && items[n].offsetTop === top) n++;
    return Math.max(1, n);
  }

  private focusItem(uid: number | null): void {
    if (uid === null) return;
    this.grid()?.nativeElement.querySelector<HTMLElement>(`[data-organizer-item="${uid}"]`)?.focus({ preventScroll: false });
  }

  // ── Drag and drop ───────────────────────────────────────────────────────

  protected onDragStart(uid: number): void {
    this.dragging.set(uid);
    if (!this.selected().has(uid)) {
      this.selected.set(new Set([uid]));
      this.anchor = uid;
    }
  }

  /** Dropping a selected page moves the whole selection to where it landed. */
  protected onDrop(event: CdkDragDrop<unknown, unknown, number>): void {
    this.dragging.set(null);
    const { previousIndex, currentIndex } = event;
    if (previousIndex === currentIndex) return;
    const uid = event.item.data;
    const moving = this.selected().has(uid) ? new Set(this.selected()) : new Set([uid]);
    const to = currentIndex > previousIndex ? currentIndex + 1 : currentIndex;
    this.edit(movePages(this.draft(), moving, to));
  }

  protected dragCount(uid: number): number {
    return this.selected().has(uid) ? this.selected().size : 1;
  }

  protected dragLabel(uid: number): string {
    return this.store.labels().organizerPageCount.replace('{count}', String(this.dragCount(uid)));
  }

  protected onSizeInput(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.size.set(v);
  }
}
