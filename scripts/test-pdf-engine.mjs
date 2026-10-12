#!/usr/bin/env node
/**
 * Integration test for the PDF engine WASM (PDFium + the `pdf-engine` crate):
 * the exact binaries the viewer's worker runs, driven from Node.
 *
 * Covers AcroForm checkbox/radio round-trips, which unit tests can't reach:
 * per-widget writes by annotation index, real on-state names ("On", option
 * names; not a hard-coded "Yes"), `/TU` alternate names, and that saved bytes
 * reopen with the same state. These broke silently before (every radio read
 * as checked; selecting any option selected the first one; non-"Yes"
 * checkboxes never persisted).
 *
 * Requires the built inputs (skips with a notice when missing):
 *   - `npm run pdfium:fetch` → engine/pdfium/pdfium.{js,wasm}
 *   - `npm run engine:build` → src/lib/wasm/pdf/pdf_engine{.js,_bg.wasm}
 */
import { build } from 'esbuild';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'projects/hakistack/ng-daisyui/src/lib');
const inputs = {
  glue: join(lib, 'wasm/pdf/pdf_engine.js'),
  engineWasm: join(lib, 'wasm/pdf/pdf_engine_bg.wasm'),
  pdfium: join(lib, 'components/pdf-viewer/engine/pdfium/pdfium.js'),
  pdfiumWasm: join(lib, 'components/pdf-viewer/engine/pdfium/pdfium.wasm'),
};
const missing = Object.values(inputs).filter((p) => !existsSync(p));
if (missing.length) {
  console.log('⏭  test-pdf-engine: skipped — missing inputs (run `npm run pdfium:fetch` and `npm run engine:build`):');
  for (const m of missing) console.log(`     ${m.replace(root + '/', '')}`);
  process.exit(0);
}

/** A one-page AcroForm: radio group `choice` (options a/b/c, /TU on the parent)
 *  and a merged field/widget checkbox `agree` whose on-state is "On". */
function makeFormPdf() {
  const widget = (x, state) =>
    `<< /Type /Annot /Subtype /Widget /Parent 10 0 R /F 4 /Rect [${x} 100 ${x + 12} 112] /AS /Off ` +
    `/AP << /N << /${state} 11 0 R /Off 12 0 R >> >> >>`;
  const on = '0 0 0 rg 2 2 8 8 re f';
  const objs = {
    1: '<< /Type /Catalog /Pages 2 0 R /AcroForm 5 0 R >>',
    2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Annots [6 0 R 7 0 R 8 0 R 9 0 R] /Resources << >> >>',
    5: '<< /Fields [10 0 R 9 0 R] >>',
    6: widget(20, 'a'),
    7: widget(60, 'b'),
    8: widget(100, 'c'),
    9:
      '<< /Type /Annot /Subtype /Widget /FT /Btn /T (agree) /F 4 /V /Off /AS /Off /Rect [20 50 32 62] ' +
      '/AP << /N << /On 11 0 R /Off 12 0 R >> >> >>',
    10: '<< /FT /Btn /Ff 49152 /T (choice) /TU (Pick one option) /V /Off /Kids [6 0 R 7 0 R 8 0 R] >>',
    11: `<< /Type /XObject /Subtype /Form /BBox [0 0 12 12] /Length ${on.length} >>\nstream\n${on}\nendstream`,
    12: '<< /Type /XObject /Subtype /Form /BBox [0 0 12 12] /Length 0 >>\nstream\n\nendstream',
  };
  let out = '%PDF-1.7\n';
  const offsets = {};
  for (const n of Object.keys(objs).map(Number)) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }
  const size = 13;
  const xref = out.length;
  out += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++) {
    out += offsets[n] !== undefined ? `${String(offsets[n]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  }
  out += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

// Bundle the glue + both wasm binaries the same way the worker build does.
const dir = mkdtempSync(join(tmpdir(), 'hk-pdf-engine-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export { default as initPdfEngine, initialize_pdfium_render, open, form_fields, set_field_value, save_document } from ${JSON.stringify(inputs.glue)};
export { default as createPdfiumModule } from ${JSON.stringify(inputs.pdfium)};
export { default as pdfEngineWasm } from ${JSON.stringify(inputs.engineWasm)};
export { default as pdfiumWasm } from ${JSON.stringify(inputs.pdfiumWasm)};`,
);
const outfile = join(dir, 'engine.bundle.mjs');
await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  loader: { '.wasm': 'binary' },
  outfile,
  logLevel: 'error',
  // The vendored PDFium build targets web/worker; present a worker-like global.
  banner: {
    js:
      "import{createRequire}from'module';const require=createRequire(import.meta.url);" +
      'globalThis.self??=globalThis;globalThis.WorkerGlobalScope??=function(){};' +
      "Uint8Array.fromBase64??=(s)=>new Uint8Array(Buffer.from(s,'base64'));",
  },
});

let failures = 0;
try {
  const e = await import(pathToFileURL(outfile).href);
  const [pdfium, ours] = await Promise.all([
    e.createPdfiumModule({ wasmBinary: e.pdfiumWasm, locateFile: (p) => p }),
    e.initPdfEngine({ module_or_path: e.pdfEngineWasm }),
  ]);
  if (!e.initialize_pdfium_render(pdfium, ours, false)) throw new Error('initialize_pdfium_render failed');

  // Row layout: [name, type, x, y, w, h, value, readOnly, checked, options, annotIndex, exportValue, alternateName]
  const fields = (h) =>
    e
      .form_fields(h, 0)
      .map(([name, type, , , , , value, , checked, , idx, exp, alt]) => ({ name, type, value, checked: checked === 1, idx, exp, alt }));
  const radios = (h) => fields(h).filter((f) => f.type === 'radio');
  const box = (h) => fields(h).find((f) => f.type === 'checkbox');
  const reopen = (h) => e.open(e.save_document(h), undefined);
  const check = (label, cond) => {
    console.log(`${cond ? '✓' : '✗'} ${label}`);
    if (!cond) failures++;
  };
  const states = (h) =>
    radios(h)
      .map((r) => (r.checked ? 1 : 0))
      .join('');

  let h = e.open(makeFormPdf(), undefined);
  check(
    'radio export values are the on-state names',
    radios(h)
      .map((r) => r.exp)
      .join() === 'a,b,c',
  );
  check('no radio reads as checked when /V and /AS are Off', states(h) === '000');
  check('checkbox reads unchecked initially', !box(h).checked);
  check(
    'radio widgets inherit the parent /TU alternate name',
    radios(h).every((r) => r.alt === 'Pick one option'),
  );

  e.set_field_value(h, 0, radios(h).find((r) => r.exp === 'b').idx, 'choice', 'true');
  e.set_field_value(h, 0, box(h).idx, 'agree', 'true');
  check('selecting option b checks only b (live)', states(h) === '010');
  h = reopen(h);
  check('option b persists through save', states(h) === '010' && radios(h)[0].value === 'b');
  check('checkbox with on-state "On" persists through save', box(h).checked);

  e.set_field_value(h, 0, radios(h).find((r) => r.exp === 'c').idx, 'choice', 'true');
  e.set_field_value(h, 0, box(h).idx, 'agree', 'false');
  h = reopen(h);
  check('switching to option c persists through save', states(h) === '001');
  check('unchecking the checkbox persists through save', !box(h).checked);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failures === 0 ? '\n✓ pdf-engine form round-trips OK' : `\n✗ ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
