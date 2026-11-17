/**
 * Shared CLI reporting: conflict wording and source locations for problems
 * found on the executed registry (`validate`, `generate`).
 */

import type { KeyConflict } from '../engine/define-translations';
import { I18nCliConfig } from './config';
import { discover, formatLocation, keyLocations } from './discover';

/** Human-readable line for a key conflict, with `file:line` of each definition when known. */
export function describeConflict(c: KeyConflict, locations: readonly string[] = []): string {
  const scopes = [...new Set(c.scopes)];
  const where = `scope${scopes.length > 1 ? 's' : ''} ${scopes.map((s) => `'${s}'`).join(', ')}`;
  const what =
    c.kind === 'duplicate'
      ? `${c.key} — defined ${c.scopes.length} times (${where})`
      : `${c.key} — is both a translation and a group of translations (${where})`;
  return locations.length ? `${what}\n     at ${locations.join('\n     at ')}` : what;
}

/**
 * `file:line` of each static definition of a full key. Problems on the executed
 * registry are mapped back to source this way; keys that cannot be read
 * statically (spreads, references) simply have no location.
 */
export function createKeyLocator(config: I18nCliConfig): (key: string) => string[] {
  try {
    const index = keyLocations(discover(config).modules);
    return (key) => (index.get(key) ?? []).map((loc) => formatLocation(loc, config.cwd));
  } catch {
    return () => [];
  }
}
