import { normalizeRotation } from '../geometry';

/**
 * Virtual pages: the pages the viewer shows, in order, each pointing at a
 * page of a source document (the open document is source 0; imported PDFs
 * and blank-page templates are others). Organizing pages edits this list;
 * nothing is re-parsed or re-rendered (a page's raster depends only on its
 * source page), and saving writes the list into the file (`page-writer.ts`).
 */
export interface PdfVirtualPage {
  /** Unique within the document's session; stays with the page as it moves. */
  readonly uid: number;
  /** Source document (0 = the open document). */
  readonly source: number;
  /** 0-based page in the source. */
  readonly index: number;
  /** Displayed size in points (the source page's own `/Rotate` applied). */
  readonly width: number;
  readonly height: number;
  /** Rotation added on top of the source page's, clockwise (0, 90, 180 or 270). */
  readonly rotation: number;
  /** Set on duplicates: the `uid` of the page copied. Saved as a new page object, without form fields. */
  readonly copyOf?: number;
}

/** Rotate the pages in `uids` by `delta` degrees. */
export function rotatePages(pages: readonly PdfVirtualPage[], uids: ReadonlySet<number>, delta: number): PdfVirtualPage[] {
  return pages.map((p) => (uids.has(p.uid) ? { ...p, rotation: normalizeRotation(p.rotation + delta) } : p));
}

/** Remove the pages in `uids`. */
export function deletePages(pages: readonly PdfVirtualPage[], uids: ReadonlySet<number>): PdfVirtualPage[] {
  return pages.filter((p) => !uids.has(p.uid));
}

/**
 * Move the pages in `uids` (keeping their order) so they sit before the page
 * now at `to` (0-based; `pages.length` = the end).
 */
export function movePages(pages: readonly PdfVirtualPage[], uids: ReadonlySet<number>, to: number): PdfVirtualPage[] {
  const at = Math.max(0, Math.min(pages.length, to));
  const moving = pages.filter((p) => uids.has(p.uid));
  const rest = pages.filter((p) => !uids.has(p.uid));
  const before = pages.slice(0, at).filter((p) => uids.has(p.uid)).length;
  const insertAt = at - before;
  return [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];
}

/** Insert `added` so the first of them sits at `at` (0-based, clamped). */
export function insertPages(pages: readonly PdfVirtualPage[], at: number, added: readonly PdfVirtualPage[]): PdfVirtualPage[] {
  const i = Math.max(0, Math.min(pages.length, at));
  return [...pages.slice(0, i), ...added, ...pages.slice(i)];
}

/** Duplicate the pages in `uids`, each copy right after its page. */
export function duplicatePages(pages: readonly PdfVirtualPage[], uids: ReadonlySet<number>, nextUid: () => number): PdfVirtualPage[] {
  return pages.flatMap((p) => (uids.has(p.uid) ? [p, { ...p, uid: nextUid(), copyOf: p.uid }] : [p]));
}

/** Whether two layouts show the same pages in the same order and rotations. */
export function sameLayout(a: readonly PdfVirtualPage[], b: readonly PdfVirtualPage[]): boolean {
  return a.length === b.length && a.every((p, i) => p.uid === b[i].uid && p.rotation === b[i].rotation);
}

/** Whether the layout is the source document's own pages, in order (rotations aside). */
export function isSourceOrder(pages: readonly PdfVirtualPage[], sourcePageCount: number): boolean {
  return pages.length === sourcePageCount && pages.every((p, i) => p.source === 0 && p.index === i && p.copyOf === undefined);
}

/**
 * How positions change between two layouts, for data addressed by page
 * position (annotations, form widgets).
 */
export interface PageRemap {
  /** For each position before, the position after (`-1`: the page was deleted). */
  readonly moved: readonly number[];
  /** Duplicates: `[position after, position before of the page copied]`. */
  readonly copies: readonly (readonly [number, number])[];
  /** Positions after of pages that are new (inserted or imported), not copies. */
  readonly added: readonly number[];
}

/**
 * The remap from `before` to `after`. A page in `after` that isn't in
 * `before` is a copy when `copyOf` (followed through `lookup` for copies of
 * copies) reaches a page in `before`, otherwise new.
 */
export function pageRemap(
  before: readonly PdfVirtualPage[],
  after: readonly PdfVirtualPage[],
  lookup: (uid: number) => PdfVirtualPage | undefined = () => undefined,
): PageRemap {
  const was = new Map(before.map((p, i) => [p.uid, i]));
  const now = new Map(after.map((p, i) => [p.uid, i]));
  const byUid = (uid: number) => after.find((p) => p.uid === uid) ?? lookup(uid);
  const copies: [number, number][] = [];
  const added: number[] = [];
  after.forEach((p, i) => {
    if (was.has(p.uid)) return;
    let origin = p.copyOf;
    for (let hops = 0; origin !== undefined && !was.has(origin) && hops < 64; hops++) origin = byUid(origin)?.copyOf;
    if (origin !== undefined && was.has(origin)) copies.push([i, was.get(origin)!]);
    else added.push(i);
  });
  return { moved: before.map((p) => now.get(p.uid) ?? -1), copies, added };
}

/** Whether a remap changes nothing (same pages, same positions). */
export function isIdentityRemap(remap: PageRemap): boolean {
  return remap.copies.length === 0 && remap.added.length === 0 && remap.moved.every((to, from) => to === from);
}

/**
 * Parse page ranges as people type them ("1-3, 5, 8-") against `count`
 * pages: 1-based page numbers, in the order given, without repeats. `null`
 * when the text isn't a valid range list.
 */
export function parsePageRanges(text: string, count: number): number[] | null {
  const out: number[] = [];
  const seen = new Set<number>();
  const parts = text
    .split(/[,;]+/)
    .map((s) => s.replace(/\s+/g, ''))
    .filter(Boolean);
  if (parts.length === 0) return null;
  for (const part of parts) {
    const m = /^(\d*)([-–])(\d*)$/.exec(part) ?? /^(\d+)()()$/.exec(part);
    if (!m || (m[2] && !m[1] && !m[3])) return null;
    const single = !m[2];
    const from = m[1] ? Number(m[1]) : 1;
    const to = single ? from : m[3] ? Number(m[3]) : count;
    if (from < 1 || to < 1 || from > count || to > count) return null;
    const step = from <= to ? 1 : -1;
    for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
}
