/**
 * The single deep-merge used to assemble every tree built from several
 * translation modules: the runtime keys tree (`buildKeysTree`), the generated
 * `TK` literal (`mergeKeys`) and the per-language trees (`buildLanguageTree`).
 *
 * One implementation means the three can never disagree about which keys exist
 * when modules share a scope or nest under each other. A key defined twice, or
 * a key that is both a translation and a group, is an authoring error and throws
 * instead of letting one module silently win.
 */

type Tree = Record<string, unknown>;

function isTree(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null;
}

function cloneTree(tree: Tree): Tree {
  const out: Tree = {};
  for (const [key, value] of Object.entries(tree)) out[key] = isTree(value) ? cloneTree(value) : value;
  return out;
}

/**
 * Deep-merge `source` into `target` (never mutating `source`). `path` is the
 * dotted location of `target`, used in error messages. With `keysTree`, string
 * leaves are full translation keys and are quoted as-is in errors.
 */
export function mergeInto(target: Tree, source: Tree, path = '', keysTree = false): void {
  for (const [key, value] of Object.entries(source)) {
    const at = path ? `${path}.${key}` : key;
    const existing = target[key];
    if (existing === undefined) {
      target[key] = isTree(value) ? cloneTree(value) : value;
    } else if (isTree(existing) && isTree(value)) {
      mergeInto(existing, value, at, keysTree);
    } else if (!isTree(existing) && !isTree(value)) {
      throw new Error(`i18n: duplicate translation key '${keysTree ? String(existing) : at}' — it is defined by more than one module.`);
    } else {
      throw new Error(`i18n: '${at}' is both a translation and a group of translations (check modules sharing or nesting this scope).`);
    }
  }
}

/** Wrap `subtree` in nested objects following a dotted `scope` (`'a.b'` → `{ a: { b: subtree } }`). */
export function nestAtScope(scope: string, subtree: Tree): Tree {
  return scope
    .split('.')
    .reverse()
    .reduce<Tree>((inner, part) => ({ [part]: inner }), subtree);
}

type Intersect<T extends readonly unknown[]> = T extends readonly [infer Head, ...infer Rest] ? Head & Intersect<Rest> : unknown;

/**
 * Deep-merge several keys objects into one. Emitted by `hakistack-i18n scan`
 * wherever several modules contribute to the same `TK` branch (modules sharing
 * a scope, or a module plus deeper scopes nested under it). The intersection
 * type exposes every contributed key, matching the runtime value exactly.
 *
 * @example
 * mergeKeys(COMMON_A.keys, COMMON_B.keys, { users: ADMIN_USERS.keys })
 */
export function mergeKeys<const T extends readonly object[]>(...parts: T): Intersect<T> {
  const out: Tree = {};
  for (const part of parts) mergeInto(out, part as Tree, '', true);
  return out as Intersect<T>;
}
