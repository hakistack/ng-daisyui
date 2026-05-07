# Changelog

## 0.1.77

### Bug fixes

- **fix(table)**: emit `globalSearchChange` only on genuine user-driven changes —
  initial mount no longer triggers a phantom event. Fixes duplicate first-load
  calls in server-side cursor-paginated consumers that load data both in
  `ngOnInit` and in `(globalSearchChange)`. `clearGlobalSearch()` is now also a
  no-op when called from an already-empty state.
