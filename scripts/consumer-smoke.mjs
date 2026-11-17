#!/usr/bin/env node
/**
 * Package consumer smoke test.
 *
 * Proves the PUBLISHED artifact works for a real consumer, not just the workspace build:
 *   1. `npm pack` the built library (dist/hakistack/ng-daisyui → .tgz)
 *   2. copy tests/consumer-smoke into a temp dir (outside the workspace, so nothing
 *      resolves from the workspace node_modules)
 *   3. `npm install` the tarball with only the REQUIRED peers (npm skips optional peers)
 *   4. `ng build` the app and report initial JS size (raw + gzip)
 *
 * Usage: node scripts/consumer-smoke.mjs [--package=ui|i18n] [--variant=<name>] [--keep] [--max-initial-gzip=<kB>]
 *   --variant=<name> (ui only) builds tests/consumer-smoke/variants/<name>.ts instead of src/main.ts
 *                    (datagrid, forms, pdf), each with its own initial-JS budget in package.json.
 *   --package=ui   (default) @hakistack/ng-daisyui, template tests/consumer-smoke — run `npm run build:ui` first
 *   --package=i18n @hakistack/i18n, template tests/consumer-smoke-i18n — run `npm run build:i18n` first.
 *                  Also runs the package's codegen CLI and proves ng-daisyui is not pulled in.
 */
import { execSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { getPackage } from './workspace/products.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgArg = process.argv.find((a) => a.startsWith('--package='));
const product = getPackage(pkgArg ? pkgArg.split('=')[1] : 'ui');
const dist = join(root, product.dist);
const template = join(root, product.consumer);
const isUi = product.id === 'ui';
const keep = process.argv.includes('--keep');
const variantArg = process.argv.find((a) => a.startsWith('--variant='));
const variant = variantArg ? variantArg.split('=')[1] : null;
if (variant && (!isUi || !existsSync(join(template, 'variants', `${variant}.ts`)))) {
  console.error(`✗ unknown consumer variant "${variant}" (expected a file in ${product.consumer}/variants/)`);
  process.exit(1);
}
// Optional budget: fail when the consumer's initial JS (main + polyfills, gzip) exceeds N kB.
const budgetArg = process.argv.find((a) => a.startsWith('--max-initial-gzip='));
const maxInitialGzipKb = budgetArg ? Number(budgetArg.split('=')[1]) : null;

if (!existsSync(join(dist, 'package.json'))) {
  console.error(`✗ ${product.dist} not found — run \`npm run build:${product.id}\` first.`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'hk-consumer-'));
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });

/**
 * `ng build` can stay alive after printing its result (open handles in the CSS
 * pipeline), so watch the output for the final status line and stop the process
 * ourselves instead of waiting for it to exit.
 */
function ngBuild(cwd) {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn('npx', ['ng', 'build'], { cwd, detached: true, env: { ...process.env, CI: '1', NG_CLI_ANALYTICS: 'false' } });
    let out = '';
    let settling = false;
    const stop = () => {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        /* already gone */
      }
    };
    const timer = setTimeout(() => {
      stop();
      rejectBuild(new Error('ng build timed out after 10 minutes'));
    }, 600_000);
    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      out += text;
      // Files may still be flushing when "Output location:" is printed: wait until main.js and
      // styles.css exist with a stable size, then stop the (otherwise lingering) process.
      if (/Output location:/.test(out) && !settling) {
        settling = true;
        clearTimeout(timer);
        waitForStableOutput(join(cwd, 'dist/browser'))
          .then(() => {
            stop();
            resolveBuild();
          })
          .catch((err) => {
            stop();
            rejectBuild(err);
          });
      } else if (/Application bundle generation failed|An unhandled exception occurred/.test(out) && !settling) {
        // The error details are printed AFTER the status line: give them a moment to flush.
        settling = true;
        clearTimeout(timer);
        setTimeout(() => {
          stop();
          rejectBuild(new Error('ng build failed (see output above)'));
        }, 3000);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (!settling) rejectBuild(new Error(`ng build exited with code ${code}`));
    });
  });
}

async function waitForStableOutput(dir, timeoutMs = 60_000) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snapshot = () => {
    if (!existsSync(dir)) return null;
    const files = readdirSync(dir);
    // The ui template has a stylesheet (Tailwind + the library's CSS); the i18n template has none.
    if (!files.some((f) => /^main.*\.js$/.test(f)) || (isUi && !files.some((f) => f.endsWith('.css')))) return null;
    return files
      .map((f) => `${f}:${statSync(join(dir, f)).size}`)
      .sort()
      .join('|');
  };
  const start = Date.now();
  let previous = null;
  while (Date.now() - start < timeoutMs) {
    const current = snapshot();
    if (current && current === previous) return;
    previous = current;
    await sleep(1000);
  }
  throw new Error(`build output in ${dir} did not settle within ${timeoutMs / 1000}s`);
}

let failed = false;
try {
  const tgzName = execSync(`npm pack --pack-destination "${work}" --silent`, { cwd: dist, encoding: 'utf8' }).trim().split('\n').pop();
  const tgz = join(work, tgzName);
  console.log(`✓ packed ${tgzName} (${(statSync(tgz).size / 1024 / 1024).toFixed(1)} MB)`);

  const app = join(work, 'app');
  cpSync(template, app, { recursive: true, filter: (src) => !/node_modules|[\\/]dist$|\.angular/.test(src) });
  if (variant) cpSync(join(template, 'variants', `${variant}.ts`), join(app, 'src/main.ts'));
  run(`npm install --no-audit --no-fund --loglevel=error`, app);
  run(`npm install --no-audit --no-fund --loglevel=error "${tgz}"`, app);

  if (!isUi) {
    // Independence: installing @hakistack/i18n must not drag in the UI library.
    if (existsSync(join(app, 'node_modules/@hakistack/ng-daisyui'))) {
      throw new Error('@hakistack/ng-daisyui was installed as a dependency of @hakistack/i18n');
    }
    // The codegen CLI from the tarball's `bin`, exactly as a consumer's npm scripts call it.
    for (const cmd of ['scan', 'generate', 'validate']) run(`npx --no-install hakistack-i18n ${cmd}`, app);
    const es = readFileSync(join(app, 'src/assets/i18n/es.json'), 'utf8');
    if (!es.includes('Bienvenido')) throw new Error('hakistack-i18n generate did not write the Spanish translation');
    console.log('✓ hakistack-i18n scan / generate / validate ran from the installed package');
  }

  await ngBuild(app);

  const browser = join(app, 'dist/browser');
  const js = readdirSync(browser).filter((f) => f.endsWith('.js'));
  const initial = js.filter((f) => /^(main|polyfills)/.test(f));
  const sum = (files) =>
    files.reduce(
      (acc, f) => {
        const buf = readFileSync(join(browser, f));
        return { raw: acc.raw + buf.length, gzip: acc.gzip + gzipSync(buf).length };
      },
      { raw: 0, gzip: 0 },
    );
  const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
  const init = sum(initial);
  const all = sum(js);
  const css = readdirSync(browser).filter((f) => f.endsWith('.css'));
  const cssSize = sum(css);
  console.log(
    `\nConsumer build of ${product.name} (${variant ? `variant: ${variant}` : isUi ? 'basic components: Input, Select, Toast' : 'provideI18n + generated TK/directive'})`,
  );
  console.log(`  initial JS : ${kb(init.raw)} raw / ${kb(init.gzip)} gzip  (${initial.join(', ')})`);
  console.log(`  all JS     : ${kb(all.raw)} raw / ${kb(all.gzip)} gzip  (${js.length} files)`);
  console.log(`  CSS        : ${kb(cssSize.raw)} raw / ${kb(cssSize.gzip)} gzip`);
  if (maxInitialGzipKb !== null && init.gzip / 1024 > maxInitialGzipKb) {
    throw new Error(`initial JS ${kb(init.gzip)} gzip exceeds the ${maxInitialGzipKb} kB budget`);
  }
  if (isUi) {
    if (!variant) {
      // Classes the library builds from size/color inputs must reach the consumer's CSS (Tailwind only
      // generates classes it can find as literal strings in the scanned FESM).
      const cssText = css.map((f) => readFileSync(join(browser, f), 'utf8')).join('\n');
      for (const cls of ['.input-sm', '.input-primary']) {
        if (!cssText.includes(cls)) throw new Error(`consumer CSS is missing ${cls} (used by <hk-input size="sm" color="primary">)`);
      }
      console.log('  CSS check  : .input-sm and .input-primary present');
    }
  } else {
    // The registry loader serves translations from memory: the Spanish string must be in the bundle.
    const jsText = js.map((f) => readFileSync(join(browser, f), 'utf8')).join('\n');
    if (!jsText.includes('Bienvenido')) throw new Error('the in-memory translation registry is missing from the bundle');
    console.log('  i18n check : registry translations bundled (no HTTP loader needed)');
  }
} catch (err) {
  failed = true;
  console.error(`\n✗ consumer smoke test failed: ${err.message}`);
} finally {
  if (keep) console.log(`\n(kept ${work})`);
  else rmSync(work, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
