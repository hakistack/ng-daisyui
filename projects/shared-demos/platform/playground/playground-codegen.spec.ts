import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, generatePlaygroundCode } from './playground-codegen';
import { INPUT_PLAYGROUND, PLAYGROUND_SPECS, SELECT_PLAYGROUND, TOAST_PLAYGROUND } from './playground-specs';

describe('playground code generation', () => {
  it('writes nothing but the tag for default state', () => {
    const code = generatePlaygroundCode(INPUT_PLAYGROUND, INPUT_PLAYGROUND.defaults);
    expect(code).toContain(`import { InputComponent } from '@hakistack/ng-daisyui';`);
    expect(code).not.toContain('variant=');
    expect(code).toContain('(valueChange)="onValueChange($event)"');
  });

  it('writes only changed inputs, strings as attributes and the rest as bindings', () => {
    const code = generatePlaygroundCode(INPUT_PLAYGROUND, {
      ...INPUT_PLAYGROUND.defaults,
      variant: 'currency',
      disabled: true,
      placeholder: 'Amount',
    });
    expect(code).toContain('variant="currency"');
    expect(code).toContain('[disabled]="true"');
    expect(code).toContain('placeholder="Amount"');
    expect(code).not.toContain('size=');
  });

  it('includes extra members and imports the template needs', () => {
    const code = generatePlaygroundCode(SELECT_PLAYGROUND, SELECT_PLAYGROUND.defaults);
    expect(code).toContain('[options]="options"');
    expect(code).toContain('options: SelectOption<string>[]');
    expect(code).toContain('import { SelectComponent, SelectOption }');
  });

  it('service playgrounds call the real service method', () => {
    const code = generatePlaygroundCode(TOAST_PLAYGROUND, { ...TOAST_PLAYGROUND.defaults, severity: 'error', sticky: true });
    expect(code).toContain('inject(ToastService)');
    expect(code).toContain("severity: 'error'");
    expect(code).toContain('sticky: true');
    expect(code).not.toContain('life:');
  });

  it('escapes quotes in generated string literals', () => {
    const code = generatePlaygroundCode(TOAST_PLAYGROUND, { ...TOAST_PLAYGROUND.defaults, summary: "It's done" });
    expect(code).toContain("summary: 'It\\'s done'");
  });
});

describe('shareable playground state', () => {
  it('round-trips only non-default values', () => {
    const state = { ...INPUT_PLAYGROUND.defaults, variant: 'phone', placeholder: 'Teléfono' };
    const encoded = encodeState(INPUT_PLAYGROUND, state);
    expect(decodeState(INPUT_PLAYGROUND, encoded)).toEqual(state);
  });

  it('ignores invalid or unknown values from a tampered URL', () => {
    const bad = btoa(JSON.stringify({ variant: 'nope', disabled: 'yes', evil: '<script>' }));
    expect(decodeState(INPUT_PLAYGROUND, bad)).toEqual(INPUT_PLAYGROUND.defaults);
    expect(decodeState(INPUT_PLAYGROUND, '%%%')).toEqual(INPUT_PLAYGROUND.defaults);
  });

  it('every spec has a control for each bound input', () => {
    for (const spec of Object.values(PLAYGROUND_SPECS)) {
      for (const key of spec.inputs ?? []) expect(spec.controls.some((c) => c.key === key)).toBe(true);
      for (const c of spec.controls) expect(c.key in spec.defaults).toBe(true);
    }
  });
});
