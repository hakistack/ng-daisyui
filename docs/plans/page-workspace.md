# `hk-page-workspace` — Informe inicial (entregable 1)

Visor cuya unidad es la **página**: un conjunto ordenado, una sola posición `i / n`, tres paneles (rail · hoja/contacto · inspector), tira inferior plegable y barra de selección. Referencias: mockup `expediente-pagina-unidad.html` y la implementación de aplicación en `docsy-spa/src/app/features/records/components/page-workspace/` (spec de comportamiento, no de implementación).

Estado: **informe para revisión**. No se ha escrito código de librería todavía.

---

## 1. Qué existe en la librería y se reutiliza

| Pieza | Dónde | Cómo se usa en el workspace |
|---|---|---|
| **`hk-virtual-scroller`** | `projects/hakistack/ng-daisyui/src/lib/components/virtual-scroller/virtual-scroller.component.ts` (270 líneas). Inputs `items`, `itemSize` (req.), `orientation`, `numColumns`, `viewportHeight` (def. `'400px'`), `viewportWidth`, `minBufferPx`/`maxBufferPx`, `trackByFn`, `lazy`, `itemClass` (l. 97‑130). `scrollToIndex()` l. 185. Grid por filas `virtualRows` l. 163‑172. | Rail (vertical, altura de fila constante), contacto (`numColumns` calculado por ancho discreto), tira (horizontal). **Requiere dos arreglos** (§2). Nadie dentro de la librería lo consume hoy: `hk-select` usa `cdk-virtual-scroll-viewport` directo (`select/select.component.html:176`). |
| **Patrón builder + controller** | `pdf-viewer/pdf-viewer.helpers.ts:55` (`createPdfViewer`: `state` signal en clausura, `_internal.bind(handlers)`, `config = computed(...)`, métodos imperativos que delegan en handlers y son no‑op antes del mount). Mismo patrón en `menu/menu.helpers.ts:151`. `table.types.ts:78‑130` documenta el alias `TableController` = `FieldConfiguration`. | `createPageWorkspace()` sigue la forma de `createPdfViewer`: el controller expone `state()`, `current()`, `goTo/next/previous`, `setFilters`, `select`, `patchTags`, `focusSearch`; el componente se engancha vía `config()._internal.bind(...)`. La diferencia: el **store** (filtrado/orden/índices) vive en la clausura del controller, no en el componente, para que `state()`/`current()` funcionen sin vista montada y sean testeables sin TestBed. |
| **Labels provider** | `command-palette/command-palette.labels.ts` (interfaz con campos opcionales, tipo `Resolved* = Required<…>`, `DEFAULT_*`, `InjectionToken`, `provideHk*Labels` con `makeEnvironmentProviders`). `pdf-viewer/pdf-viewer.labels.ts:150‑185` añade placeholders `{current}`/`{total}`. | `page-workspace.labels.ts` + `provideHkPageWorkspaceLabels()`. Placeholders `{i}`, `{n}`, `{count}`, `{batch}`. Textos por defecto en inglés; Docsy los traduce (expediente, lote, etiqueta…). |
| **`DialogService`** | `services/dialog/dialog.service.ts:54‑78` (`open()` propaga cualquier `DialogConfig` del CDK: `positionStrategy`, `panelClass`, `width/height`; cierra al navegar, l. 17‑25). `openRaw()` l. 34 abre sin wrapper. | Inspector en `<1040px`. **Matiz**: el wrapper (`dialog-wrapper.component.html:1`) fuerza `animate__zoomIn` y `max-height: 90vh` (`.css:7‑11`), pensado para modal centrado, no para panel lateral. Ver pregunta abierta 4. |
| **`hk-select`** | `select/select.component.ts:99‑128` (`multiple`, `enableSearch`, `virtualScroll`, chips, labels por input). `SelectOption { label, value, disabled?, group? }` (`select.types.ts`). Overlay CDK con estilos globales (`styles.css`, memoria del proyecto). | Selector de etiqueta en la barra de selección y en el inspector. **No tiene modo "crear valor nuevo"** (grep de `creat|custom|allowNew` sin resultados). Ver pregunta 3. |
| **Iconos** | `LucideDynamicIcon` + `<svg [lucideIcon]="…">` (`breadcrumbs.component.ts:4,41`; `input/input.component.ts:26`). | Toolbar, tira, inspector. |
| **Precedentes a11y** | `role="listbox"/"option"` en `select.component.html:177‑180`; roving tabindex + `keydown` en host en `tree/tree.component.ts:67,535` y `tree.component.html:56`; región `sr-only aria-live="polite"` en `pdf-viewer.component.html:500`; `cdkTrapFocus` en `navbar/app-shell.component.html:26`; helper reduced‑motion en `directives/motion.utils.ts:9`. | Rail/tira/contacto como `listbox` con `aria-setsize`/`aria-posinset`; anuncio "N páginas en el conjunto"; foco al paginador al cambiar conjunto. **Nota**: `CLAUDE.md` menciona un `AccessibilityService`, pero no existe en `src/lib/services/` → no se depende de él; se usa `LiveAnnouncer` del CDK (ya dependencia) o una región `aria-live` propia. |
| **Precedentes de imágenes/caché** | LRU de `ImageBitmap` con `close()` al expulsar: `pdf-viewer.component.ts:510‑516, 1419‑1447`. `IntersectionObserver` de miniaturas con `rootMargin: '500px 0px'`: `pdf-viewer.component.ts:1598‑1630`. Object URLs con revocación: `document-viewer/renderers/image.renderer.ts:62‑72`. Pool de workers con tamaño configurable: `pdf-viewer.component.ts:996‑1006`. | Los dos primeros son **privados de un componente de 2 900 líneas**; no se extraen ahora (fuera de alcance; candidato a refactor posterior cuando haya 3 usos). Se crean utilidades genéricas y testeables en `lib/utils/`: `lru-byte-cache.ts` (acotada en bytes, `revokeObjectURL`/`close()` al expulsar) y `priority-task-queue.ts` (visible > vecino > prefetch, `AbortSignal`, concurrencia configurable). |
| **Debounce** | El scroller ya usa RxJS `debounceTime` (`virtual-scroller.component.ts:19,227`). | Omnibox: `toObservable(q).pipe(debounceTime(300))` — mismo valor que la referencia (`page-set-omnibox.component.ts:12`). Único uso de RxJS en el componente. |
| **Slots por directiva** | `pdf-viewer/pdf-viewer.directives.ts` (`HkPdfToolbarDirective`, contexto tipado). | `hkPageInspector`, `hkPageActions`, `hkPageEmpty` con `contentChild(Directive)` + `TemplateRef` tipado. |
| **Demo y docs** | Esqueleto: `projects/shared-demos/shared/` (`demo-page`, `doc-section`, `api-table`, `code-block`). Registro: `projects/demo/src/app/app.routes.ts:31‑34` + nav en `app.ts:366‑372`, y lo mismo en `projects/demo-v4/`. Referencia de skill: `.claude/skills/hakistack-ng-daisyui/references/content-viewers.md` (93 líneas, secciones "Inputs/Outputs/snippet") + fila en `SKILL.md:52`. | `projects/shared-demos/demos/page-workspace-demo.component.ts` con 1 000 páginas / 20 lotes y `PageWorkspaceImageSource` de SVG data URIs. Sección nueva en `content-viewers.md`. |
| **Tests** | Vitest vía `@angular/build:unit-test` (`angular.json:63‑67`), `vitest/globals` (`tsconfig.spec.json`), patrón host‑component en `virtual-scroller.component.spec.ts:128‑212`. `npm test` = `ng test`. Corre en jsdom → las aserciones de layout deben ser por clase/estilo inline, no por medidas. | Store: tests de rendimiento con 10 000 ítems (ver pregunta 9). Scroller horizontal y `fill`: tests por clase/estilo + mock de `ResizeObserver`. |

---

## 2. Qué hay que arreglar en `hk-virtual-scroller`

### 2.1 Modo horizontal no coloca los ítems en fila

- **Causa raíz**: el CSS propio del CDK para `.cdk-virtual-scroll-orientation-horizontal .cdk-virtual-scroll-content-wrapper` solo fija `min-height: 100%` (`node_modules/@angular/cdk/fesm2022/scrolling.mjs:915`); el CDK delega en el consumidor la disposición en fila (`display:inline-block` o flex). Nuestro template envuelve cada ítem en un `<div>` de bloque (`virtual-scroller.component.html:34`), así que los ítems se apilan y solo se ve el primero. El demo horizontal (`shared-demos/demos/virtual-scroller-demo.component.ts:116‑131`) sufre lo mismo. La app lo parcheó con `:host ::ng-deep` (`docsy-spa/.../page-strip/page-strip.component.css:7‑12`).
- **Arreglo en la librería**:
  1. `host: { '[class.hk-vs-horizontal]': 'cdkOrientation() === "horizontal"' }` y un `styleUrl` nuevo con `:host(.hk-vs-horizontal) ::ng-deep .cdk-virtual-scroll-content-wrapper { display:flex; flex-direction:row; align-items:stretch; height:100%; }` (`::ng-deep` dentro de la propia librería está permitido por §4 del brief).
  2. El wrapper de ítem (`html:34`) recibe `[style.flex]="'0 0 ' + itemSize() + 'px'"` y `[style.width.px]="itemSize()"` cuando es horizontal, para que el `itemSize` declarado coincida con el ancho real (si no, la matemática del CDK se desalinea).
  3. **Test**: host de prueba con `orientation="horizontal"`; asertar clase `hk-vs-horizontal` en host y `flex: 0 0 120px` inline en los wrappers renderizados (jsdom no mide layout; la regla CSS se verifica indirectamente por la clase). Añadir caso de regresión al `describe('Horizontal scrolling')` existente (`spec.ts:185‑212`).

### 2.2 `viewportHeight="100%"` depende de toda la cadena de ancestros

- **Causa raíz**: `[style.height]="viewportHeight()"` va al `<cdk-virtual-scroll-viewport>` (`html:13`) y el host solo es `class: 'block'` sin altura (`ts:73`). Un `100%` se resuelve a `auto` salvo que cada ancestro tenga altura definida; por eso el rail de referencia necesita `min-h-0 flex-1` en tres niveles (`record-page-workspace.component.html:10‑12`, `page-set-rail.component.html:43,85`).
- **Arreglo en la librería**: aceptar `viewportHeight="fill"`:
  1. `host: { '[class.hk-vs-fill]': 'viewportHeight() === "fill"' }` → CSS `:host(.hk-vs-fill) { display:block; height:100%; min-height:0; }`.
  2. `effect` con `ResizeObserver` sobre el host que escribe `measuredHeight = signal<number>` y se desconecta en `onCleanup`; el viewport toma `[style.height.px]="measuredHeight()"` en modo `fill` y se llama `vp.checkViewportSize()` tras cada medida (un px definido es lo que el CDK necesita para `getViewportSize()`).
  3. **Test**: stub de `ResizeObserver` en el spec (patrón ya necesario para el pdf‑viewer), disparar el callback con `contentRect.height = 480` y asertar `height: 480px` en el viewport.

### 2.3 Añadidos menores (no bloqueantes, mismo PR)

- `ensureIndexVisible(index)`: `scrollToIndex` del CDK siempre alinea al inicio; para ←/→ en la tira y el rail queremos desplazar **solo si el ítem activo salió del viewport** (usar `measureScrollOffset()` + `getViewportSize()`). Evita el "salto" en cada tecla.
- Ternario muerto en `ts:231` (`vertical ? getViewportSize() : getViewportSize()`); `orientation="both"` se mapea silenciosamente a vertical (`ts:154‑157`) — documentar o quitar de la unión de tipos.
- Los wrappers `<div>` del scroller quedan entre nuestro `role="listbox"` y los `role="option"`. ARIA 1.2 y axe (`aria-required-children`) toleran elementos genéricos intermedios; se verificará con axe en el demo. Si falla, añadir input `itemRole` para poner `role="presentation"` en el wrapper.

---

## 3. Decisiones de diseño que tomo salvo objeción

1. **Orden natural = orden de entrada.** La referencia ordena por categoría → fecha de carga → nombre → nº de página (`page-set.store.ts:421‑432`), semántica que la librería no debería conocer. El consumidor entrega `items` ya en "orden del expediente" y el componente **nunca reordena**; filtra por máscara sobre índices precalculados (Map por etiqueta/categoría/lote construidos una vez al cambiar `items`). "Relevancia" = orden por `score` desc. sobre el subconjunto, calculado solo cuando hay texto.
2. **Snippet solo como texto plano o segmentos `{ text, mark }[]`.** Nada de `innerHTML`/`SafeHtml`. Se exporta un helper puro `parseMarkedSnippet(html)` que convierte `<mark>…</mark>` en segmentos sin sanitizador (split por etiqueta, escape del resto), para que Docsy adapte su respuesta actual en una línea.
3. **Agrupar por etiqueta** usa la **primera etiqueta** de la página, como la referencia (`page-set.store.ts:154`); no se duplican filas (rompería la posición única).
4. **Anchos discretos**: `thumb` ∈ {96, 128, 160, 224} px (contacto elige el paso ≤ ancho de celda; la tira usa 64 → se pide 96 y se escala); `sheet` = ancho del stage × zoom redondeado a pasos de 200 px.
5. **Estado serializable** `PageWorkspaceState = { pageId, index, total, filters:{ q, tags, categoryIds, documentIds }, order, view, groupBy, selection, stripCollapsed }`; `onStateChange` se dispara con `untracked` tras cada cambio; la URL la lleva la app.
6. **Ubicación**: `src/lib/components/page-workspace/` con subcarpetas por sub‑componente, `page-workspace.types.ts`, `page-workspace.store.ts` (puro, sin Angular salvo `signal/computed`), `page-workspace.helpers.ts` (`createPageWorkspace`), `page-workspace.labels.ts`, `page-workspace.directives.ts`. Utilidades genéricas en `src/lib/utils/lru-byte-cache.ts` y `src/lib/utils/priority-task-queue.ts`, ambas con spec.

---

## 4. Preguntas abiertas

1. **Quién filtra por texto.** El brief admite `items` ya filtrados **o** `source.load(filters)`. Propongo: `items` es siempre la base (todas las páginas accesibles, cargadas una vez); etiquetas/categoría/lote se filtran en cliente con índices; el texto va a `source.search(q, signal)` si existe (devuelve `pageId → { score, snippet }` que se mezcla sobre la base) y, si no, `includes` sobre `snippet`. ¿De acuerdo, o prefieres que `source.load` reemplace el conjunto completo?
2. **Recuento de facetas** sobre la base (como la referencia, `page-set.store.ts:114`) o sobre el conjunto activo. Propongo base, con conteo incremental por índice.
3. **Etiqueta nueva.** `hk-select` no permite crear valores. Opciones: (a) barra de selección e inspector usan `hk-select` con las etiquetas existentes + un `<input list>` con `datalist` para "añadir"; (b) añadir `allowCustomValue` a `hk-select` (toca un componente ajeno). Recomiendo (a) para v1.
4. **Inspector lateral en `<1040px`.** El wrapper de `DialogService.open()` es un modal centrado con zoom. Opciones: (a) `openRaw()` con un componente interno `hk-page-inspector-panel` y `positionStrategy: global().right('0').top('0')`, `height: '100vh'`; (b) `drawer drawer-end` de DaisyUI dentro del propio workspace, sin overlay. Recomiendo (b): menos piezas, foco y `Esc` bajo control del componente. ¿Mantengo "DialogService" como pide el brief?
5. **`badge-soft` es exclusivo de DaisyUI v5.** Los demos compartidos se renderizan también bajo v4 (memoria del proyecto) y la librería ya tiene mapa de clases por versión en `theme/theme.config.ts:43‑48` (`HkThemeConfig.classes`). ¿Añado `badgeSoft` a ese mapa (v4 → `badge-outline`) o ignoramos v4 para este componente?
6. **Tokenización de términos** para `images.highlights(item, terms, signal)`: ¿la hace el componente (split por espacios, minúsculas) o pasamos `q` crudo y que decida el consumidor? Propongo pasar ambos: `terms` tokenizados y `query` cruda.
7. **Persistencia de zoom** de la hoja: ¿parte del estado serializable o solo local? Propongo local (no en `onStateChange`).
8. **Recorrer desde el inspector** ("→ recorrer" en un chip): la referencia reemplaza todas las etiquetas por esa y quita el filtro de lote, manteniendo la página (`page-set.store.ts:312‑315`). ¿Mantengo exactamente ese comportamiento?
9. **Tests de rendimiento en CI.** Vitest en jsdom con 10 000 ítems: ¿aserción con cota holgada (p. ej. `< 200 ms`, y se registra el tiempo real) o solo medición sin fallar? Recomiendo cota holgada para no introducir tests intermitentes; la cota real (`< 50 ms`) se mide en el demo con Chrome Performance.
10. **Árbol de trabajo sucio.** Hay cambios sin commitear en `table.helpers.ts`, `public-api.ts`, i18n y schematics. Trabajaré en una rama nueva a partir de `main` sin tocar esos archivos; el único archivo compartido que edito es `public-api.ts` (añadir exports al final). ¿Conflicto con lo que tienes en curso?

---

## 5. Plan de entregables (sin cambios respecto al brief)

2. Modelos + `createPageWorkspace()` + store con tests (10 000 ítems), utilidades `lru-byte-cache` y `priority-task-queue` con spec. Arreglos 2.1/2.2/2.3 del scroller con tests.
3. `hk-page-thumb` (IntersectionObserver ~2 viewports, `loading="lazy"`, `decoding="async"`, cola con prioridad, caché) + demo de 1 000 páginas con medición.
4. Rail (lotes/páginas + cabeceras), toolbar, hoja con overlay SVG y zoom, contacto, tira plegable, barra de selección, inspector con slots.
5. Teclado, a11y (axe en demo), labels provider, docs en `content-viewers.md`, demo final en v5 y v4.
