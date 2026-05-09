/**
 * @hakistack/ng-daisyui — Tailwind CSS v3 Plugin (DaisyUI v4 compat)
 *
 * Intentionally minimal — see the .cjs sibling for full rationale.
 * Native daisyUI v4 is the visual baseline; this plugin only contributes
 * a v4-compat input-disabled text-color fix and the FESM
 * content/safelist plumbing.
 */
import plugin from 'tailwindcss/plugin';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FESM_GLOB = path.join(__dirname, '..', 'fesm2022', '*.mjs');

const require = createRequire(import.meta.url);
let generatedClasses = [];
try {
  generatedClasses = require('./fesm-classes.cjs');
} catch {
  // Pre-build — empty fallback.
}

export default plugin(
  function ({ addBase }) {
    // =====================================================
    // DISABLED INPUT TEXT COLOR FIX
    // Override DaisyUI defaults for better readability
    // Using addBase for element/attribute selectors
    // DaisyUI v4 uses hsl(var(--bc)) for base-content color
    // =====================================================
    addBase({
      '.input:disabled, .input[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
      '.select:disabled, .select[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
      '.textarea:disabled, .textarea[disabled]': {
        color: 'hsl(var(--bc) / 0.85) !important',
        '-webkit-text-fill-color': 'hsl(var(--bc) / 0.85) !important',
        opacity: '1 !important',
      },
    });
  },
  {
    content: { files: [FESM_GLOB] },
    safelist: [
      ...generatedClasses,
      { pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
      { pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/, variants: ['sm', 'md', 'lg', 'xl'] },
    ],
  },
);
