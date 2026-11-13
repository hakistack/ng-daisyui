import { decodeBase64, onceAsync } from './wasm-loader';

describe('wasm-loader', () => {
  it('decodeBase64 returns the original bytes', () => {
    expect(Array.from(decodeBase64(btoa('\x00asm')))).toEqual([0, 0x61, 0x73, 0x6d]);
  });

  it('onceAsync shares one in-flight/successful result', async () => {
    const init = vi.fn(async () => 42);
    const load = onceAsync(init);
    await expect(Promise.all([load(), load()])).resolves.toEqual([42, 42]);
    await load();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('onceAsync retries after a rejected attempt instead of caching the failure', async () => {
    const init = vi.fn().mockRejectedValueOnce(new Error('chunk fetch failed')).mockResolvedValueOnce('ok');
    const load = onceAsync(init as () => Promise<string>);
    await expect(load()).rejects.toThrow('chunk fetch failed');
    await expect(load()).resolves.toBe('ok');
    expect(init).toHaveBeenCalledTimes(2);
  });
});
