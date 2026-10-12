import { BitmapCache } from './bitmap-cache';

class FakeBitmap {
  closed = false;
  constructor(readonly id: string) {}
  close(): void {
    this.closed = true;
  }
}

describe('BitmapCache', () => {
  it('evicts and closes the least-recently-used entry past the cap', () => {
    const cache = new BitmapCache<FakeBitmap>(2);
    const a = new FakeBitmap('a');
    const b = new FakeBitmap('b');
    const c = new FakeBitmap('c');
    cache.set('1:100', a);
    cache.set('2:100', b);
    cache.get('1:100'); // touch a → b is now oldest
    cache.set('3:100', c);
    expect(cache.size).toBe(2);
    expect(b.closed).toBe(true);
    expect(cache.get('2:100')).toBeUndefined();
    expect(cache.get('1:100')).toBe(a);
  });

  it('finds any bitmap for a page, regardless of width', () => {
    const cache = new BitmapCache<FakeBitmap>(4);
    const a = new FakeBitmap('a');
    cache.set(BitmapCache.key(3, 800), a);
    expect(cache.findForPage(3)).toBe(a);
    expect(cache.findForPage(30)).toBeNull();
  });

  it('invalidates only the given page and closes its bitmaps', () => {
    const cache = new BitmapCache<FakeBitmap>(4);
    const p1a = new FakeBitmap('p1a');
    const p1b = new FakeBitmap('p1b');
    const p10 = new FakeBitmap('p10');
    cache.set('1:100', p1a);
    cache.set('1:200', p1b);
    cache.set('10:100', p10);
    cache.invalidatePage(1);
    expect(p1a.closed && p1b.closed).toBe(true);
    expect(p10.closed).toBe(false);
    expect(cache.size).toBe(1);
  });

  it('closes a replaced bitmap but not when re-setting the same one', () => {
    const cache = new BitmapCache<FakeBitmap>(4);
    const a = new FakeBitmap('a');
    const b = new FakeBitmap('b');
    cache.set('1:100', a);
    cache.set('1:100', a);
    expect(a.closed).toBe(false);
    cache.set('1:100', b);
    expect(a.closed).toBe(true);
  });

  it('clear closes everything', () => {
    const cache = new BitmapCache<FakeBitmap>(4);
    const a = new FakeBitmap('a');
    cache.set('1:1', a);
    cache.clear();
    expect(a.closed).toBe(true);
    expect(cache.size).toBe(0);
  });
});
