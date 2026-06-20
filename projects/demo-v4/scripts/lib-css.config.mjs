/**
 * Configuración del CSS precompilado de la lib para consumidores DaisyUI v4 / Tailwind 3.
 *
 * La idea: en vez de obligar al consumidor a re-escanear el bundle de la lib
 * (content-scan) o a mantener un safelist frágil (el viejo preset/plugin .cjs),
 * compilamos NOSOTROS Tailwind 3 + daisyUI 4 escaneando el FESM de la lib y
 * emitimos un único CSS con EXACTAMENTE las clases que la lib usa.
 *
 * Es el equivalente estático de lo que `@source` hace en Tailwind v4 (que la lib
 * ya usa para el path v5). El consumidor v4 solo hace:
 *
 *   @import "@hakistack/ng-daisyui/styles-v4.css";
 *
 * Este script corre desde `projects/demo-v4` porque es el único lugar del
 * workspace con tailwindcss@3 + daisyui@4 + autoprefixer resolubles.
 */
export default {
  /**
   * FESM compilado de la lib (relativo a projects/demo-v4). Escaneamos el BUNDLE,
   * no `src/**`: en el FESM los `class="btn btn-primary"`, `bg-primary/50`,
   * `lg:menu-horizontal`, etc. quedan como string literals, así que el extractor
   * de Tailwind los ve y el JIT genera justo esas clases, purgando el resto.
   *
   * Requiere haber compilado la lib antes (`ng build @hakistack/ng-daisyui`).
   */
  content: ['../../dist/hakistack/ng-daisyui/fesm2022/*.mjs'],

  /** CSS autocontenido que el consumidor importa (relativo a projects/demo-v4). */
  output: '../../dist/hakistack/ng-daisyui/styles-v4.css',

  /**
   * CSS que se ANTEPONE tal cual al output (sin pasar por Tailwind). Acá va el
   * bridge `--hk-*`: la lib usa esas variables en los estilos inline de varios
   * componentes (tree, table, select, editor…), así que SON necesarias o esos
   * componentes se ven rotos. Anteponerlo hace que `styles-v4.css` sea un único
   * archivo autocontenido → el consumidor hace un solo `@import`.
   */
  prepend: ['../hakistack/ng-daisyui/themes/daisyui-v4.css'],

  /**
   * Temas daisyUI a registrar. Solo hacen que daisyUI registre los nombres de
   * color (`primary`, `base-content`…) para que el JIT genere `bg-primary`, etc.
   * NO se emiten los bloques de variables de tema porque omitimos `@tailwind base`
   * (ver `includeBase`): las vars (`--p`, `--b1`…) las aporta el consumidor con su
   * propio daisyUI, así este CSS no pisa ni duplica su tema.
   */
  daisyui: {
    themes: ['light', 'dark'],
    logs: false,
  },

  /**
   * false = NO shipeamos `@tailwind base` (ni el reset de Tailwind ni los bloques
   * `[data-theme]{--p:…}` de daisyUI). El consumidor ya tiene su base/temas.
   * Ponelo en true solo si querés un CSS 100% self-sufficient (riesgo: pisa temas).
   */
  includeBase: false,

  /**
   * Clases que la lib construye DINÁMICAMENTE (concatenación de strings en TS,
   * p.ej. el `colSpan` del dynamic-form o el grid del datepicker). No aparecen
   * como literales en el FESM, así que el content-scan NO las ve → hay que
   * safelistearlas o se rompen en el consumidor (el bug que estamos arreglando).
   */
  safelist: [
    { pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/, variants: ['sm', 'md', 'lg', 'xl'] },
  ],
};
