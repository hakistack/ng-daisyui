import { BitmapCache, bitmapBytes } from './bitmap-cache';

/** A 10×10 bitmap is 400 bytes. */
class FakeBitmap {
  closed = false;
  constructor(
    readonly id: string,
    readonly width = 10,
    readonly height = 10,
  ) {}
  close(): void {
    this.closed = true;
  }
}

describe('BitmapCache', () => {
  it('evicts and closes the least-recently-used entries past the byte budget', () => {
    const cache = new BitmapCache<FakeBitmap>(800); // two 400-byte bitmaps
    const a = new FakeBitmap('a');
    const b = new FakeBitmap('b');
    const c = new FakeBitmap('c');
    cache.set('1:100', a);
    cache.set('2:100', b);
    cache.get('1:100'); // touch a → b is now oldest
    cache.set('3:100', c);
    expect(cache.size).toBe(2);
    expect(cache.totalBytes).toBe(800);
    expect(b.closed).toBe(true);
    expect(cache.get('2:100')).toBeUndefined();
    expect(cache.get('1:100')).toBe(a);
  });

  it('weighs entries by pixel size', () => {
    const cache = new BitmapCache<FakeBitmap>(bitmapBytes({ width: 20, height: 20 }));
    const small1 = new FakeBitmap('s1');
    const small2 = new FakeBitmap('s2');
    const big = new FakeBitmap('big', 20, 20);
    cache.set('1:10', small1);
    cache.set('2:10', small2);
    cache.set('3:20', big); // needs the whole budget → both small ones go
    expect(small1.closed && small2.closed).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('keeps a single bitmap larger than the whole budget', () => {
    const cache = new BitmapCache<FakeBitmap>(100);
    const huge = new FakeBitmap('huge', 100, 100);
    cache.set('1:100', huge);
    expect(huge.closed).toBe(false);
    expect(cache.size).toBe(1);
  });

  it('shrinking the budget evicts immediately', () => {
    const cache = new BitmapCache<FakeBitmap>(10_000);
    const a = new FakeBitmap('a');
    const b = new FakeBitmap('b');
    cache.set('1:1', a);
    cache.set('2:1', b);
    cache.setBudget(400);
    expect(a.closed).toBe(true);
    expect(cache.totalBytes).toBe(400);
  });

  it('finds any bitmap for a page, regardless of width', () => {
    const cache = new BitmapCache<FakeBitmap>(10_000);
    const a = new FakeBitmap('a');
    cache.set(BitmapCache.key(3, 800), a);
    expect(cache.findForPage(3)).toBe(a);
    expect(cache.findForPage(30)).toBeNull();
  });

  it('invalidates only the given page, closing its bitmaps and freeing their bytes', () => {
    const cache = new BitmapCache<FakeBitmap>(10_000);
    const p1a = new FakeBitmap('p1a');
    const p1b = new FakeBitmap('p1b');
    const p10 = new FakeBitmap('p10');
    cache.set('1:100', p1a);
    cache.set('1:200', p1b);
    cache.set('10:100', p10);
    cache.invalidatePage(1);
    expect(p1a.closed && p1b.closed).toBe(true);
    expect(p10.closed).toBe(false);
    expect(cache.totalBytes).toBe(400);
  });

  it('closes a replaced bitmap but not when re-setting the same one, and keeps the byte count right', () => {
    const cache = new BitmapCache<FakeBitmap>(10_000);
    const a = new FakeBitmap('a');
    const b = new FakeBitmap('b', 20, 20);
    cache.set('1:100', a);
    cache.set('1:100', a);
    expect(a.closed).toBe(false);
    expect(cache.totalBytes).toBe(400);
    cache.set('1:100', b);
    expect(a.closed).toBe(true);
    expect(cache.totalBytes).toBe(1600);
  });

  it('clear closes everything', () => {
    const cache = new BitmapCache<FakeBitmap>(10_000);
    const a = new FakeBitmap('a');
    cache.set('1:1', a);
    cache.clear();
    expect(a.closed).toBe(true);
    expect(cache.size).toBe(0);
    expect(cache.totalBytes).toBe(0);
  });
});
