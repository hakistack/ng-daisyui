# Table engine — TS bridge to `@hakistack/engine`

Lazy-loaded TypeScript surface for the WASM table engine. Five files:

| File | Role |
|------|------|
| `table-engine.types.ts` | Public TS types (`FilterDef`, `SortDef`, `AggFn`, `GroupNode`, …) keyed on field names |
| `table-handle.ts` | `TableHandle<T>` — wraps the WASM `WasmDataset`, translates names ↔ ids, returns indices and resolved row arrays |
| `table-engine.service.ts` | Angular service: lazy-loads the engine, exposes `createDataset` |
| `table-engine-config.ts` | `HK_TABLE_ENGINE_WASM_URL` injection token + `provideTableEngineWasmUrl(url)` provider |
| `table-engine-routing.ts` | Pure helpers that translate the table component's filter/sort shapes into the engine's wire format and report engine-eligibility |

The shared module loader (`loadEngineModule()`, used by all four engine services — table / tree / fuzzy / pdf-search) lives one level up at `lib/utils/engine-loader.ts` since it isn't table-specific.

## How WASM gets to the browser

**By default the WASM is shipped inside the library.** `scripts/build-wasm.mjs`
emits two TS files alongside the wasm-pack output:

- `lib/wasm/engine_wasm_glue.ts` — the wasm-pack glue (`engine_wasm.js`) with `// @ts-nocheck` so ng-packagr will bundle it
- `lib/wasm/engine_wasm_inline.ts` — `export const ENGINE_WASM_BASE64 = '...'` (the `.wasm` binary base64-encoded, ~580 KB)

`utils/engine-loader.ts` dynamic-imports both at runtime, decodes the base64 → `Uint8Array`, and passes it straight to the glue's `default(bytes)` initializer. **No HTTP fetch, no `public/` folder copy, no deployment config.** Vercel / Netlify / GitHub Pages / a static `nginx` — they all just work.

ng-packagr emits the inline bundle and the glue as their own FESM chunks
(`hakistack-ng-daisyui-engine_wasm_*-<hash>.mjs`), so the consumer's bundler
can lazy-load them. Apps that never trigger an engine-routed feature don't
pay the ~580 KB at startup.

### Opt-out: load WASM as a separate file

When you'd rather have the binary as a separately cacheable HTTP asset (e.g.
behind a CDN, content-hashed for long-term caching), set the URL token:

```ts
import { provideTableEngineWasmUrl } from '@hakistack/ng-daisyui';

bootstrapApplication(AppComponent, {
  providers: [
    provideTableEngineWasmUrl('/wasm/engine_wasm.js'),
  ],
});
```

Then copy the WASM files from the package into your hosted folder:

```
my-app/
├── public/
│   └── wasm/
│       ├── engine_wasm.js          # ~40 KB
│       └── engine_wasm_bg.wasm     # ~430 KB
```

The `default()` initializer fetches the `.wasm` binary as a sibling of the
`.js` URL, so they must live together.

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
APIs that don't work in jsdom.

End-to-end coverage of the bridge belongs in:

- A demo app that exercises `TableHandle` with real data, OR
- A Playwright e2e test against a running demo, OR
- A separate `--target nodejs` wasm-pack bundle for vitest

Until one of those is wired up, treat the bridge as "compiles cleanly,
matches the documented type shapes" — the bytes-on-wire correctness is
enforced by the Rust side's serde round-trips.
