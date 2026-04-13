import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist/vercel');

// Clean previous bundle
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// --- Main demo (DaisyUI v5 / Tailwind v4) → /
const demoDist = join(root, 'dist/demo/browser');
if (!existsSync(demoDist)) {
  throw new Error(`Missing demo build output: ${demoDist}`);
}
cpSync(demoDist, out, { recursive: true });
console.log(`[vercel] copied demo → ${out}`);

// --- demo-v4 (DaisyUI v4 / Tailwind v3) → /v4
// The inner angular.json names the project "demo-v3", so output dir name reflects that.
// Resolve the actual browser dir dynamically in case that naming ever changes.
const v4DistRoot = join(root, 'projects/demo-v4/dist');
if (!existsSync(v4DistRoot)) {
  throw new Error(`Missing demo-v4 dist dir: ${v4DistRoot}`);
}

const candidateProjects = readdirSync(v4DistRoot).filter((name) => statSync(join(v4DistRoot, name)).isDirectory());
let v4Browser = null;
for (const name of candidateProjects) {
  const browser = join(v4DistRoot, name, 'browser');
  if (existsSync(browser)) {
    v4Browser = browser;
    break;
  }
}
if (!v4Browser) {
  throw new Error(`No browser/ folder found inside ${v4DistRoot}/*/. Did the demo-v4 build run?`);
}

const v4Out = join(out, 'v4');
mkdirSync(v4Out, { recursive: true });
cpSync(v4Browser, v4Out, { recursive: true });
console.log(`[vercel] copied demo-v4 (from ${v4Browser}) → ${v4Out}`);

console.log('[vercel] bundle ready');
