# ADR-0010 — Peer ranges are bound to the majors we test

**Status:** Accepted, applied (2026-11-17, M9)

## Context

Four peers were open-ended (`>=`): `@hakistack/i18n` declared `@angular/common`, `@angular/core` `>=21.0.0` and
`rxjs` `>=7.8.0`; `@hakistack/ng-daisyui` declared the optional `@anthropic-ai/sdk` `>=0.133.0` and `ts-morph`
`>=20.0.0`. An open-ended range tells npm that every future major works: npm will not warn when a consumer moves to
Angular 22 or rxjs 8, although nobody has built against them. The two packages also disagreed for the same peers
(ng-daisyui already used `^21.0.0` / `^7.8.0`).

## Decision

Every peer range names the majors that have actually been exercised. Widening a range is a deliberate change made
together with a test against the new major.

| Package    | Peer                               | Before      | After              | Evidence                                                                                                                             |
| ---------- | ---------------------------------- | ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| i18n       | `@angular/common`, `@angular/core` | `>=21.0.0`  | `^21.0.0`          | workspace + `test:consumer:i18n` run Angular 21                                                                                      |
| i18n       | `rxjs`                             | `>=7.8.0`   | `^7.8.0`           | same; rxjs 8 is unreleased                                                                                                           |
| ng-daisyui | `@anthropic-ai/sdk` (optional)     | `>=0.133.0` | `>=0.133.0 <2.0.0` | `lib/utils/claude-json.ts` typechecks (strict) and returns the same parsed reply and 401 message against 0.133.0 and 1.9.0 (current) |
| ng-daisyui | `ts-morph` (optional)              | `>=20.0.0`  | `>=20.0.0 <29.0.0` | the `migrate-table-columns` spec (12 tests) passes on ts-morph 20, 24, 26, 27 and 28 (current)                                       |

`npm run validate:<id>` now fails on any `>=` peer without an upper bound (it only warned before), so a new
open-ended range cannot ship.

## Alternatives

- **Keep `>=`** — fewer peer warnings for early adopters of a new major, but the warning is the point: an untested
  major should be visible to the consumer, and Angular libraries compiled for one major are not guaranteed to work
  on the next.
- **`^0.133.0` for the SDK** — for a 0.x package a caret means 0.133.x only and would have rejected the SDK's current
  1.x line, which works.

## Consequences

- Consumers on an untested major get an npm peer warning (or an `ERESOLVE` with `strict-peer-deps`) instead of silent
  acceptance.
- Each Angular major upgrade bumps the peers of both packages in the same change as the workspace upgrade.
- Ships with each package's next release (M10); the published 0.3.0 / 0.1.0 keep their old ranges.
