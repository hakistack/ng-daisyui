#!/usr/bin/env node
/**
 * Integration test for the PDF engine WASM (PDFium + the `pdf-engine` crate):
 * the exact binaries the viewer's worker runs, driven from Node.
 *
 * Part 1 covers AcroForm checkbox/radio round-trips, which unit tests can't reach:
 * per-widget writes by annotation index, real on-state names ("On", option
 * names; not a hard-coded "Yes"), `/TU` alternate names, and that saved bytes
 * reopen with the same state. These broke silently before (every radio read
 * as checked; selecting any option selected the first one; non-"Yes"
 * checkboxes never persisted).
 *
 * Part 2 runs the real worker bundle (pdfium.worker.ts, exactly what the
 * browser loads) in a worker_threads thread and checks the message protocol:
 * priority ordering, barriers, cancellation of queued renders, and the batched
 * pageSizes / pagesText requests.
 *
 * Part 3 checks hk-pdf-writer against PDFium: documents saved incrementally
 * by our own writer must reopen in PDFium with the edit visible and every page
 * still rendering. Set PDF_CORPUS to a directory of real-world PDFs to run the
 * same round-trip over each of them (and `pdfinfo`, when Poppler is installed).
 *
 * Requires the built inputs (skips with a notice when missing):
 *   - `npm run pdfium:fetch` → engine/pdfium/pdfium.{js,wasm}
 *   - `npm run engine:build` → src/lib/wasm/pdf/pdf_engine{.js,_bg.wasm}
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
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

/** An N-page PDF where page i (1-based) shows the text "Page i" in Helvetica. */
function makeTextPdf(pageCount) {
  const objs = {
    // Page labels: i, ii, then decimal from 1 (an index restarts numbering).
    1: '<< /Type /Catalog /Pages 2 0 R /PageLabels << /Nums [0 << /S /r >> 2 << /S /D >>] >> >>',
    3: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  };
  const kids = [];
  for (let i = 0; i < pageCount; i++) {
    const pageObj = 10 + i * 2;
    const content = `BT /F1 18 Tf 40 100 Td (Page ${i + 1}) Tj ET`;
    objs[pageObj] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${300 + i * 10} 200] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${pageObj + 1} 0 R >>`;
    objs[pageObj + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    kids.push(`${pageObj} 0 R`);
  }
  objs[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`;
  return serializePdf(objs);
}

function serializePdf(objs) {
  let out = '%PDF-1.7\n';
  const offsets = {};
  const nums = Object.keys(objs)
    .map(Number)
    .sort((a, b) => a - b);
  for (const n of nums) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objs[n]}\nendobj\n`;
  }
  const size = nums[nums.length - 1] + 1;
  const xref = out.length;
  out += `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let n = 1; n < size; n++) {
    out += offsets[n] !== undefined ? `${String(offsets[n]).padStart(10, '0')} 00000 n \n` : '0000000000 65535 f \n';
  }
  out += `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

/**
 * Prepended to the worker bundle: presents worker_threads as a dedicated
 * worker (self, onmessage, postMessage) and stubs the two browser APIs the
 * render path needs. The bitmap stub is a plain object so it can be cloned.
 */
const WORKER_SHIM = `
import { parentPort } from 'node:worker_threads';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.self = globalThis;
globalThis.WorkerGlobalScope ??= function () {};
Uint8Array.fromBase64 ??= (s) => new Uint8Array(Buffer.from(s, 'base64'));
globalThis.postMessage = (message) => parentPort.postMessage(message);
parentPort.on('message', (data) => globalThis.onmessage?.({ data }));
globalThis.ImageData = class { constructor(data, width, height) { this.data = data; this.width = width; this.height = height; } };
globalThis.createImageBitmap = async (img) => ({ width: img.width, height: img.height });
`;

// Bundle the glue + both wasm binaries the same way the worker build does.
const dir = mkdtempSync(join(tmpdir(), 'hk-pdf-engine-'));
const entry = join(dir, 'entry.mjs');
writeFileSync(
  entry,
  `export { default as initPdfEngine, initialize_pdfium_render, open, close, page_count, document_title, page_text, page_links, form_fields, set_field_value, set_hidden_annotations, save_document, render, render_tile } from ${JSON.stringify(inputs.glue)};
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
const check = (label, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures++;
};
try {
  console.log('forms');
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

  // ── Tiles: a tile must match the same region of a full render pixel-for-pixel ──
  console.log('\ntiles');
  const doc = e.open(makeTextPdf(1), undefined);
  const [fullW, fullH, full] = e.render(doc, 0, 600);
  const tile = { x: 37, y: 150, w: 210, h: 60 }; // the "Page 1" glyphs sit around y 165–200 at this scale
  const [tw, th, tilePx] = e.render_tile(doc, 0, fullW, fullH, tile.x, tile.y, tile.w, tile.h);
  check('a tile has the requested size', tw === tile.w && th === tile.h);
  let maxDiff = 0;
  let inked = 0;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const t = (y * tw + x) * 4;
      const f = ((tile.y + y) * fullW + tile.x + x) * 4;
      for (let c = 0; c < 3; c++) maxDiff = Math.max(maxDiff, Math.abs(tilePx[t + c] - full[f + c]));
      if (tilePx[t] < 128) inked++;
    }
  }
  check(`the tile matches the full render (max channel difference ${maxDiff})`, maxDiff <= 1);
  check('the tile actually contains the page text', inked > 50);

  // ── Part 3: hk-pdf-writer output must reopen in PDFium ─────────────────
  console.log('\nwriter (incremental save → PDFium)');
  const writerEntry = join(dir, 'writer-entry.ts');
  writeFileSync(
    writerEntry,
    `export * from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/pdf-writer/index.ts'))};
export { readAnnotations, writeAnnotationChanges } from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/annotations/annotation-io.ts'))};
export { encodePng } from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/annotations/images.ts'))};
export { calibrate } from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/annotations/measure.ts'))};
export { readForm } from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/forms/form-reader.ts'))};
export { writeDocumentChanges } from ${JSON.stringify(join(lib, 'components/pdf-viewer/core/forms/document-writer.ts'))};`,
  );
  const writerBuild = await build({
    entryPoints: [writerEntry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    logLevel: 'error',
  });
  const writerFile = join(dir, 'writer.mjs');
  writeFileSync(writerFile, writerBuild.outputFiles[0].text);
  const w = await import(pathToFileURL(writerFile).href);
  const pdfinfo = spawnSync('pdfinfo', ['-v']).error ? null : 'pdfinfo';

  /** Edit /Info and append a square annotation to page 1, save incrementally, reopen in PDFium. */
  const roundTrip = async (label, original) => {
    const before = e.open(original, undefined);
    const pages = e.page_count(before);
    e.close(before);

    const doc = await w.PdfDoc.load(original);
    const title = `hk-pdf-writer ✓ ${label}`;
    await doc.setInfo({ Title: title });
    const [first] = await doc.pages();
    const annot = doc.add(
      new w.PdfDict({
        Type: w.PdfName.of('Annot'),
        Subtype: w.PdfName.of('Square'),
        Rect: [10, 10, 60, 40],
        C: [1, 0, 0],
        F: 4,
        P: first.ref,
      }),
    );
    const page = first.dict.clone();
    const annots = await doc.resolve(page.get('Annots'));
    page.set('Annots', [...(Array.isArray(annots) ? annots : []), annot]);
    doc.update(first.ref, page);
    const saved = await w.saveIncremental(doc);

    const prefixIntact = Buffer.from(saved.subarray(0, original.length)).equals(Buffer.from(original));
    const h = e.open(saved, undefined);
    const ok = e.document_title(h) === title && e.page_count(h) === pages;
    let rendered = true;
    for (let i = 0; i < pages && rendered; i++) rendered = e.render(h, i, 60)[0] === 60;
    e.close(h);
    check(`${label}: original bytes kept, PDFium reads the new title, ${pages} page(s) render`, prefixIntact && ok && rendered);
    if (pdfinfo) {
      const file = join(dir, 'saved.pdf');
      writeFileSync(file, saved);
      const r = spawnSync(pdfinfo, [file], { encoding: 'utf8' });
      check(
        `${label}: pdfinfo accepts it without errors`,
        r.status === 0 && !/Syntax Error|error/i.test(r.stderr) && r.stdout.includes(title.slice(0, 13)),
      );
    }
  };

  await roundTrip('classic xref', makeTextPdf(3));
  await roundTrip('form document', makeFormPdf());
  // Xref-stream + object-stream input: PDFium writes those itself on save.
  const pdfiumSaved = (() => {
    const h = e.open(makeTextPdf(2), undefined);
    const out = e.save_document(h);
    e.close(h);
    return out;
  })();
  await roundTrip('PDFium-written', pdfiumSaved);
  const corpus = process.env.PDF_CORPUS;
  if (corpus && existsSync(corpus)) {
    for (const name of readdirSync(corpus).filter((f) => f.toLowerCase().endsWith('.pdf'))) {
      try {
        await roundTrip(name, new Uint8Array(readFileSync(join(corpus, name))));
      } catch (err) {
        check(`${name}: ${err.message}`, err instanceof w.PdfUnsupportedError); // encrypted files are skipped, not failures
      }
    }
  }

  // ── Annotations written by hk-pdf-writer, as PDFium paints them ──────────
  console.log('\nannotation appearances (hk-pdf-writer → PDFium)');
  const pixel = (h, page, width, x, y) => {
    const [w, , px] = e.render(h, page, width);
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };
  const isRed = ([r, g, b]) => r > 200 && g < 80 && b < 80;
  const isWhite = ([r, g, b]) => r > 240 && g > 240 && b > 240;
  const square = (page, rect) => ({
    id: 'sq',
    page,
    type: 'rect',
    rect,
    color: '#ff0000',
    fill: '#ff0000',
    strokeWidth: 2,
    opacity: 1,
  });
  for (const rotate of [0, 90]) {
    // MediaBox 300×200 pt; at /Rotate 90 it shows as 200×300. Rendered at 1 px/pt.
    const base = serializePdf({
      1: '<< /Type /Catalog /Pages 2 0 R >>',
      2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      3: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Rotate ${rotate} /Resources << >> >>`,
    });
    const rect = rotate ? { x: 20, y: 200, w: 60, h: 40 } : { x: 100, y: 50, w: 80, h: 60 };
    const saved = await w.writeAnnotationChanges(base, new Map(), [square(0, rect)]);
    const width = rotate ? 200 : 300;
    const inside = [Math.round(rect.x + rect.w / 2), Math.round(rect.y + rect.h / 2)];
    const outside = rotate ? [150, 50] : [20, 150];
    let h = e.open(saved, undefined);
    check(
      `/Rotate ${rotate}: PDFium paints the square where the model put it`,
      isRed(pixel(h, 0, width, ...inside)) && isWhite(pixel(h, 0, width, ...outside)),
    );
    e.set_hidden_annotations(h, Uint32Array.from([0, 0]));
    check(`/Rotate ${rotate}: a hidden annotation is left out of the raster`, isWhite(pixel(h, 0, width, ...inside)));
    const resaved = e.save_document(h);
    e.close(h);
    h = e.open(resaved, undefined);
    check(`/Rotate ${rotate}: hiding is display-only (a PDFium save still shows it)`, isRed(pixel(h, 0, width, ...inside)));
    const [page] = await w.readAnnotations(await w.PdfDoc.load(resaved));
    const back = page.annotations[0]?.annotation;
    check(
      `/Rotate ${rotate}: the annotation reads back after a PDFium save`,
      back?.type === 'rect' && Math.abs(back.rect.x - rect.x) < 0.01 && Math.abs(back.rect.h - rect.h) < 0.01,
    );
    e.close(h);
  }

  // ── Stamps, links and measurements, as PDFium sees them ──────────────────
  console.log('\nstamps, links, measurements (hk-pdf-writer → PDFium)');
  {
    const base = serializePdf({
      1: '<< /Type /Catalog /Pages 2 0 R >>',
      2: '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
      3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << >> >>',
      4: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << >> >>',
    });
    // 2×2 image: red, transparent / green, half-transparent blue.
    const png = await w.encodePng({
      width: 2,
      height: 2,
      rgb: Uint8Array.from([255, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255]),
      alpha: Uint8Array.from([255, 0, 255, 128]),
    });
    const common = { page: 0, opacity: 1, author: 'Harness' };
    const list = [
      {
        ...common,
        id: 'img',
        type: 'stamp',
        name: 'Image',
        color: '#000000',
        rect: { x: 300, y: 50, w: 40, h: 40 },
        stamp: { kind: 'image', data: Buffer.from(png).toString('base64'), mime: 'image/png', width: 2, height: 2 },
      },
      {
        ...common,
        id: 'txt',
        type: 'stamp',
        name: 'Approved',
        color: '#1d4ed8',
        rect: { x: 50, y: 50, w: 160, h: 46 },
        stamp: { kind: 'text', text: 'APPROVED', shape: 'rect' },
      },
      {
        ...common,
        id: 'uri',
        type: 'link',
        color: '#2563eb',
        rect: { x: 50, y: 200, w: 100, h: 20 },
        target: { kind: 'uri', uri: 'https://example.com/' },
        strokeWidth: 0,
      },
      {
        ...common,
        id: 'pg',
        type: 'link',
        color: '#2563eb',
        rect: { x: 50, y: 240, w: 100, h: 20 },
        target: { kind: 'page', page: 1 },
        strokeWidth: 0,
      },
      {
        ...common,
        id: 'dist',
        type: 'line',
        color: '#1d4ed8',
        rect: { x: 50, y: 300, w: 144, h: 0 },
        points: [50, 300, 194, 300],
        strokeWidth: 2,
        startEnding: 'Butt',
        endEnding: 'Butt',
        fill: null,
        measure: { kind: 'distance', scale: w.calibrate(1, 'in', 10, 'ft') },
      },
    ];
    const saved = await w.writeAnnotationChanges(base, new Map(), list);
    const h = e.open(saved, undefined);
    const px = (x, y) => pixel(h, 0, 600, x, y);
    const near = (p, rgb, tol = 40) => p.every((c, i) => Math.abs(c - rgb[i]) <= tol);
    check('image stamp: opaque pixels paint', near(px(310, 60), [255, 0, 0]) && near(px(310, 80), [0, 255, 0]));
    check('image stamp: the soft mask keeps transparent pixels see-through', isWhite(px(330, 60)));
    check('image stamp: half-transparent pixels blend with the page', near(px(330, 80), [127, 127, 255], 50));
    const frame = px(51, 73);
    check('text stamp: the frame paints in its colour', frame[2] > frame[0] + 60);
    const line = px(120, 300);
    check('distance measurement: the line paints', line[2] > line[0] + 60);
    const links = e.page_links(h, 0).map(([x, y, lw, lh, page, uri]) => ({ x, y, w: lw, h: lh, page, uri }));
    check(
      'links: PDFium resolves the URI and the page destination',
      links.some((l) => l.uri === 'https://example.com/' && Math.abs(l.x - 50) < 1 && Math.abs(l.y - 200) < 1) &&
        links.some((l) => l.page === 1),
    );
    const [page] = await w.readAnnotations(await w.PdfDoc.load(e.save_document(h)));
    check(
      'all of them read back after a PDFium save',
      ['img', 'txt', 'uri', 'pg', 'dist'].every((id) => page.annotations.some((a) => a.annotation.id === id)),
    );
    e.close(h);
  }

  // ── Form values written by hk-pdf-writer, as PDFium reads them ───────────
  console.log('\nform values (hk-pdf-writer → PDFium)');
  {
    const base = makeFormPdf();
    const saved = await w.writeDocumentChanges(base, {
      formValues: new Map([
        ['choice', 'c'],
        ['agree', 'On'],
      ]),
    });
    const h = e.open(saved, undefined);
    check('radio: writing /V on the group and /AS on the widgets selects option c in PDFium', states(h) === '001');
    check('checkbox: on-state "On" reads as checked', box(h).checked);
    e.close(h);
  }
  const corpusForms =
    process.env.PDF_CORPUS && existsSync(process.env.PDF_CORPUS)
      ? readdirSync(process.env.PDF_CORPUS).filter((f) => f.toLowerCase().endsWith('.pdf'))
      : [];
  for (const file of corpusForms) {
    const original = new Uint8Array(readFileSync(join(process.env.PDF_CORPUS, file)));
    let form;
    try {
      form = await w.readForm(await w.PdfDoc.load(original));
    } catch {
      continue;
    }
    const texts = form.model.fields.filter((f) => f.kind === 'text' && !f.readOnly && !f.comb && !f.format).slice(0, 12);
    if (!texts.length) continue;
    const values = new Map(texts.map((f, i) => [f.name, `Value ${i + 1}`]));
    const saved = await w.writeDocumentChanges(original, { formValues: values });
    const h = e.open(saved, undefined);
    const pages = e.page_count(h);
    const read = new Map();
    for (let p = 0; p < pages; p++) for (const f of e.form_fields(h, p)) read.set(f[0], f[6]);
    const matched = texts.filter((f) => read.get(f.name) === values.get(f.name)).length;
    check(
      `${file}: ${form.model.fields.length} fields read; PDFium sees ${matched}/${texts.length} written values`,
      matched === texts.length,
    );
    // The regenerated appearance paints in the first field's box.
    const f0 = texts[0];
    const wd = f0.widgets[0];
    // Rendered at 2 px per point of a letter-size page width.
    const [rw, , rpx] = e.render(h, wd.page, 1224);
    const k = rw / 612;
    let inked = 0;
    for (let y = Math.floor(wd.rect.y); y < wd.rect.y + wd.rect.h; y++) {
      for (let x = Math.floor(wd.rect.x); x < wd.rect.x + wd.rect.w; x++)
        if (rpx[(Math.round(y * k) * rw + Math.round(x * k)) * 4] < 100) inked++;
    }
    check(`${file}: the new appearance of "${f0.name.split('.').pop()}" paints its text`, inked > 10);
    e.close(h);
  }

  // ── Encrypted documents: written by hk-pdf-writer, opened by PDFium ──────
  console.log('\nencryption (hk-pdf-writer ⇄ PDFium)');
  for (const revision of [3, 4, 6]) {
    const enc = new TextEncoder();
    const id0 = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
    const { security, encrypt } = await w.PdfSecurity.create({
      userPassword: 'user',
      ownerPassword: 'owner',
      revision,
      permissions: 0x24,
      id0,
    });
    const content = 'BT /F1 18 Tf 40 100 Td (Encrypted text) Tj ET';
    const objects = [
      [1, new w.PdfDict({ Type: w.PdfName.of('Catalog'), Pages: new w.PdfRef(2, 0) })],
      [2, new w.PdfDict({ Type: w.PdfName.of('Pages'), Kids: [new w.PdfRef(3, 0)], Count: 1 })],
      [
        3,
        new w.PdfDict({
          Type: w.PdfName.of('Page'),
          Parent: new w.PdfRef(2, 0),
          MediaBox: [0, 0, 300, 200],
          Contents: new w.PdfRef(4, 0),
          Resources: new w.PdfDict({ Font: new w.PdfDict({ F1: new w.PdfRef(7, 0) }) }),
        }),
      ],
      [4, new w.PdfStream(new w.PdfDict(), enc.encode(content))],
      [5, new w.PdfDict({ Title: w.PdfString.text('Secret title') })],
      [7, new w.PdfDict({ Type: w.PdfName.of('Font'), Subtype: w.PdfName.of('Type1'), BaseFont: w.PdfName.of('Helvetica') })],
    ];
    const parts = [enc.encode('%PDF-1.7\n')];
    const offsets = {};
    let offset = parts[0].length;
    for (const [num, value] of objects) {
      offsets[num] = offset;
      const bytes = w.serializeIndirectObject(new w.PdfRef(num, 0), await security.encryptObject(num, 0, value));
      parts.push(bytes);
      offset += bytes.length;
    }
    offsets[6] = offset;
    const encBytes = w.serializeIndirectObject(new w.PdfRef(6, 0), encrypt);
    parts.push(encBytes);
    offset += encBytes.length;
    let xref = 'xref\n0 8\n0000000000 65535 f \n';
    for (let n = 1; n <= 7; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
    const trailer = new w.PdfDict({
      Size: 8,
      Root: new w.PdfRef(1, 0),
      Info: new w.PdfRef(5, 0),
      Encrypt: new w.PdfRef(6, 0),
      ID: [w.PdfString.bytes(id0), w.PdfString.bytes(id0)],
    });
    parts.push(enc.encode(`${xref}trailer\n${w.serializeValue(trailer)}\nstartxref\n${offset}\n%%EOF\n`));
    const bytes = Buffer.concat(parts.map((p) => Buffer.from(p)));

    let opened = false;
    let pw = 'none';
    try {
      e.open(new Uint8Array(bytes), 'wrong');
    } catch (err) {
      pw = String(err).includes('PASSWORD') ? 'asked' : String(err);
    }
    const h = e.open(new Uint8Array(bytes), 'user');
    opened =
      e.document_title(h) === 'Secret title' &&
      e
        .page_text(h, 0)
        .map((s) => s[0])
        .join('')
        .includes('Encrypted text');
    e.close(h);
    check(`R${revision}: PDFium asks for the password and decrypts our file (title, page text)`, pw === 'asked' && opened);

    const doc = await w.PdfDoc.load(new Uint8Array(bytes), 'user');
    await doc.setInfo({ Title: 'Edited secret' });
    const saved = await w.saveIncremental(doc);
    const h2 = e.open(saved, 'user');
    check(`R${revision}: PDFium reads our encrypted incremental update`, e.document_title(h2) === 'Edited secret');
    e.close(h2);
  }

  // ── TrueType embedding (subset, Type0, ToUnicode) ────────────────────────
  const unicodeFontPath = ['/System/Library/Fonts/Supplemental/Arial Unicode.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(
    (f) => existsSync(f),
  );
  if (unicodeFontPath) {
    console.log('\nembedded TrueType fonts (hk-pdf-writer → PDFium, Poppler)');
    const font = w.TrueTypeFont.parse('Unicode', new Uint8Array(readFileSync(unicodeFontPath)));
    w.registerCustomFont(font);
    const sample = 'Ελληνικά Привет 你好 ñ';
    // A page whose content draws the sample with the embedded subset.
    const base = serializePdf({
      1: '<< /Type /Catalog /Pages 2 0 R >>',
      2: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      3: '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Resources << >> >>',
    });
    const doc = await w.PdfDoc.load(base);
    const fonts = new w.FontEmbedder(doc);
    const content = `BT /HkF0 20 Tf 20 100 Td ${fonts.hex(font, sample)} Tj ET`;
    const stream = doc.add(new w.PdfStream(new w.PdfDict(), new TextEncoder().encode(content)));
    const [page] = await doc.pages();
    const pageDict = page.dict.clone();
    pageDict.set('Contents', stream);
    pageDict.set('Resources', new w.PdfDict({ Font: new w.PdfDict({ HkF0: fonts.ref(font) }) }));
    doc.update(page.ref, pageDict);
    await fonts.finish();
    const saved = await w.saveIncremental(doc);
    check(
      `the subset of a ${(readFileSync(unicodeFontPath).length / 1e6).toFixed(0)} MB font is small (${(saved.length / 1024).toFixed(0)} KB)`,
      saved.length < 400_000,
    );
    const h = e.open(saved, undefined);
    const text = e
      .page_text(h, 0)
      .map((s) => s[0])
      .join('');
    check('PDFium extracts the exact Unicode text (ToUnicode, widths, CID→GID)', text.replace(/\s+/g, ' ').trim() === sample);
    const [rw, rh, px] = e.render(h, 0, 400);
    let inked = 0;
    for (let i = 0; i < rw * rh; i++) if (px[i * 4] < 100) inked++;
    check('PDFium paints the glyphs', inked > 400);
    e.close(h);
    if (!spawnSync('pdftotext', ['-v']).error) {
      const file = join(dir, 'unicode.pdf');
      writeFileSync(file, saved);
      const out = spawnSync('pdftotext', [file, '-'], { encoding: 'utf8' });
      check(
        'Poppler (pdftotext) extracts the same text, without errors',
        out.stdout.replace(/\s+/g, ' ').trim() === sample && !/Error/i.test(out.stderr),
      );
      const fontsOut = spawnSync('pdffonts', [file], { encoding: 'utf8' }).stdout;
      check(
        'Poppler (pdffonts) lists it as an embedded Identity-H CID TrueType subset',
        /CID TrueType\s+Identity-H\s+yes\s+yes\s+yes/.test(fontsOut),
      );
    }

    // A free-text annotation in those scripts falls back to the registered font.
    const annotated = await w.writeAnnotationChanges(base, new Map(), [
      {
        id: 'ft',
        type: 'freetext',
        page: 0,
        rect: { x: 20, y: 20, w: 360, h: 40 },
        color: '#000000',
        opacity: 1,
        contents: sample,
        font: 'Helvetica',
        fontSize: 18,
        fontColor: '#000000',
        align: 'left',
        strokeWidth: 0,
        fill: null,
      },
    ]);
    const h2 = e.open(annotated, undefined);
    const [aw, , apx] = e.render(h2, 0, 400);
    let annotInk = 0;
    for (let y = 20; y < 60; y++) for (let x = 20; x < 380; x++) if (apx[(y * aw + x) * 4] < 100) annotInk++;
    check('a free-text annotation in Greek, Cyrillic and Chinese paints with the embedded font', annotInk > 300);
    e.close(h2);

    // Form values outside WinAnsi get real appearances too (no /NeedAppearances fallback).
    for (const file of corpusForms) {
      const original = new Uint8Array(readFileSync(join(process.env.PDF_CORPUS, file)));
      const { model } = await w.readForm(await w.PdfDoc.load(original));
      const field = model.fields.find((f) => f.kind === 'text' && !f.readOnly && !f.comb && !f.format);
      if (!field) continue;
      const filled = await w.writeDocumentChanges(original, { formValues: new Map([[field.name, 'Ωμέγα Жук 中文']]) });
      check(
        `${file}: a Unicode value is drawn with the embedded font`,
        !new TextDecoder('latin1').decode(filled.subarray(original.length)).includes('/NeedAppearances true'),
      );
    }
  }

  // ── Part 2: worker protocol ────────────────────────────────────────────
  console.log('\nworker protocol');
  const workerBuild = await build({
    entryPoints: [join(lib, 'components/pdf-viewer/engine/pdfium.worker.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    loader: { '.wasm': 'binary' },
    external: ['module', 'fs', 'path', 'url', 'crypto', 'node:module', 'node:fs', 'node:path', 'node:url', 'node:crypto'],
    logLevel: 'error',
  });
  const workerFile = join(dir, 'worker.mjs');
  writeFileSync(workerFile, WORKER_SHIM + workerBuild.outputFiles[0].text);
  const worker = new Worker(workerFile);
  const replies = [];
  worker.on('message', (m) => replies.push(m));
  const waitFor = async (ids, timeoutMs = 20_000) => {
    const start = Date.now();
    while (!ids.every((id) => replies.some((r) => r.id === id))) {
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for replies ${ids}`);
      await new Promise((r) => setTimeout(r, 20));
    }
  };

  // Posted in one burst, so all are queued before the open (a barrier) finishes.
  const bytes = makeTextPdf(3).buffer;
  worker.postMessage({ type: 'open', id: 1, bytes });
  worker.postMessage({ type: 'pageSizes', id: 2, doc: 1 });
  worker.postMessage({ type: 'render', id: 3, doc: 1, page: 0, cssWidth: 100, dpr: 1 });
  worker.postMessage({ type: 'render', id: 4, doc: 1, page: 1, cssWidth: 100, dpr: 1, priority: 'high' });
  worker.postMessage({ type: 'render', id: 5, doc: 1, page: 2, cssWidth: 100, dpr: 1, priority: 'low' });
  worker.postMessage({ type: 'cancel', id: 5 });
  worker.postMessage({ type: 'pagesText', id: 6, doc: 1, pages: [0, 1, 2], priority: 'low' });
  worker.postMessage({ type: 'render', id: 7, doc: 1, page: 2, cssWidth: 100, dpr: 1, priority: 'low' });
  worker.postMessage({ type: 'pageLabels', id: 8, doc: 1, priority: 'low' });
  try {
    await waitFor([1, 2, 3, 4, 6, 7, 8]);
    await new Promise((r) => setTimeout(r, 300)); // give a cancelled render time to (wrongly) reply
    const order = replies.map((r) => r.id);
    const err = replies.find((r) => r.type === 'error');
    check(`no worker errors${err ? ` (got: ${err.message})` : ''}`, !err);
    check('the open (a barrier) completes before anything queued after it', order[0] === 1);
    check('the high-priority render overtakes earlier normal-priority reads', order[1] === 4);
    check('normal before low; FIFO within a priority', order.slice(2).join() === '2,3,6,7,8');
    check('pageLabels reads /PageLabels (roman, then decimal)', replies.find((r) => r.id === 8).result.join() === 'i,ii,1');
    check('a render cancelled while queued never runs', !replies.some((r) => r.id === 5));
    const sizes = replies.find((r) => r.id === 2).result;
    check('pageSizes returns every page in one reply', sizes.length === 3 && sizes[2].width === 320 && sizes[0].height === 200);
    const texts = replies.find((r) => r.id === 6).result;
    check(
      "pagesText returns each requested page's text",
      texts.length === 3 &&
        texts
          .map((segs) =>
            segs
              .map((s) => s.text)
              .join('')
              .trim(),
          )
          .join('|') === 'Page 1|Page 2|Page 3',
    );
    const rendered = replies.find((r) => r.id === 4);
    check('render replies with the bitmap size', rendered.type === 'rendered' && rendered.width === 100);
  } finally {
    await worker.terminate();
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failures === 0 ? '\n✓ pdf-engine checks OK' : `\n✗ ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
