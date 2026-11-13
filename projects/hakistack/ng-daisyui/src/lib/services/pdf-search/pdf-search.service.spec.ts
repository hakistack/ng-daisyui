import { TestBed } from '@angular/core/testing';
import { PdfSearchService } from './pdf-search.service';

describe('PdfSearchService', () => {
  it('finds text in ingested pages', async () => {
    const handle = await TestBed.inject(PdfSearchService).createIndex(3);
    handle.addPage(0, ['Hello ', 'world']);
    handle.addPage(2, ['Another world']);
    const hits = handle.search('world');
    expect(hits.map((h) => [h.page, h.charStart, h.charLen])).toEqual([
      [0, 6, 5],
      [2, 8, 5],
    ]);
    handle.dispose();
  });

  it('honours case-sensitive and whole-word options', async () => {
    const handle = await TestBed.inject(PdfSearchService).createIndex(1);
    handle.addPage(0, ['Cat catalog cat']);
    expect(handle.search('cat', { caseSensitive: true }).map((h) => h.charStart)).toEqual([4, 12]);
    expect(handle.search('cat', { wholeWord: true }).map((h) => h.charStart)).toEqual([0, 12]);
    handle.dispose();
  });

  it('keeps the shared engine heap intact across many indexes', async () => {
    // Regression: the index was built with `new WasmPdfIndex(n)` instead of the
    // `WasmPdfIndex.new(n)` factory, producing a pointer-less object whose
    // writes landed at address 0 of the shared wasm heap. Creating, filling
    // and freeing indexes after that failed with "null pointer passed to rust".
    const service = TestBed.inject(PdfSearchService);
    for (let round = 0; round < 3; round++) {
      const handle = await service.createIndex(50);
      for (let i = 0; i < 50; i++) handle.addPage(i, [`Page ${i + 1}`]);
      expect(handle.search('Page 2').length).toBe(11); // 2, 20–29
      expect(() => handle.dispose()).not.toThrow();
    }
  });
});
