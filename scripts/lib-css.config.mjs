/**
 * Configuración del CSS precompilado de la lib para consumidores DaisyUI v4 / Tailwind 3.
 *
 * En vez de obligar al consumidor a re-escanear el bundle de la lib o a mantener
 * un safelist frágil, compilamos NOSOTROS Tailwind 3 + daisyUI 4 escaneando el
 * FESM de la lib y emitimos un único CSS con EXACTAMENTE las clases que la lib
 * usa. Es el equivalente estático de lo que `@source` hace en Tailwind v4 (path v5).
 *
 * Todas las rutas son relativas a la raíz del workspace.
 */
export default {
  /**
   * FESM compilado de la lib. Escaneamos el BUNDLE, no `src/**`: en el FESM los
   * `class="btn btn-primary"`, `bg-primary/50`, etc. quedan como string literals,
   * así que el JIT genera justo esas clases. Requiere `ng build` antes.
   */
  content: ['dist/hakistack/ng-daisyui/fesm2022/*.mjs'],

  /** CSS autocontenido que el consumidor importa. */
  output: 'dist/hakistack/ng-daisyui/styles-v4.css',

  /**
   * CSS antepuesto tal cual al output (sin pasar por Tailwind): el bridge `--hk-*`.
   * La lib usa esas vars en estilos inline de varios componentes, así que SON
   * necesarias. Anteponerlo hace que `styles-v4.css` sea un único archivo
   * autocontenido → el consumidor hace un solo `@import`.
   */
  prepend: ['projects/hakistack/ng-daisyui/themes/daisyui-v4.css'],

  /**
   * Temas: solo hacen que daisyUI registre los nombres de color (`primary`…) para
   * que el JIT genere `bg-primary`, etc. NO se emiten los bloques de variables de
   * tema porque omitimos `@tailwind base` (ver `includeBase`): las vars (`--p`…)
   * las aporta el consumidor con su propio daisyUI.
   */
  daisyui: {
    themes: ['light', 'dark'],
    logs: false,
  },

  /** false = NO shipeamos `@tailwind base` (ni reset ni bloques `[data-theme]`). */
  includeBase: false,

  /**
   * Clases que la lib construye DINÁMICAMENTE (concatenación de strings en TS,
   * p.ej. el `colSpan` del dynamic-form o el grid del datepicker). No aparecen
   * como literales en el FESM → hay que safelistearlas o se rompen en el consumidor.
   */
  safelist: [
    { pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/, variants: ['sm', 'md', 'lg', 'xl'] },
  ],
};
