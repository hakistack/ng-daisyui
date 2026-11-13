/** A cached raster: something with pixel dimensions and a `close()` that frees it (e.g. `ImageBitmap`). */
export interface CachedBitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}

/** Bytes a bitmap occupies (RGBA, 4 bytes per pixel). */
export function bitmapBytes(b: { width: number; height: number }): number {
  return b.width * b.height * 4;
}

/**
 * Default cache budget for this device: 96 MB where `navigator.deviceMemory`
 * reports ≤ 4 GB (phones, low-end laptops), 256 MB otherwise. One fit-width
 * letter page at DPR 2 is ~13 MB, so that's roughly 7 vs 20 pages.
 */
export function defaultBitmapBudgetBytes(): number {
  const memoryGb = (typeof navigator !== 'undefined' && (navigator as { deviceMemory?: number }).deviceMemory) || 8;
  return (memoryGb <= 4 ? 96 : 256) * 1024 * 1024;
}

/**
 * LRU cache of rendered page bitmaps keyed by page (its raster key) and device width, bounded
 * by total bytes. Lets scroll-back and zoom-revisit skip the worker, and
 * supplies a scaled placeholder for progressive paint while a sharp raster is
 * in flight. Entries are `close()`d when evicted or invalidated. A bitmap
 * larger than the whole budget is still kept (alone), so the page on screen
 * always has its raster.
 */
export class BitmapCache<T extends CachedBitmap = ImageBitmap> {
  private readonly entries = new Map<string, T>();
  private bytes = 0;

  constructor(private maxBytes: number) {}

  static key(page: string | number, deviceWidth: number): string {
    return `${page}@${deviceWidth}`;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Total bytes currently held. */
  get totalBytes(): number {
    return this.bytes;
  }

  get budgetBytes(): number {
    return this.maxBytes;
  }

  /** Change the budget, evicting least-recently-used entries if now over it. */
  setBudget(maxBytes: number): void {
    this.maxBytes = Math.max(0, maxBytes);
    this.evictOverBudget();
  }

  /** Exact hit for `key`, marked most-recently-used. */
  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (hit) {
      this.entries.delete(key);
      this.entries.set(key, hit);
    }
    return hit;
  }

  /** Store a bitmap (owned by the cache from now on), evicting least-recently-used entries past the budget. */
  set(key: string, bitmap: T): void {
    const prev = this.entries.get(key);
    if (prev) {
      this.bytes -= bitmapBytes(prev);
      if (prev !== bitmap) prev.close();
      this.entries.delete(key);
    }
    this.entries.set(key, bitmap);
    this.bytes += bitmapBytes(bitmap);
    this.evictOverBudget();
  }

  /** Any cached bitmap for `page` (any scale), for progressive paint. */
  findForPage(page: string | number): T | null {
    const prefix = `${page}@`;
    for (const [k, v] of this.entries) {
      if (k.startsWith(prefix)) return v;
    }
    return null;
  }

  /** Drop and close every bitmap for one page (its content changed). */
  invalidatePage(page: string | number): void {
    const prefix = `${page}@`;
    for (const [k, v] of Array.from(this.entries)) {
      if (k.startsWith(prefix)) this.remove(k, v);
    }
  }

  /** Drop and close everything. */
  clear(): void {
    for (const b of this.entries.values()) b.close();
    this.entries.clear();
    this.bytes = 0;
  }

  private evictOverBudget(): void {
    // Keep at least the most recent entry, even when it alone exceeds the budget.
    while (this.bytes > this.maxBytes && this.entries.size > 1) {
      const [oldestKey, oldest] = this.entries.entries().next().value as [string, T];
      this.remove(oldestKey, oldest);
    }
  }

  private remove(key: string, bitmap: T): void {
    bitmap.close();
    this.entries.delete(key);
    this.bytes -= bitmapBytes(bitmap);
  }
}
