# Table engine — TS bridge to `@hakistack/engine`

Lazy-loaded TypeScript surface for the WASM table engine. Five files:

| File | Role |
|------|------|
| `table-engine.types.ts` | Public TS types (`FilterDef`, `SortDef`, `AggFn`, `GroupNode`, …) keyed on field names |
| `table-handle.ts` | `TableHandle<T>` — wraps the WASM `WasmDataset`, translates names ↔ ids, returns indices and resolved row arrays |
| `table-engine.service.ts` | Angular service: lazy `import()` of the wasm-pack bundle, runs `default()` initializer, exposes `createDataset` |
| `table-engine-config.ts` | `HK_TABLE_ENGINE_WASM_URL` injection token + `provideTableEngineWasmUrl(url)` provider |
| `table-engine-routing.ts` | Pure helpers that translate the table component's filter/sort shapes into the engine's wire format and report engine-eligibility |

## Hosting the WASM bundle

The WASM glue (`engine_wasm.js`) and binary (`engine_wasm_bg.wasm`) must be served from the same URL prefix. Default is **`/engine_wasm.js`** (root-level), so consumers copy both files into Angular's `public/` folder:

```
my-app/
├── public/
│   ├── engine_wasm.js          # 29 KB
│   └── engine_wasm_bg.wasm     # 295 KB release / 1.3 MB dev
```

To use a different URL (e.g. CDN, sub-path):

```ts
import { provideTableEngineWasmUrl } from '@hakistack/ng-daisyui';

bootstrapApplication(AppComponent, {
  providers: [
    provideTableEngineWasmUrl('/static/wasm/engine_wasm.js'),
  ],
});
```

The `default()` initializer fetches the `.wasm` binary as a sibling of the `.js` URL, so they must live together.

## Quick start

```ts
import { TableEngineService } from '@hakistack/ng-daisyui';

@Component({ ... })
class MyTable {
  private engine = inject(TableEngineService);
  private handle?: TableHandle<MyRow>;

  async ngOnInit() {
    this.handle = await this.engine.createDataset(this.rows, [
      { field: 'name',   kind: 'text' },
      { field: 'age',    kind: 'number' },
      { field: 'active', kind: 'bool' },
      { field: 'joined', kind: 'date' },
    ]);
  }

  search(term: string) {
    const indices = this.handle!.filter([
      { kind: 'text', field: 'name', op: { kind: 'contains', needle: term } },
    ]);
    const sorted = this.handle!.sort(indices, [
      { field: 'age', direction: 'asc' },
    ]);
    this.visibleRows = this.handle!.rowsAt(sorted);
  }

  ngOnDestroy() {
    this.handle?.dispose();
  }
}
```

## Marshalling principle

Row payloads cross the JS↔WASM boundary **once**, in `createDataset`. Every
subsequent query (filter, sort, group, aggregate) takes a small JSON-shaped
payload and returns a `Uint32Array` of row indices. The handle resolves
indices back into row objects against the original array — no per-keystroke
serialization of row payloads.

## Testing

The Rust kernels are exhaustively unit-tested under `hakistack-engine/`
(`npm run engine:test`, currently 95+ tests). The wire-format conversions
have round-trip serde tests. The full TS↔WASM integration is **not** unit
tested in vitest because the wasm-pack `--target web` bundle uses browser-only
APIs (`fetch`, `URL`) that don't work in jsdom.

End-to-end coverage of the bridge belongs in:

- A demo app that exercises `TableHandle` with real data, OR
- A Playwright e2e test against a running demo, OR
- A separate `--target nodejs` wasm-pack bundle for vitest

Until one of those is wired up, treat the bridge as "compiles cleanly,
matches the documented type shapes" — the bytes-on-wire correctness is
enforced by the Rust side's serde round-trips.

## How the dynamic import works

`table-engine.service.ts` loads the WASM module via a **variable URL**:

```ts
const url = inject(HK_TABLE_ENGINE_WASM_URL);  // injected at runtime
const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ url);
await mod.default();
```

Two reasons the URL is injected, not hardcoded:

1. **ng-packagr's static analyzer.** A literal `import('./wasm/engine_wasm')` would force ng-packagr to resolve the path at library-build time, which fails when the WASM bundle hasn't been generated yet. A variable URL with the bundler-skip comments bypasses static resolution entirely.
2. **Deployment flexibility.** Apps deploy assets in different shapes (root `public/`, sub-path, CDN, content-hashed filenames). Letting the consumer set the URL via `provideTableEngineWasmUrl(...)` is cleaner than baking a path into the published library.

`scripts/build-wasm.mjs` copies the bundle into:

- `projects/hakistack/ng-daisyui/src/lib/wasm/` — canonical, ships in the published package
- `projects/demo/public/` and `projects/demo-v4/public/` — dev convenience so `ng serve` finds `/engine_wasm.js`
