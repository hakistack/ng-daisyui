# ADR-0008 — Path-filtered CI per product with one aggregate check

**Status:** Accepted (2026-11-17)

## Decision
`ci.yml` starts with a `changes` job (`dorny/paths-filter@v3`) whose path groups mirror
`scripts/workspace/products.mjs`. Jobs: `lint` (always; fast, repo-wide incl. boundaries), `ui`, `i18n`, `docs`,
`e2e`, `rust`, `libheif` (non-blocking). A product job runs when its paths, a dependency's paths or shared config
change; pushes to `main` run everything. `ci-ok` (`if: always()`) fails when any job failed or was cancelled and treats
skipped jobs as success — it is the only check branch protection needs, so skipped jobs never block a PR.

## Alternatives
Separate workflows with `on.paths` (required checks stay "pending" when skipped); `nx affected` (ADR-0002); a custom
diff script (the action is the maintained standard).

## Consequences
An i18n-only PR runs lint + i18n (≈2 min) instead of the whole matrix with Playwright on three browsers; an
engine-only PR runs only Rust. New products add a path group and a job.
