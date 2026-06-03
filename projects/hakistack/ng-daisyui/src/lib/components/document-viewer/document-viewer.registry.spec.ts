import { describe, expect, it } from 'vitest';
import { Component } from '@angular/core';

import { resolveRenderer } from './document-viewer.registry';
import { DocumentRendererRegistration } from './document-viewer.types';

// Three throwaway components — just need distinct class references for
// identity equality assertions. No template / inputs / behavior needed.
@Component({ selector: 'spy-pdf', template: '' })
class SpyPdfRenderer {}
@Component({ selector: 'spy-spread', template: '' })
class SpySpreadsheetRenderer {}
@Component({ selector: 'spy-override', template: '' })
class SpyOverrideRenderer {}

const BUILT_INS: DocumentRendererRegistration[] = [
  { formats: ['pdf'], component: SpyPdfRenderer },
  { formats: ['spreadsheet'], component: SpySpreadsheetRenderer },
];

describe('resolveRenderer', () => {
  it('finds a built-in registration by format key', () => {
    expect(resolveRenderer('pdf', undefined, BUILT_INS)).toBe(SpyPdfRenderer);
    expect(resolveRenderer('spreadsheet', undefined, BUILT_INS)).toBe(SpySpreadsheetRenderer);
  });

  it('returns null for an unknown format', () => {
    expect(resolveRenderer('unknown', undefined, BUILT_INS)).toBeNull();
    expect(resolveRenderer('presentation', undefined, BUILT_INS)).toBeNull();
  });

  it('user registrations win over built-ins', () => {
    // Consumer wants their own PDF renderer instead of the library's.
    const userRegs: DocumentRendererRegistration[] = [{ formats: ['pdf'], component: SpyOverrideRenderer }];
    expect(resolveRenderer('pdf', userRegs, BUILT_INS)).toBe(SpyOverrideRenderer);
  });

  it('user registrations only override the formats they claim', () => {
    // PDF gets overridden; spreadsheet still falls through to built-in.
    const userRegs: DocumentRendererRegistration[] = [{ formats: ['pdf'], component: SpyOverrideRenderer }];
    expect(resolveRenderer('pdf', userRegs, BUILT_INS)).toBe(SpyOverrideRenderer);
    expect(resolveRenderer('spreadsheet', userRegs, BUILT_INS)).toBe(SpySpreadsheetRenderer);
  });

  it('multi-format user registrations match any format in the list', () => {
    const userRegs: DocumentRendererRegistration[] = [{ formats: ['pdf', 'spreadsheet'], component: SpyOverrideRenderer }];
    expect(resolveRenderer('pdf', userRegs, BUILT_INS)).toBe(SpyOverrideRenderer);
    expect(resolveRenderer('spreadsheet', userRegs, BUILT_INS)).toBe(SpyOverrideRenderer);
  });

  it('first matching user registration wins (declaration order)', () => {
    // Consumer accidentally registers two PDF renderers — earlier one wins.
    const userRegs: DocumentRendererRegistration[] = [
      { formats: ['pdf'], component: SpyOverrideRenderer },
      { formats: ['pdf'], component: SpyPdfRenderer },
    ];
    expect(resolveRenderer('pdf', userRegs, BUILT_INS)).toBe(SpyOverrideRenderer);
  });

  it('empty user registration list falls through to built-ins', () => {
    expect(resolveRenderer('pdf', [], BUILT_INS)).toBe(SpyPdfRenderer);
  });

  it('returns null when neither user nor built-in regs claim the format', () => {
    const userRegs: DocumentRendererRegistration[] = [{ formats: ['document'], component: SpyOverrideRenderer }];
    expect(resolveRenderer('email', userRegs, BUILT_INS)).toBeNull();
  });
});
