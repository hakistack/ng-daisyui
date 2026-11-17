#!/usr/bin/env node
/**
 * Guards WCAG 1.4.3 for muted text in the library.
 *
 * `text-base-content/70` is the lowest opacity that keeps body text at 4.5:1 on base-100/200/300 in the shipped
 * themes (light, dark, kaizen, kaizen-light) — see docs/audit/accessibility-report.md for the per-theme table.
 * Lower opacities are allowed only for icons (non-text contrast is 3:1) and purely decorative glyphs, listed below.
 *
 * Usage: node scripts/check-text-contrast.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const LIB = join(ROOT, 'projects/hakistack/ng-daisyui/src/lib');
const MIN = 70;

/** [file relative to LIB, substring of the line] — each entry needs a reason. */
const ALLOWED = [
  // Icon-only affordances: SVG class sits on its own line inside a multi-line <svg>.
  ['components/timepicker/timepicker.component.html', 'text-base-content/60 hover:text-base-content h-4 w-4'],
  ['components/timepicker/timepicker.component.html', 'text-base-content/60 hover:text-base-content h-5 w-5'],
  // Icon-only dismiss button (lucide X) and the comment describing it.
  ['components/notification/notification-item.component.html', 'btn-square shrink-0 text-base-content/60'],
  ['components/notification/notification-item.component.html', 'Forced to `text-base-content/60`'],
  // Wraps a search icon only.
  ['components/pdf-viewer/ui/pdf-find-bar.component.html', '<span class="text-base-content/50">'],
  // Decorative "·" separators between labelled values.
  ['components/document-editor/document-editor-shell.component.ts', '<span class="text-base-content/40">·</span>'],
  ['components/table/table-pagination.component.ts', '<span class="text-base-content/50 mx-1">·</span>'],
  // Timepicker ":" separators are large text (1.875rem / 2.25rem), where AA is 3:1; 60 % gives ≥ 4.3:1 on the shipped themes.
  ['components/timepicker/timepicker.component.css', 'var(--hk-color-base-content) 60%'],
];

const CLASS_RE = /text-base-content\/(\d+)\b/g;
/** Only the `color` property: backgrounds and borders tinted with base-content are not text. */
const MIX_RE = /^\s*color:\s*color-mix\([^;]*--(?:hk-)?color-base-content\)\s+(\d+)%/g;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(html|ts|css)$/.test(name) && !name.endsWith('.spec.ts')) yield path;
  }
}

const problems = [];
for (const file of walk(LIB)) {
  const rel = relative(LIB, file);
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/<svg|lucide/.test(line)) return;
      if (ALLOWED.some(([f, s]) => f === rel && line.includes(s))) return;
      for (const re of [CLASS_RE, MIX_RE]) {
        for (const m of line.matchAll(re)) {
          if (Number(m[1]) < MIN) problems.push(`${rel}:${i + 1}  ${m[0]}`);
        }
      }
    });
}

if (problems.length) {
  console.error(`✗ ${problems.length} muted text colour(s) below base-content/${MIN} (WCAG 1.4.3):`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`Use text-base-content/${MIN} or higher; icons and decorative glyphs go in ALLOWED with a reason.`);
  process.exit(1);
}
console.log(`✓ muted text colours ≥ base-content/${MIN}`);
