# ADR-0006 — Independent versions, scoped tags, script-based release

**Status:** Accepted (2026-11-17)

## Context
`release.mjs` only bumped ng-daisyui and tagged `vX.Y.Z`; i18n had no release path. Releases are made by one
maintainer; CHANGELOGs are curated by hand per package ("Unreleased" section).

## Decision
- Each package has its own version and CHANGELOG; releasing one never touches the other.
- `npm run release -- <ui|i18n> <patch|minor|major>`: clean-tree check, bump, commit, annotated tag
  **`<npm-name>@<version>`** (e.g. `@hakistack/i18n@0.1.1`), build, validate. Never pushes or publishes.
- `npm run publish:<id>` / `release.yml`: publishes from `dist/` only if the artifact validates, HEAD carries the tag
  and the version is not on npm; `--provenance` in GitHub Actions.
- Existing `v0.2.1`…`v0.3.0` tags stay (they are ng-daisyui releases).

## Alternatives
- **Changesets** — standard for multi-contributor monorepos (PR-level changeset files, generated changelogs). Deferred:
  it needs npm workspaces for discovery and `changeset publish` publishes the source folder, not `dist/`, so it would
  need custom glue for little gain with one maintainer. Adopt when outside contributors send regular PRs; tag format
  is already Changesets-compatible.
- **semantic-release / conventional-commit automation** — commits here are not consistently conventional across
  products; automated bumps would mis-version.

## Consequences
No version changes or publishes happened during the migration. First releases under this scheme: ng-daisyui (ships
the schematics fix, audit C2) and i18n (ships the corrected repository metadata, audit C4).
