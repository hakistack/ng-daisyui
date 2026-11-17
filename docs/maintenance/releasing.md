# Releasing

`@hakistack/ng-daisyui` and `@hakistack/i18n` are versioned and released independently (ADR-0006). Releasing one
never bumps, builds or publishes the other. Package ids: `ui`, `i18n`.

## Procedure

```bash
# 0. clean tree on an up-to-date main; the package's CHANGELOG "Unreleased" moved under the new version heading
npm run release -- i18n patch          # bump + commit + tag @hakistack/i18n@0.1.1 + build + validate (no push, no publish)
npm run test:consumer:i18n             # packed tarball in a clean app
git push --follow-tags
```

Then publish, either:

- **GitHub (preferred, adds npm provenance):** Actions → *Release* → Run workflow → ref = the tag
  (`@hakistack/i18n@0.1.1`), package = `i18n`, untick *dry run*.
- **Locally:** `npm run publish:i18n` (try `npm run publish:i18n -- --dry-run` first; `-- --tag next` for a pre-release).

`publish.mjs` refuses unless the artifact validates, HEAD carries `<name>@<version>`, and that version is not on npm.

## Versioning

SemVer per package. Pre-1.0: breaking changes bump the minor, everything else the patch. Peer ranges name tested
majors (`^21.0.0`); supporting a new Angular major is its own minor. Deprecations and breaking changes follow the
[maintainer guide](maintainer-guide.md#api-stability).

## Tags

`<npm-name>@<version>`, annotated, created by `npm run release`. Older ng-daisyui releases used `vX.Y.Z`
(`v0.2.1`…`v0.3.0`); those tags stay.

## One-time setup

- Repository secret `NPM_TOKEN`: npm automation token with publish rights on `@hakistack`.
- Optional: a GitHub environment named `npm` with required reviewers (the workflow already targets it).
- Branch protection on `main`: require the `ci-ok` check.

## If a release goes wrong

npm versions cannot be re-published. `npm deprecate @hakistack/<pkg>@<version> "<reason>"`, fix, release the next
patch. Delete a wrong *unpublished* tag with `git tag -d <tag> && git push --delete origin <tag>`.
