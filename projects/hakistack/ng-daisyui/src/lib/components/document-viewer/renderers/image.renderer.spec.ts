import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentImageRenderer } from './image.renderer';
import { ResolvedFormat } from '../document-viewer.types';

const ICO_FORMAT: ResolvedFormat = { format: 'image', mimeType: 'image/x-icon', extension: '.ico' };
const PNG_FORMAT: ResolvedFormat = { format: 'image', mimeType: 'image/png', extension: '.png' };

describe('DocumentImageRenderer', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  function mount(source: unknown, format: ResolvedFormat, filename: string) {
    const fixture = TestBed.createComponent(DocumentImageRenderer);
    fixture.componentRef.setInput('source', source);
    fixture.componentRef.setInput('format', format);
    fixture.componentRef.setInput('filename', filename);
    fixture.detectChanges();
    return fixture;
  }

  it('resolves a Blob (uploaded ICO) to a single object URL — no effect loop', () => {
    // Regression: the effect used to read AND write `objectUrl`, re-triggering
    // itself forever and freezing the tab on any Blob/Uint8Array source.
    const fixture = mount(new Blob([new Uint8Array([0, 0, 1, 0])]), ICO_FORMAT, 'favicon.ico');
    expect(fixture.componentInstance.resolvedUrl()).toBe('blob:mock-url');
    // Exactly one creation proves the effect ran once, not in a loop.
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('handles a Uint8Array source the same way', () => {
    const fixture = mount(new Uint8Array([1, 2, 3, 4]), PNG_FORMAT, 'img.png');
    expect(fixture.componentInstance.resolvedUrl()).toBe('blob:mock-url');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('passes a string URL through without creating an object URL', () => {
    const fixture = mount('https://example.com/a.png', PNG_FORMAT, 'a.png');
    expect(fixture.componentInstance.resolvedUrl()).toBe('https://example.com/a.png');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
