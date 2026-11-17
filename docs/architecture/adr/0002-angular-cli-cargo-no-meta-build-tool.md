# ADR-0002 — Angular CLI + Cargo + root npm scripts; no Nx / Turborepo

**Status:** Accepted (2026-11-17)

## Context
Two Angular libraries, two Angular apps, one Cargo workspace. Requirements: build one product or all, incremental
builds, correct order, selective CI, independent publishing, Rust only when needed.

| Need | Angular CLI + Cargo + npm scripts | + Nx | Turborepo |
|---|---|---|---|
| Angular library builds | native (ng-packagr) | wraps the same builders | runs npm scripts |
| Incremental / cache | `.angular/cache`, ng-packagr, Cargo `target/` | + task cache (local/remote) | + task cache |
| Dependency graph | 2 independent libs; graph is trivial and documented | inferred project graph | from package.json workspaces |
| Selective CI | path filters per product (ADR-0008) | `nx affected` | `--filter=[base]` |
| Rust | Cargo | community plugin | runs scripts |
| Independent publish | release/publish scripts (ADR-0006) | `nx release` | external (Changesets) |
| Cost | none new | new config, daemon, migrations on every Angular major | needs npm workspaces for every package |

## Decision
Keep Angular CLI for Angular builds, Cargo for Rust, and root npm scripts named `<verb>:<product>` as the single entry
point. No meta-build tool.

## Alternatives
Nx and Turborepo were weighed as above. Their main gain — task caching and `affected` — is worth little with two
independent libraries whose builds take 2–20 s; path-filtered CI covers `affected`.

## Consequences / revisit when
Revisit Nx if any of these becomes true: ≥4 interdependent packages; CI wall time dominated by rebuilding unchanged
products; a product graph deep enough that build order matters. Adopting it later is additive (it reads `angular.json`).
