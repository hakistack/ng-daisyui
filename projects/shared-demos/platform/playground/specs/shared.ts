import type { Localized } from '../../catalog/catalog.types';

/** Shorthand for bilingual control labels. */
export const l = (en: string, es: string): Localized => ({ en, es });
/** `''` = not set (maps to a null/undefined input). */
export const COLORS = ['', 'neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'];
export const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];

/**
 * Service / builder playground snippet: a complete component with one button
 * that calls `<field>.<method>({...})`. `always` keys are written even when
 * equal to the playground default (sample text is not a library default).
 */
export function serviceSnippet(
  service: string,
  field: string,
  method: string,
  state: Record<string, string | number | boolean>,
  defaults: Record<string, string | number | boolean>,
  always: readonly string[],
  awaitResult = false,
): string {
  const entries = Object.keys(state)
    .filter((k) => always.includes(k) || state[k] !== defaults[k])
    .map(
      (k) =>
        `      ${k}: ${typeof state[k] === 'string' ? `'${String(state[k]).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : state[k]},`,
    );
  const call = `this.${field}.${method}({\n${entries.join('\n')}\n    })`;
  const body = awaitResult ? `const result = await ${call};\n    console.log(result);` : `${call};`;
  return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ${service} } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<button type="button" class="btn btn-primary" (click)="open()">Open</button>\`,
})
export class ExampleComponent {
  private readonly ${field} = inject(${service});

  ${awaitResult ? 'async ' : ''}open(): ${awaitResult ? 'Promise<void>' : 'void'} {
    ${body}
  }
}
`;
}

/** Every playground spec, keyed by docs page id (used by the definition checks). */
