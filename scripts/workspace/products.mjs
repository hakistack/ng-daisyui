/**
 * The products of the Hakistack monorepo — one list read by the boundary check, the release and
 * publish scripts and the docs. Adding a product means adding an entry here (and its Angular /
 * Cargo project); nothing else in the tooling hard-codes the list.
 *
 * `paths` are the repo-relative globs that belong to a product. CI uses the same globs in
 * `.github/workflows/ci.yml` (`changes` job) to run only the affected jobs — keep them in sync.
 */

/** @typedef {'npm-angular-library' | 'rust-workspace' | 'app'} ProductKind */

/**
 * @typedef {object} NpmPackage
 * @property {string} id            short id used in script names (`build:<id>`, `release -- <id>`)
 * @property {string} name          npm name — never changes
 * @property {ProductKind} kind
 * @property {string} root          source root (contains the source package.json)
 * @property {string} dist          ng-packagr output, the directory that gets published
 * @property {string} consumer      template app for the packed-artifact test (scripts/consumer-smoke.mjs)
 * @property {string[]} sourceDirs  directories (under root) that ship in the package
 * @property {Record<string, string[]>} hostProvided  imports a sub-area may use without declaring
 *   them, because the host tool that runs it supplies them (Angular CLI for schematics, …)
 */

/** @type {NpmPackage[]} */
export const packages = [
  {
    id: 'ui',
    name: '@hakistack/ng-daisyui',
    kind: 'npm-angular-library',
    root: 'projects/hakistack/ng-daisyui',
    dist: 'dist/hakistack/ng-daisyui',
    consumer: 'tests/consumer-smoke',
    sourceDirs: ['src', 'schematics'],
    hostProvided: {
      // `ng add` / `ng update` run inside the consumer's Angular CLI, which brings these.
      schematics: ['@angular-devkit/schematics', '@angular-devkit/core', '@schematics/angular', 'typescript'],
    },
  },
  {
    id: 'i18n',
    name: '@hakistack/i18n',
    kind: 'npm-angular-library',
    root: 'projects/hakistack/i18n',
    dist: 'dist/hakistack/i18n',
    consumer: 'tests/consumer-smoke-i18n',
    sourceDirs: ['src', 'engine', 'cli', 'schematics'],
    hostProvided: {
      schematics: ['@angular-devkit/schematics', '@angular-devkit/core', '@schematics/angular', 'typescript'],
    },
  },
];

/** Private (unpublished) parts of the repo, for the docs and the dependency graph. */
export const internal = [
  { id: 'engine', kind: 'rust-workspace', root: 'hakistack-engine', consumers: ['ui'] },
  { id: 'docs', kind: 'app', root: 'projects/demo', consumers: [] },
  { id: 'docs-v4', kind: 'app', root: 'projects/demo-v4', consumers: [] },
  { id: 'shared-demos', kind: 'app', root: 'projects/shared-demos', consumers: ['docs', 'docs-v4'] },
];

export function getPackage(id) {
  const pkg = packages.find((p) => p.id === id || p.name === id);
  if (!pkg) {
    const known = packages.map((p) => `${p.id} (${p.name})`).join(', ');
    throw new Error(`Unknown package "${id}". Known packages: ${known}`);
  }
  return pkg;
}
