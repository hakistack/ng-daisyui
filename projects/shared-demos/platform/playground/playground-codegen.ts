import type { PlaygroundSpec, PlaygroundState, PlaygroundValue } from './playground.types';

/**
 * Generate a complete standalone Angular component that reproduces the
 * playground state. Only values that differ from the defaults are written,
 * so the snippet shows exactly what the user changed.
 */
export function generatePlaygroundCode<S extends PlaygroundState>(spec: PlaygroundSpec<S>, state: S): string {
  if (spec.code) return spec.code(state);
  if (!spec.selector) throw new Error(`Playground for ${spec.symbol} needs a selector or a code() override.`);

  const attrs: string[] = [];
  for (const key of spec.inputs ?? []) {
    const value = state[key];
    if (value === spec.defaults[key]) continue;
    attrs.push(bindAttr(key, value));
  }
  if (spec.extraTemplateAttrs) attrs.unshift(spec.extraTemplateAttrs);
  const handlers = (spec.events ?? []).map((e) => ({ event: e, method: `on${e[0].toUpperCase()}${e.slice(1)}` }));
  for (const h of handlers) attrs.push(`(${h.event})="${h.method}($event)"`);

  const tag = spec.selector;
  const template = attrs.length ? `<${tag}\n      ${attrs.join('\n      ')}\n    />` : `<${tag} />`;
  const imports = [spec.symbol, ...(spec.extraImports ?? [])];
  const members = [
    ...(spec.extraMembers ? [indent(spec.extraMembers.trim())] : []),
    ...handlers.map((h) => `  ${h.method}(value: unknown): void {\n    console.log('${h.event}', value);\n  }`),
  ];

  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ${imports.join(', ')} } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  imports: [${spec.symbol}],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    ${template}
  \`,
})
export class ExampleComponent {${members.length ? '\n' + members.join('\n\n') + '\n' : ''}}
`;
}

function indent(block: string): string {
  return block
    .split('\n')
    .map((line) => (line ? '  ' + line : line))
    .join('\n');
}

function bindAttr(key: string, value: PlaygroundValue): string {
  if (typeof value === 'string') return `${key}="${value.replace(/"/g, '&quot;')}"`;
  return `[${key}]="${value}"`;
}

/** Serialize state for a shareable URL (only non-default values). */
export function encodeState<S extends PlaygroundState>(spec: PlaygroundSpec<S>, state: S): string {
  const diff: Partial<S> = {};
  for (const c of spec.controls) if (state[c.key] !== spec.defaults[c.key]) diff[c.key] = state[c.key];
  const json = JSON.stringify(diff);
  let bin = '';
  for (const b of new TextEncoder().encode(json)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Parse a shared state, keeping only values that are valid for their control. */
export function decodeState<S extends PlaygroundState>(spec: PlaygroundSpec<S>, encoded: string | null | undefined): S {
  const state = { ...spec.defaults };
  if (!encoded) return state;
  let raw: Record<string, unknown>;
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
  } catch {
    return state;
  }
  for (const c of spec.controls) {
    const v = raw[c.key];
    if (v === undefined) continue;
    if (c.kind === 'boolean' && typeof v === 'boolean') (state as PlaygroundState)[c.key] = v;
    else if (c.kind === 'text' && typeof v === 'string' && v.length <= 200) (state as PlaygroundState)[c.key] = v;
    else if (c.kind === 'select' && typeof v === 'string' && c.options.includes(v)) (state as PlaygroundState)[c.key] = v;
    else if (
      c.kind === 'number' &&
      typeof v === 'number' &&
      Number.isFinite(v) &&
      (c.min === undefined || v >= c.min) &&
      (c.max === undefined || v <= c.max)
    )
      (state as PlaygroundState)[c.key] = v;
  }
  return state;
}
