import type { Localized } from '../catalog/catalog.types';

export type PlaygroundValue = string | number | boolean;
export type PlaygroundState = Record<string, PlaygroundValue>;

interface ControlBase<K extends string> {
  /** State key. For component playgrounds this is the input name it binds to. */
  readonly key: K;
  readonly label: Localized;
  readonly hint?: Localized;
}

export type PlaygroundControl<K extends string = string> =
  | (ControlBase<K> & { readonly kind: 'select'; readonly options: readonly string[] })
  | (ControlBase<K> & { readonly kind: 'boolean' })
  | (ControlBase<K> & { readonly kind: 'text' })
  | (ControlBase<K> & { readonly kind: 'number'; readonly min?: number; readonly max?: number; readonly step?: number });

/**
 * A playground for one component. Kept declarative so the same definition
 * drives the controls, the generated code and the automated checks:
 *  - every key in `inputs` must be a real input of `symbol` (manifest),
 *  - every select option must be a member of that input's union type,
 *  - every name in `events` must be a real output.
 * See playground-definitions.spec.ts.
 */
export interface PlaygroundSpec<S extends PlaygroundState = PlaygroundState> {
  /** `'wide'` gives the preview the full width and puts the controls below it. Default: side by side. */
  readonly layout?: 'default' | 'wide';
  /** Exported symbol the playground exercises (component or service). */
  readonly symbol: string;
  readonly controls: readonly PlaygroundControl<Extract<keyof S, string>>[];
  readonly defaults: S;
  /**
   * Component playgrounds: state keys bound as inputs on `selector`.
   * Omit for service playgrounds (they provide `code`).
   */
  readonly inputs?: readonly Extract<keyof S, string>[];
  readonly selector?: string;
  /** Outputs shown in the event inspector and wired in the generated code. */
  readonly events?: readonly string[];
  /** Values kept in the generated template even when equal to the default (e.g. demo options). */
  readonly extraTemplateAttrs?: string;
  /** Extra class members needed by the generated component (e.g. an options array). */
  readonly extraMembers?: string;
  /** Additional named imports from '@hakistack/ng-daisyui' for the generated code. */
  readonly extraImports?: readonly string[];
  /**
   * Service playgrounds: the options interface whose members the control keys
   * must match (e.g. `ToastOptions`). Checked against the manifest.
   */
  readonly optionsSymbol?: string;
  /**
   * Package that exports `optionsSymbol` when it is not a library type (e.g. `'@angular/cdk/dialog'`
   * for `DialogConfig`). The checker then reads its members with the TypeScript checker.
   */
  readonly optionsFrom?: string;
  /** Full override of code generation (service playgrounds). */
  readonly code?: (state: S) => string;
}

export interface PlaygroundEvent {
  readonly id: number;
  readonly name: string;
  readonly payload: string;
  readonly at: string;
}

/**
 * Author a playground with full key checking against its state type, then
 * erase the state type so specs can live in one registry and be passed to
 * `<app-playground [spec]>`.
 */
export function definePlayground<S extends PlaygroundState>(spec: PlaygroundSpec<S>): PlaygroundSpec {
  return spec as unknown as PlaygroundSpec;
}
