import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script without type declarations
import { createSnippetChecker } from '../../../../scripts/docs/check-demo-snippets.mjs';
import { API_SYMBOLS } from './api-manifest.generated';

const check = createSnippetChecker(API_SYMBOLS) as (code: string) => string[];

describe('demo snippet checker', () => {
  it('accepts real inputs, outputs, forms directives and global attributes', () => {
    expect(
      check(
        `<hk-input variant="currency" placeholder="Amount" [disabled]="off" [formControl]="ctl" aria-label="Amount" (valueChange)="set($event)" />`,
      ),
    ).toEqual([]);
  });

  it('rejects unknown inputs, outputs and components', () => {
    expect(check(`<hk-input [nope]="1" (bad)="f()" /><hk-ghost />`)).toEqual([
      '<hk-input> binds [nope], which is not an input',
      '<hk-input> listens to (bad), which is not an output',
      '<hk-ghost> is not a known component selector',
    ]);
  });

  it('checks directive inputs and package imports', () => {
    expect(check(`<input hkInputMask="999" [notAMaskInput]="1" />`)).toEqual([
      'InputMaskDirective binds [notAMaskInput], which is not an input',
    ]);
    expect(check(`import { InputComponent, NotExported } from '@hakistack/ng-daisyui';`)).toEqual([
      'imports `NotExported`, which is not exported by @hakistack/ng-daisyui',
    ]);
  });

  it('checks templates embedded in TypeScript snippets', () => {
    expect(check('@Component({ template: `<hk-select [options]="o" [foo]="1" />` })')).toEqual([
      '<hk-select> binds [foo], which is not an input',
    ]);
  });
});
