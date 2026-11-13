import { PdfEnginePool } from './pdf-engine-pool';
import { PdfiumEngine } from './pdfium-engine';

/** A stand-in for one worker engine: the calls the pool routes. */
class FakeEngine {
  private next = 100;
  readonly docs = new Set<number>();
  readonly hidden = new Map<number, readonly number[]>();
  reads = 0;
  renders = 0;

  async open(): Promise<number> {
    const h = this.next++;
    this.docs.add(h);
    return h;
  }

  async pageCount(handle: number): Promise<number> {
    this.reads++;
    return this.docs.has(handle) ? 3 : 0;
  }

  renderPage() {
    this.renders++;
    return { promise: new Promise<never>(() => undefined), cancel: () => undefined };
  }

  async setHiddenAnnotations(handle: number, entries: readonly number[]): Promise<void> {
    this.hidden.set(handle, entries);
  }

  dispose(handle: number): void {
    this.docs.delete(handle);
  }

  destroy(): void {
    this.docs.clear();
  }
}

function makePool(size: number): { pool: PdfEnginePool; fakes: FakeEngine[] } {
  const fakes: FakeEngine[] = [];
  const pool = new PdfEnginePool(size, () => {
    const f = new FakeEngine();
    fakes.push(f);
    return f as unknown as PdfiumEngine;
  });
  return { pool, fakes };
}

const bytes = () => new TextEncoder().encode('pdf').buffer;

describe('PdfEnginePool', () => {
  it('opens a copy in every worker and reads from the primary one', async () => {
    const { pool, fakes } = makePool(3);
    const doc = await pool.open(bytes());
    for (const f of fakes) expect(f.docs.size).toBe(1);
    await expect(pool.pageCount(doc)).resolves.toBe(3);
    expect(fakes.map((f) => f.reads)).toEqual([1, 0, 0]);
  });

  it('spreads renders over the least busy workers', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    for (let i = 0; i < 4; i++) pool.renderPage(doc, i, 100, 1);
    expect(fakes.map((f) => f.renders)).toEqual([2, 2]);
  });

  it('gives every worker the hidden-annotation set, and disposes every copy', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    await pool.setHiddenAnnotations(doc, [0, 1]);
    for (const f of fakes) expect([...f.hidden.values()]).toEqual([[0, 1]]);
    pool.dispose(doc);
    for (const f of fakes) expect(f.docs.size).toBe(0);
    expect(() => pool.pageCount(doc)).toThrow('unknown document handle');
  });
});
