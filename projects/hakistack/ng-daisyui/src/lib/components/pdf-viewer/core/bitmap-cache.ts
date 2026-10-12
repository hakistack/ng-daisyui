/** Anything with a `close()` that releases its memory (e.g. `ImageBitmap`). */
export interface Closable {
  close(): void;
}

/**
 * LRU cache of rendered page bitmaps keyed by page and device width. Lets
 * scroll-back and zoom-revisit skip the worker, and supplies a scaled
 * placeholder for progressive paint while a sharp raster is in flight.
 * Entries are `close()`d when evicted or invalidated. Capped by entry count.
 */
export class BitmapCache<T extends Closable = ImageBitmap> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly maxEntries: number) {}

  static key(pageNumber: number, deviceWidth: number): string {
    return `${pageNumber}:${deviceWidth}`;
  }

  get size(): number {
    return this.entries.size;
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

  /** Store a bitmap (owned by the cache from now on), evicting the least-recently-used. */
  set(key: string, bitmap: T): void {
    const prev = this.entries.get(key);
    if (prev && prev !== bitmap) prev.close();
    this.entries.delete(key);
    this.entries.set(key, bitmap);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.get(oldest)?.close();
      this.entries.delete(oldest);
    }
  }

  /** Any cached bitmap for `pageNumber` (any scale), for progressive paint. */
  findForPage(pageNumber: number): T | null {
    const prefix = `${pageNumber}:`;
    for (const [k, v] of this.entries) {
      if (k.startsWith(prefix)) return v;
    }
    return null;
  }

  /** Drop and close every bitmap for one page (its content changed). */
  invalidatePage(pageNumber: number): void {
    const prefix = `${pageNumber}:`;
    for (const [k, v] of Array.from(this.entries)) {
      if (k.startsWith(prefix)) {
        v.close();
        this.entries.delete(k);
      }
    }
  }

  /** Drop and close everything. */
  clear(): void {
    for (const b of this.entries.values()) b.close();
    this.entries.clear();
  }
}
