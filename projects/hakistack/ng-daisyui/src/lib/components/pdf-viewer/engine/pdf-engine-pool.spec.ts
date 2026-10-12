import { PdfEnginePool } from './pdf-engine-pool';
import { PdfiumEngine } from './pdfium-engine';

/**
 * A stand-in for one worker engine: just the calls the pool's open/mutation/
 * resync paths use. Each fake owns its "documents" as a version counter so a
 * test can see which copies a mutation (or a resync) reached.
 */
class FakeEngine {
  private next = 100;
  readonly docs = new Map<number, { bytes: string; edits: number }>();
  failNextMutation = false;
  failSave = false;

  async open(bytes: ArrayBuffer): Promise<number> {
    const h = this.next++;
    this.docs.set(h, { bytes: new TextDecoder().decode(bytes), edits: 0 });
    return h;
  }

  async deletePage(handle: number): Promise<boolean> {
    if (this.failNextMutation) {
      this.failNextMutation = false;
      throw new Error('worker mutation failed');
    }
    this.docs.get(handle)!.edits++;
    return true;
  }

  async save(handle: number): Promise<Uint8Array> {
    if (this.failSave) throw new Error('save failed');
    const d = this.docs.get(handle)!;
    return new TextEncoder().encode(`${d.bytes}+${d.edits}`);
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

describe('PdfEnginePool broadcast', () => {
  it('applies a mutation to every worker', async () => {
    const { pool, fakes } = makePool(3);
    const doc = await pool.open(bytes());
    await expect(pool.deletePage(doc, 0)).resolves.toBe(true);
    for (const f of fakes) expect([...f.docs.values()][0].edits).toBe(1);
    expect(pool.isDesynced).toBe(false);
  });

  it('rethrows when the mutation failed on every worker (copies still agree)', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    for (const f of fakes) f.failNextMutation = true;
    await expect(pool.deletePage(doc, 0)).rejects.toThrow('worker mutation failed');
    expect(pool.isDesynced).toBe(false);
  });

  it('heals a partial failure by reopening the healthy copy in the failed worker', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    fakes[1].failNextMutation = true;

    await expect(pool.deletePage(doc, 0)).resolves.toBe(true);

    expect(pool.isDesynced).toBe(false);
    // Worker 1 now holds the bytes saved from worker 0 (which has the edit).
    expect([...fakes[1].docs.values()][0].bytes).toBe('pdf+1');
  });

  it('marks the pool desynced when the resync itself fails', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    fakes[1].failNextMutation = true;
    fakes[0].failSave = true;

    await expect(pool.deletePage(doc, 0)).rejects.toThrow(/desynchronized/);
    expect(pool.isDesynced).toBe(true);
  });

  it('clears the desync flag on a fresh open', async () => {
    const { pool, fakes } = makePool(2);
    const doc = await pool.open(bytes());
    fakes[1].failNextMutation = true;
    fakes[0].failSave = true;
    await pool.deletePage(doc, 0).catch(() => undefined);

    fakes[0].failSave = false;
    await pool.open(bytes());
    expect(pool.isDesynced).toBe(false);
  });
});
