/**
 * Shape of the generated API manifest (scripts/docs/api-extractor.mjs).
 * Hand-written so the generated file stays a plain data literal.
 */

export type ApiSymbolKind =
  | 'component'
  | 'directive'
  | 'pipe'
  | 'service'
  | 'provider'
  | 'token'
  | 'function'
  | 'class'
  | 'constant'
  | 'interface'
  | 'type'
  | 'enum';

export interface ApiSourceRef {
  /** Repo-relative path. */
  readonly path: string;
  readonly line: number;
}

export interface ApiInput {
  /** Public binding name (the alias when one is set). */
  readonly name: string;
  /** Class property name, only present when it differs from `name`. */
  readonly property?: string;
  readonly type: string;
  readonly default?: string;
  readonly required?: boolean;
  /** `model()` — supports `[(name)]` two-way binding. */
  readonly model?: boolean;
  readonly description?: string;
  readonly deprecated?: boolean;
}

export interface ApiOutput {
  readonly name: string;
  readonly property?: string;
  readonly type: string;
  readonly model?: boolean;
  readonly description?: string;
  readonly deprecated?: boolean;
}

export interface ApiMethod {
  readonly name: string;
  readonly signature: string;
  readonly description?: string;
  readonly deprecated?: boolean;
}

export interface ApiMember {
  readonly name: string;
  readonly type: string;
  readonly optional?: boolean;
  readonly readonly?: boolean;
  readonly method?: boolean;
  readonly description?: string;
  readonly deprecated?: boolean;
}

export interface ApiSymbol {
  /** Exported name (what consumers import). */
  readonly name: string;
  /** Declaration name in the source (differs for `export { A as B }`). */
  readonly localName: string;
  readonly kind: ApiSymbolKind;
  /** Library area derived from the source folder (e.g. `datagrid`, `toast`, `directives`). */
  readonly area: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly source: ApiSourceRef | null;

  // component / directive / pipe
  readonly selector?: string;
  readonly exportAs?: string;
  readonly inputs?: readonly ApiInput[];
  readonly outputs?: readonly ApiOutput[];

  // service / class
  readonly providedIn?: string;
  readonly methods?: readonly ApiMethod[];
  readonly properties?: readonly ApiMember[];

  // function / provider
  readonly signatures?: readonly string[];
  readonly params?: readonly { readonly name: string; readonly description: string }[];

  // interface
  readonly typeParams?: string;
  readonly extends?: readonly string[];
  readonly members?: readonly ApiMember[];

  // type / token / constant
  readonly typeText?: string;
}
