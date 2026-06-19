import { describe, expect, it } from 'vitest';
import { Component } from '@angular/core';

import { resolveEditor, resolveSerializer } from './document-editor.registry';
import { DocumentEditorRegistration, DocumentSerialize, DocumentSerializerRegistration } from './document-editor.types';

@Component({ selector: 'app-spy-text-editor', template: '' })
class SpyTextEditor {}
@Component({ selector: 'app-spy-sheet-editor', template: '' })
class SpySheetEditor {}
@Component({ selector: 'app-spy-override-editor', template: '' })
class SpyOverrideEditor {}

const BUILT_IN_EDITORS: DocumentEditorRegistration[] = [
  { formats: ['text'], component: SpyTextEditor },
  { formats: ['spreadsheet'], component: SpySheetEditor },
];

const textSerialize: DocumentSerialize = () => new Uint8Array([1]);
const sheetSerialize: DocumentSerialize = () => new Uint8Array([2]);
const overrideSerialize: DocumentSerialize = () => new Uint8Array([9]);

const BUILT_IN_SERIALIZERS: DocumentSerializerRegistration[] = [
  { formats: ['text'], serialize: textSerialize },
  { formats: ['spreadsheet'], serialize: sheetSerialize },
];

describe('resolveEditor', () => {
  it('finds a built-in editor by format key', () => {
    expect(resolveEditor('text', undefined, BUILT_IN_EDITORS)).toBe(SpyTextEditor);
    expect(resolveEditor('spreadsheet', undefined, BUILT_IN_EDITORS)).toBe(SpySheetEditor);
  });

  it('returns null for a format no editor claims', () => {
    expect(resolveEditor('pdf', undefined, BUILT_IN_EDITORS)).toBeNull();
    expect(resolveEditor('unknown', undefined, BUILT_IN_EDITORS)).toBeNull();
  });

  it('user editors win over built-ins, per claimed format only', () => {
    const userRegs: DocumentEditorRegistration[] = [{ formats: ['text'], component: SpyOverrideEditor }];
    expect(resolveEditor('text', userRegs, BUILT_IN_EDITORS)).toBe(SpyOverrideEditor);
    expect(resolveEditor('spreadsheet', userRegs, BUILT_IN_EDITORS)).toBe(SpySheetEditor);
  });

  it('empty user list falls through to built-ins', () => {
    expect(resolveEditor('text', [], BUILT_IN_EDITORS)).toBe(SpyTextEditor);
  });
});

describe('resolveSerializer', () => {
  it('finds a built-in serializer by format key', () => {
    expect(resolveSerializer('text', undefined, BUILT_IN_SERIALIZERS)).toBe(textSerialize);
    expect(resolveSerializer('spreadsheet', undefined, BUILT_IN_SERIALIZERS)).toBe(sheetSerialize);
  });

  it('returns null for a format no serializer claims', () => {
    expect(resolveSerializer('docx', undefined, BUILT_IN_SERIALIZERS)).toBeNull();
  });

  it('user serializers win over built-ins', () => {
    const userRegs: DocumentSerializerRegistration[] = [{ formats: ['text'], serialize: overrideSerialize }];
    expect(resolveSerializer('text', userRegs, BUILT_IN_SERIALIZERS)).toBe(overrideSerialize);
    expect(resolveSerializer('spreadsheet', userRegs, BUILT_IN_SERIALIZERS)).toBe(sheetSerialize);
  });
});
