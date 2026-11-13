# Variantes «workspace» de los visores — Fase 1 (análisis)

Estado: W0–W3 hechos (ver «Estado» al final). W4 (opcional) pendiente de decisión.

Objetivo: añadir una segunda presentación tipo workspace a los dos visores, con el lenguaje visual de la guía
[«Mesa»](../design/mesa-style-guide.md). La presentación actual se queda como la vista «por documento».

| Componente actual | Variante nueva | Comparte |
|---|---|---|
| `hk-pdf-viewer` | `hk-pdf-workspace` | Mismo `PdfViewerConfig`, mismo `createPdfViewer()`, mismos outputs, mismos servicios. Cambiar de variante = cambiar la etiqueta. |
| `hk-document-viewer` | `hk-document-workspace` | Mismo `DocumentSource`/`DocumentViewerConfig`, mismo registro de renderers. |

Alcance v1: **un documento por workspace**. El diseño deja el panel izquierdo preparado para listar varios documentos
más adelante (§E.4), que es el sentido de llamarlo workspace.

Relacionado: [`page-workspace.md`](page-workspace.md) (informe previo de `hk-page-workspace`, conjunto de páginas de
imagen multi-lote al estilo Docsy). Las piezas compartidas de §C sirven también para ese componente.

---

## A. Guía de estilo

Escrita en [`docs/design/mesa-style-guide.md`](../design/mesa-style-guide.md): tokens, superficies, toolbar, botones,
páginas, estados, overlays, accesibilidad y compatibilidad daisyUI 4/5. Además de las reglas del brief recoge lo que la
referencia de Docsy hace en la práctica:

- `btn-ghost` para acciones terciarias (cancelar, desplegar la tira).
- `badge-primary` en el número de la página actual y `badge-secondary` en el badge de contexto activo (filtro, edición): marca como relleno, regla 1.
- **Excepción del papel**: el contenido del documento (página PDF, DOCX, HTML, correo) va sobre `bg-white`. Con `bg-base-100` el contenido es ilegible en temas oscuros (hoy pasa en los iframes HTML/EML/MSG, ver B.2).
- Los cortes responsive se miden sobre el ancho del componente (ResizeObserver), no del viewport.

---

## B. Auditoría

Rutas relativas a `projects/hakistack/ng-daisyui/src/lib/components/`. Esfuerzo S/M/L. «API» = rompe API pública o temas.
Los componentes de `pdf-viewer/ui/*` no se exportan en `public-api.ts`, así que cambiar su marcado no rompe API.

### B.1 `hk-pdf-viewer`

| Qué choca hoy | Dónde | Cambio propuesto | Esf. | API |
|---|---|---|---|---|
| Tres barras apiladas, cada una con su fondo (`bg-base-200/60`, `bg-base-100`, `bg-base-200/40`); el marco no tiene `shadow-sm` | `pdf-viewer.component.ts:202-206`, `ui/pdf-toolbar.component.html:2`, `ui/pdf-annotation-toolbar.component.html:2`, `ui/pdf-find-bar.component.html:2` | Todas sobre `bg-base-100` separadas por líneas finas; `shadow-sm` en el marco | S | No |
| La toolbar no tiene badge que nombre el documento; los grupos se separan con divisores `w-px h-5 bg-base-300` (12×) en vez de `join`; el espaciador es `grow` | `ui/pdf-toolbar.component.html:19,86,129,159,174` | Shell de toolbar (§C): badge + `join` (paginador, zoom, modo de vista) + clúster `ml-auto` | M | No (la plantilla `hkPdfToolbar` sigue igual) |
| El `select` de zoom no tiene `aria-label` y no es alcanzable bajo `@md` | `ui/pdf-toolbar.component.html:99-116` | Etiqueta desde `labels()`; reflow en vez de ocultarlo | S | No |
| Textos fijos en inglés: `"PDF toolbar"`, `'Display mode'`, `Auto`, `"PDF document"`, `'Page ' + n`, `(untitled)`, `Cancel`/`Save` | `pdf-toolbar.html:4,108,132`, `pdf-pages.html:30,45`, `pdf-viewer.html:31`, `pdf-sidebar.html:220`, `pdf-text-editor.html:24-25` | Pasarlos a `PdfViewerLabels` | S | Aditivo |
| Botones de icono `btn-ghost btn-xs btn-square` en barras (~45 sitios en 8 archivos) | p. ej. `pdf-toolbar.html` (18), `pdf-annotation-toolbar.html` (8) | `btn btn-sm btn-square` en barras; `btn-xs` solo en tarjetas | M | No |
| Pulsado = `btn-active` (24 sitios); **sin `aria-pressed`** en el toggle de búsqueda, sello y medición, y en "sin relleno" | `pdf-toolbar.html:162-172`, `pdf-annotation-toolbar.html:84-89,158-163`, `pdf-form-field-panel.html:216-223` | `btn-primary` + `aria-pressed` | M | No |
| `btn-outline` y `btn-soft btn-primary` (`btn-soft` es solo de v5) | `pdf-viewer.html:39,48,60`, `pdf-pages.html:10`, `pdf-signature-dialog.html:107,177`, `pdf-comments.html:154` | `btn` a secas | S | No |
| Pestañas del sidebar con `text-primary border-b-2 border-primary` (marca como texto y borde); sin `aria-controls` ni flechas | `ui/pdf-sidebar.component.html:7-82` | `@for` sobre un modelo; `join` con `btn-primary` + `aria-pressed`, o `tabs` vía `HK_THEME`; foco roving | M | No |
| Miniaturas con CSS propio: borde y tinte primary, canvas blanco con sombra `rgb`, sin skeleton, cada miniatura es una parada de Tab | `pdf-sidebar.html:113-121`, `pdf-viewer.component.css:100-132` | Marco de página (§C): `ring-1 ring-base-content/45`, actual `ring-2 ring-neutral`, skeleton, foco roving | M | Quita `.hk-pdf-thumbnail*` (no documentado) |
| Página sin anillo ni skeleton propio: toda la pila queda invisible hasta el primer render | `ui/pdf-pages.component.html:31,42,84-91` | Hoja (§C) + skeleton por página + «—» si falla | M | No |
| Errores hechos a mano (`text-error`, `border-error/20 bg-error/10`) | `pdf-pages.html:5-19`, `pdf-digital-sign-dialog.html:65`, `pdf-page-organizer.html:177` | `alert` centrado `max-w-md`, `role="alert"` | S | No |
| Vacíos en `/40 italic` (probable fallo de contraste AA) | `pdf-sidebar.html:166,172,191`; `/60 italic` en `pdf-comments.html:2,84`, `pdf-signatures-panel.html:10` | `/70` centrado, sin itálica | S | No |
| `text-[10px]`/`text-[11px]` (14×); `z-[1]` frente a `z-[40]`; menú con `shadow` en vez de `shadow-lg` | `pdf-comments`, `pdf-signatures-panel`, `pdf-toolbar.html:227,322` | `text-xs`; una sola escala z; `shadow-lg` | S | No |
| 5 menús con `<details class="dropdown">` | `pdf-toolbar.html:216,314`, `pdf-annotation-toolbar.html:83,157,206` | Popover API | M | No |
| Marca como tinte, borde o texto: medición, muestras de color, comentario activo, organizador; `link link-primary` en un `<a>` sin `href` ni acción (también es bug a11y) | `pdf-annotation-panel.html:69-70,359-361`, `pdf-comments.html:45`, `pdf-page-organizer.html:84,141,152,159,166`, `pdf-viewer.html:31` | `ring-neutral`/`border-base-content`; tarjeta `bg-base-200` para la medida; quitar el enlace muerto | M | No |
| Pestañas `tabs-bordered`: es el nombre de v4, así que **en v5 se ven sin estilo** | `pdf-signature-dialog.html:42` | `HK_THEME.classes.tabsBorder` | S | Arregla v5 |
| El editor de texto usa backdrop y sombra propios en CSS | `ui/pdf-text-editor.component.html`, `pdf-viewer.component.css:404-433` | `<dialog class="modal">` como los otros 4 diálogos; −30 líneas de CSS | S | No |
| La barra de búsqueda no tiene `flex-wrap` y desborda a 320 px | `pdf-find-bar.html:2`, `pdf-form-design-toolbar.html:53` | `flex-wrap`, truncar | S | No |
| Variables `--hk-pdf-primary/-accent/-warning/…` en `:host` | `pdf-viewer.component.css:24-28` | Pasarlas a tokens neutral/base | M | **Sí, leve**: se pueden sobrescribir, aunque no están documentadas |
| Overlays sobre la página (adornos, asas, cajas de diseño, botón de firma, enlaces) en primary | `pdf-viewer.component.css:255-290, 474-625` | `neutral` (regla 7); clases en las plantillas y en los nodos imperativos (`pdf-layers.service.ts:113`, `pdf-forms.service.ts:460,480,519,583`) | M | No |

El CSS de 625 líneas se reparte así:
- **~330 líneas inevitables**: geometría de página, canvas, tiles, capa de texto, posición de las capas de anotación, formulario y diseño, `contain`, `touch-action`, `[hidden]` para TW3. Se quedan.
- **~200 líneas de estilo** que pasan a clases: miniaturas, editor de texto, tintes de enlaces y widgets, adornos.
- **Por decidir** (§G): el color de la selección de texto y de las marcas de búsqueda.

`.hk-pdf-viewport` se queda: el propio CSS dice a los consumidores que lo sobrescriban.

### B.2 `hk-document-viewer` (y el shell del editor)

| Qué choca hoy | Dónde | Cambio propuesto | Esf. | API |
|---|---|---|---|---|
| **Iframes transparentes: el texto negro no se lee en tema oscuro** (es un bug) | `renderers/html.renderer.ts:52-59`, `eml.renderer.ts:80-87`, `msg.renderer.ts:63-70` | Excepción del papel: `bg-white` + `color-scheme: light` en el `srcdoc` | S | Corrige |
| Pestañas `tabs-bordered` (nombre de v4: **sin estilo en v5**); sin `aria-selected`, sin roving, sin `tabpanel` | `renderers/spreadsheet.renderer.ts:53-64` | `join` de `btn-sm` con `aria-pressed`, o `HK_THEME`; flechas; llevarlo a la toolbar | S–M | Arregla v5 |
| Cargando: 12 copias de texto `/60` sin spinner, sin `role="status"` ni `aria-busy` | `text:22, html:40, docx:36, epub:35, eml:45, msg:28, spreadsheet:47, rtf:40, image-special:35`; editores `plain-text:23, markdown:22, csv:40` | Componente de estado (§C) | S | No |
| Errores: 11 copias de `alert-error` a todo el ancho, sin `role="alert"` | mismas rutas, líneas +2 | `alert` centrado `max-w-md` | S | No |
| Vacíos en `/50` y `/60` | `spreadsheet:71`, `csv.editor:46`, `unsupported:16,21`, `rtf:234` | `/70` centrado; en «no soportado», badge con el nombre + botón Descargar | S | No |
| Marcos `border-base-content/10 rounded` sin sombra | `docx:45, epub:42, eml:50/84/89, msg:33/67/72, rtf:44, html:56, image:20` | Tarjeta u hoja de §C | S | No |
| `prose prose-sm` sin `@tailwindcss/typography` (no hace nada) | `rtf.renderer.ts:44` | Variantes arbitrarias (`[&_p]:mb-3`) | S | No |
| docx-preview inyecta chrome propio (fondo gris, padding 30px, sombra `rgba`) | `docx.renderer.ts:100-113` | `inWrapper:false` y montar la mesa y las hojas con clases; los estilos del contenido se quedan | M | No |
| EPUB con alturas fijas en JS (`600px`, `minHeight 500`) | `epub.renderer.ts:44,96-98` | Cadena `h-full` | S | No |
| Botón «Editar» flotante encima de la toolbar del PDF (dos filas de chrome); se muestra aunque el formato no tenga editor | `document-viewer.component.ts:79-83` | Condicionarlo a `resolveEditor(format)`; en el workspace va dentro de la toolbar como el único `btn-primary` | S | No |
| `outline-none` en textareas: sin foco visible | `document-editor/…/markdown.editor.ts:28`, `plain-text.editor.ts:35` | `focus-visible:outline-2 outline-base-content` | S | No |
| Toolbar del shell del editor con `bg-base-300/70`, pulsado `btn-active`, sin badge; reutiliza `hk-editor-toolbar` (TipTap) | `document-editor-shell.component.ts:27-59`, `editor/editor-toolbar.component.ts:23-39` | El shell usa el shell de toolbar (§C); `hk-editor-toolbar` no se toca | M | No |
| El comentario de tipos promete `createDocumentViewer({...})`, que no existe | `document-viewer.types.ts:70` | Crearlo (§E.3) | — | Aditivo |

### B.3 Resto de la librería

La gramática se pensó para un visor. **Aplica completa** a la toolbar y los estados de datagrid y table.
**Aplica en parte** a overlays (command palette, alert, diálogo, menús, pickers) y a toast/notification:
ahí los colores de severidad son legítimos. **No aplica** a navbar, inputs ni dynamic-form, salvo estados y a11y.

**Bugs reales** que conviene arreglar aunque no se cambie el estilo:

| Bug | Dónde |
|---|---|
| `--hk-color-error: oklch(var(--er))` usa la variable de v4: **no tiene color en v5** (el estado de error del stepper sale sin color) | `ng-daisyui/styles.css:31,42` |
| `kbd-primary` no existe en ninguna versión de daisyUI | `command-palette.component.html:144` |
| `aria-selected` en `<button>` sin listbox ni `aria-activedescendant` (axe: aria-allowed-attr) | `command-palette.component.html:98-106` |
| Clases `animate__*` sin que animate.css sea dependencia; `minWidth: 24rem` desborda a 320 px | `dialog-wrapper.component.html:1`, `services/dialog/dialog.service.ts:64` |
| `role="alert"` duplicado dentro de una región `assertive`: se anuncia dos veces | `notification-item.component.ts:35`, `.html:97,124,142`, `notification-host.component.html:1` |
| Foco con `hsl(var(--p))` (variable de v4): no funciona en v5 | `notification-item.component.css:65` |
| Barras de filtros y de selección con `role="alert"`: anuncian en tono asertivo en cada cambio | `table.component.html:65-68,107-110` |
| `.toast-top/-bottom/…` sin layer pisan las clases `toast` de daisyUI en la app consumidora | `ng-daisyui/styles.css:136-160` |
| Disabled de `.input/.select/.textarea` con `!important` global: cambia todos los inputs del consumidor | `ng-daisyui/styles.css:89-107` |
| Clases solo de v5 sin puente: `menu-active`/`menu-disabled`, `badge-soft`, `alert-soft` | `menu.component.html:37,63,72,76,88`, `command-palette.html:29,100-101`, `toast.component.ts:68-70` |
| `tab-border-none` no existe | `tab-group.component.html:19` |
| Los temas Kaizen no están en `exports` de `package.json` | `ng-daisyui/package.json` |

**Estilo, por componente**:
- **table**:
  - acciones de fila en colores (`table.component.ts:1254-1262`), y cambiarlas es un cambio visual para quien use los valores por defecto;
  - un `btn-primary` por cada filtro activo (`.html:1151-1157`);
  - toolbar con `bg-base-200/50` (`.html:29`);
  - paginación sin `flex-wrap` e ids fijos duplicados (`table-pagination.component.ts:67,73,243`).
- **datagrid**: toolbar `gap-2 p-2` sin badge ni clúster (`datagrid.component.html:3`); estados en texto plano (`:254-264`).
- **toast / notification**: acción por defecto `btn-outline` (`toast.component.ts:116-121`); `variant: 'outline' | 'soft'` en la API pública (`notification.types.ts:29`), que se conserva pero se mapea a `btn`.
- **datepicker**: `hover:bg-primary` en cada celda y hoy con `btn-outline` (`datepicker.component.html:118,127,138`).
- **timepicker / stepper**: CSS propio (350 y 40 líneas).
- **alert-overlay**: cancelar en `btn-ghost`, textos `/50`.

**Conflicto con tu preferencia guardada**: los chips de filtro de datagrid y table y la opción elegida de `hk-select` usan
el chip tenue `bg-primary/10 text-primary` **a propósito** (tu preferencia de badges suaves). La regla 1 de «Mesa» lo
prohíbe. Hay que decidir cuál gana (§G).

---

## C. Piezas internas compartidas

Hoy no existe ninguna; `utils/` y `directives/` no tienen nada de UI. Además, `CLAUDE.md` menciona un `AccessibilityService` que no existe.

| Pieza | Qué es | Dónde se repite hoy |
|---|---|---|
| `hk-mesa-layout` | Bloque exterior + cuadrícula rail · centro · inspector; paneles ocultables con el botón del divisor (`aria-expanded`, `inert`, ancho recordado); pliegue en `details` según el ancho del componente; enlace de salto | Nuevo (lo usan los dos workspaces y `hk-page-workspace`) |
| `hk-mesa-toolbar` | Fila de toolbar: slot de badge (`min-w-0 truncate`), slot de estado de guardado, clúster `ml-auto` que baja entero | 5 toolbars del pdf-viewer, organizador, table, datagrid, shell del editor, footer de command palette |
| Directiva `hkIconButton` | `btn btn-sm btn-square` + `aria-label` + `title` + icono 16 px + `aria-pressed`/`btn-primary` cuando está pulsado | ~45 en pdf-viewer, ~25 en el resto |
| `hk-page-frame` | Hoja o miniatura: anillo, papel blanco, skeleton, «—», estados actual y seleccionado, `aspect-ratio` | Página, miniatura y organizador del PDF; image y docx en document-viewer; `page-thumb` de Docsy |
| `hk-state` | Cargando, error, bloqueo y vacío con su ARIA (`role`, `aria-live`, `aria-busy`) | 12 + 11 en document-viewer; 7 en pdf-viewer; table, datagrid, tree, select, command palette, virtual-scroller |
| `HkAnnouncer` | Servicio sobre `LiveAnnouncer` del CDK, con una sola región por componente | pdf-viewer, organizador, editor, datagrid, table |
| `hk-save-status` | Spinner xs + «Guardando…» / check + «Guardado» / punto «sin guardar», `role="status"` | Shell del editor; nuevo en los workspaces |
| Clases de overlay en `HK_THEME` | `overlaySurface`, más las claves `menuDisabled`, `badgeSoft`, `alertSoft` | 6 formas distintas de escribir el panel flotante |
| `hk-rail-list` | Lista virtual con foco roving y fila actual (`aria-current`, `ring-inset ring-base-content/45`) | Miniaturas del sidebar, índice, adjuntos; rail de Docsy |

Todo vive en `src/lib/components/mesa/` (o en `src/lib/ui/`) y **no** se exporta en la primera versión: son internas
hasta que se estabilicen.

---

## D. Cómo verificar que no se rompe a11y ni temas

1. **axe en navegador real.** Añadir `@axe-core/playwright` (MPL-2.0, solo en desarrollo) al Playwright que ya existe
   (`playwright.config.ts`, `e2e/`). Se recorren las rutas de demo de los dos visores y de las dos variantes:
   - en `demo` (daisyUI 5 / TW4) y en `demo-v4` (daisyUI 4 / TW3);
   - en los temas `light`, `dark` y uno de alto contraste de color (`cupcake` o `kaizen`);
   - con las reglas `wcag2a`, `wcag2aa`, `wcag21aa` y `wcag22aa`.

   El contraste solo se puede medir en un navegador real: jsdom no calcula colores.
2. **Reflow.** Con viewport de 320, 720, 1100 y 1440 px, comprobar en cada ancho que `scrollWidth <= clientWidth` en el host y en `document.documentElement`.
3. **Teclado.** Specs en Vitest (jsdom) para el foco roving del rail, la cuadrícula y las pestañas: una sola parada de Tab, flechas, Home/End, `aria-current` y `aria-pressed`.
   Un test de Playwright recorre el workspace solo con Tab y comprueba que el foco es visible en cada parada (`outline-style != none`).
4. **Capturas de regresión.** `toHaveScreenshot()` de Playwright por ruta × tema × versión, en los mismos anchos.
   La primera ejecución crea la línea base; los diffs se revisan a mano.
5. **Guardia de estilo.** Un script de lint (en `scripts/`) que falle si en los archivos de los workspaces y de las piezas `mesa` aparece:
   - `btn-outline`, `btn-soft`;
   - `text-primary`, `border-primary`, `ring-primary`, `bg-primary/`;
   - `text-base-content/(40|50|60)`;
   - colores hex o `rgb(` en plantillas;
   - clases solo de v5 fuera de `HK_THEME`.

   Barato y evita que vuelva a pasar.
6. **Lo de siempre.** prettier, eslint, `ngc --noEmit`, `ng test`, el harness `test-pdf-engine.mjs` y los builds de lib, demo y demo-v4.

---

## E. Diseño de las variantes

### E.1 Distribución común (`hk-mesa-layout`)

```
┌ bloque bg-base-100 rounded-box border shadow-sm ─────────────────────────────────────────┐
│ ┌ rail 288px ─┐┃┌ centro ─────────────────────────────────────────┐┃┌ inspector 384px ─┐ │
│ │ cabecera    │◀│ toolbar: [badge nombre · n pág] ✓Guardado   ⟨‹ 3/12 ›⟩ ⟨− 100% +⟩ ⟨▤ ▦⟩ ⋯ │▶│ sección        │ │
│ │ (join modo) ││ toolbar secundaria (anotar / diseñar) si está activa              ││ sección        │ │
│ │ lista       ││ barra de búsqueda (si está abierta)                                ││ sección        │ │
│ │ virtual     ││ mesa bg-base-200 con la hoja / cuadrícula                          ││                │ │
│ │             ││ barra de selección (si hay varias páginas elegidas)                ││                │ │
│ └─────────────┘┃└──────────────────────────────────────────────────────────────────┘┃└────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Medido sobre el ancho del componente:
  - por debajo de 1100 px el inspector se pliega en un `details` debajo de la mesa;
  - por debajo de 720 px también el rail, en un `details` arriba.
- Paneles ocultables con el botón circular sobre el divisor; el estado se recuerda por navegador.
  La clave es configurable con `workspace.storageKey`, y el acceso a `localStorage` va en try/catch.

### E.2 `hk-pdf-workspace`

**Requisito previo (opción B).** Hoy todo está atado al host `hk-pdf-viewer`:
- los 16 servicios se proveen en el componente (`pdf-viewer.component.ts:107-124`);
- la conexión, el controlador y el teclado viven en la clase (`:220-304, 319-462`);
- el CSS es `:host ::ng-deep` (`pdf-viewer.component.css:5-14`).

Se extrae, **sin cambio visible**:
1. `PdfViewerHostDirective`, que se usa como `hostDirectives`. Lleva los providers, los inputs (`src`, `config`, `formValues`), los outputs, `store.connect`, `attachController`, el teclado, copiar/pegar y `tabindex`. `hk-pdf-viewer` y `hk-pdf-workspace` la declaran igual, así que la API es idéntica por construcción.
2. La hoja de geometría pasa a `ViewEncapsulation.None` con raíz `.hk-pdf` (clase que ponen ambos hosts) en lugar de `:host`.
3. Las miniaturas salen del sidebar a un `hk-pdf-thumbnails` reutilizable. `PdfThumbnailsService` deja de depender de `sidebarOpen && sidebarTab === 'thumbnails'` y pasa a una señal «visible» y a un ancho por input.
4. Los paneles flotantes (`pdf-annotation-panel`, `pdf-form-field-panel`) se separan en cuerpo y carcasa, con `variant: 'floating' | 'docked'`, como ya hace `hk-pdf-pages`.
5. Señal `dirty` reactiva para el estado de guardado (hoy `documentEdited` es un getter sobre un `Set`).
6. `openComments` y la carga diferida de índice y adjuntos dejan de forzar o depender del sidebar: piden «mostrar comentarios» y cada variante decide dónde.

**Rail.** Cabecera con un `join` `btn-xs` de modos: Páginas · Índice · Marcadores · Adjuntos. Solo aparecen los que el
documento tiene.
- Páginas: miniaturas virtuales con foco roving. La actual lleva `ring-2 ring-neutral` y el número en `badge-primary`.
- El modo «Documentos» queda reservado para la versión multi-documento.

**Toolbar.**
- A la izquierda, un badge con el nombre del archivo y el número de páginas. Pasa a `badge-secondary` con «Anotando» o
  «Diseñando formulario» cuando hay un modo de edición activo, con botón para salir.
- Junto al badge, el estado de guardado.
- A la derecha:
  - `join` del paginador;
  - `join` del zoom;
  - `join` de vista: Hoja (continua) / Cuadrícula;
  - un menú popover con imprimir, descargar, pantalla completa, rotar e importar.
- El único `btn-primary` de la superficie es Guardar, y solo si hay cambios. Si no los hay, ningún botón es primario.

**Mesa.**
- **Hoja**: `hk-pdf-pages` tal cual, con anillo de hoja y skeleton por página.
- **Cuadrícula**: es el organizador de páginas **en línea**, en lugar de en diálogo. Usa la superficie del editor de lotes de Docsy:
  - tarjetas con su miniatura, botones de mover, rotar y borrar (WCAG 2.5.7), y arrastrar con CDK;
  - deshacer y rehacer;
  - aplicar con `pages.apply()`.

  El diálogo del visor clásico se mantiene.
- **Barra de selección** abajo cuando hay varias páginas elegidas: rotar, borrar, extraer y duplicar.

**Inspector.** Secciones apiladas, separadas por líneas finas:
1. **Selección**, solo si hay algo seleccionado: propiedades de la anotación o del campo de formulario, con los paneles en modo `docked`.
2. **Comentarios**: `hk-pdf-comments`.
3. **Firmas**: `hk-pdf-signatures-panel`.
4. **Documento**: título, autor, páginas, tamaño, versión, permisos y si es incremental.

Diálogos, atajos de teclado, búsqueda y capas: lo mismo que en el visor clásico.

### E.3 `hk-document-workspace`

Hoy los renderers no exponen nada: ni páginas, ni navegación, ni zoom, ni metadatos (contrato
`DocumentRendererInputs {source, format, filename}`, `document-viewer.types.ts:53`). Se añade, sin romper nada:

1. **Canal opcional por renderer**: un input `host: DocumentViewerHost`, como el `bridge` del editor. El renderer publica
   `DocumentViewState { status, error, sections[{id,label,kind}], current, zoom?, canZoom, metadata }` y registra
   `goTo`, `zoom` y opcionalmente `thumbnail`. Sin ese input, el renderer funciona como hoy, así que los renderers de
   terceros no se rompen.
2. **`createDocumentViewer()`**, el controlador que los tipos ya prometen: señales del estado y
   `goTo/next/prev/zoomIn/zoomOut/setZoom`, enlazado tarde vía `_internal`, igual que el editor y el PDF.
3. **Qué ve el rail según el formato**:
   - **PDF**: `hk-document-workspace` delega en `hk-pdf-workspace` completo.
   - **Hoja de cálculo**: una entrada por hoja.
   - **DOCX**: una por página que genera docx-preview.
   - **EPUB**: los capítulos del TOC de foliate (falta verificar esa API).
   - **Correo**: el cuerpo y una entrada por adjunto.
   - **Imagen, texto, HTML y RTF**: una sola sección. En ese caso el rail se oculta y queda una tira mínima.
4. **Toolbar**:
   - badge con el nombre y el formato;
   - paginador si hay más de una sección;
   - zoom si el formato lo soporta;
   - **Editar** como el único `btn-primary`, solo si existe editor para ese formato.

   Al editar, la mesa muestra el shell del editor con el badge en `badge-secondary` «Editando» y el estado de guardado.
5. **Inspector**:
   - **Archivo**: nombre, MIME, extensión, tamaño, codificación.
   - **Específico del formato**: cabeceras del correo, hojas de cálculo con su tamaño, metadatos EPUB, dimensiones de imagen.
   - **Acciones**: descargar, abrir original.
6. Los renderers dejan de dibujar sus propios estados de carga y error: los pinta el shell con `hk-state`.

### E.4 Hacia varios documentos (no entra en v1)

- El rail gana el modo «Documentos»: una fila por documento con la miniatura de la primera página, nombre, formato y
  número de páginas. Es el mismo patrón que los lotes de Docsy.
- API prevista: `documents: WorkspaceDocument[]` y un documento activo, con `activeChange`.
- En el PDF, cambiar de documento reutiliza la instancia de servicios (`close` + `load`). El pool de workers y la caché
  de rasters por clave ya lo soportan.
- Más adelante, mover páginas entre documentos se apoya en lo que ya hace la fase 7: fuentes múltiples e
  `importPages` desde otro PDF.
- Para que esto no obligue a rehacer nada, desde v1 el rail se construye con modos y el controlador con
  `documents`/`active` reservados.

---

## F. Orden propuesto

| Paso | Contenido | Riesgo |
|---|---|---|
| W0 | Arreglar los bugs de §B.3 y los de v5 en los visores (`tabs-bordered`, iframes en tema oscuro, `--hk-color-error`) | Bajo |
| W1 | Piezas `mesa` (§C) + extracción del host del PDF (E.2, puntos 1-6) **sin cambio visible**; toda la suite verde | Medio: toca el corazón del visor |
| W2 | `hk-pdf-workspace` + demo en las dos apps + e2e axe | Medio |
| W3 | Canal de renderers + `createDocumentViewer()` + `hk-document-workspace` + demo | Medio |
| W4 | (Opcional) pasar el visor clásico y otros componentes a «Mesa» con la tabla de §B | Bajo por partes |

La fase 8 del refactor del PDF (redacción) queda en pausa hasta terminar W2.
El `REFACTOR_PLAN.md` (§6, ~721-741) prescribe `ring-primary`, `badge-soft`, `tabs-box` y más `--hk-pdf-*`, lo que
contradice «Mesa». Se reconcilia en W1.

---

## G. Decisiones pendientes

1. **¿El visor clásico también adopta «Mesa» (W4)?** Dijiste que lo actual se queda. Puede quedar tal cual o
   restilizarse sin cambiar su distribución.
2. **Chips tenues frente a la regla 1.** ¿Se permiten `bg-{color}/10 text-{color}` para chips y filtros (tu preferencia
   guardada), o solo neutral y relleno?
3. **Colores de estado en el visor.** Para la validez de firmas y el estado de comentarios: ¿icono + color semántico solo
   en el icono, o neutral estricto?
4. **Selección de texto y marcas de búsqueda en el PDF.** Hoy usan primary, warning y accent. La propuesta es
   `neutral/25` para la marca, `neutral` con borde para la actual y el color de selección del sistema para el texto.
5. **Nombres.** `hk-pdf-workspace` / `hk-document-workspace` y la guía «Mesa». ¿Te valen?
6. **Bugs de §B.3 en W0**: algunos son ajenos a los visores (styles.css global, toast, command palette). ¿Los arreglo
   aquí, o los dejo anotados para otra sesión? Ojo con `styles.css`: el `!important` de los disabled cambia el aspecto
   en las apps consumidoras.

---

## Estado (2026-10-13)

Decisiones tomadas por defecto (§G): el visor clásico conserva su aspecto (solo correcciones de bugs y de a11y);
«Mesa» se aplica completa en los workspaces; color semántico solo en iconos; nombres `hk-pdf-workspace`,
`hk-document-workspace` y «Mesa»; de los bugs ajenos a los visores se corrigieron `--hk-color-error` y `kbd-primary`,
el resto queda anotado en §B.3.

### W0 ✅ (`d186d75`)
Pestañas `tabs-bordered` → `HK_THEME.tabsBorder` (firma, hoja de cálculo); `--hk-color-error` con `--color-error`;
iframes HTML/EML/MSG sobre papel blanco; `kbd-primary`; etiqueta del select de zoom y textos fijos a `PdfViewerLabels`;
enlace muerto del layout preview.

### W1 ✅ Base compartida
- `pdf-viewer-host.ts`: `PDF_VIEWER_PROVIDERS` + `PdfViewerHostBase` (inputs, outputs, `store.connect`, controlador,
  teclado, portapapeles). `hk-pdf-viewer` y `hk-pdf-workspace` lo extienden: misma API por construcción. El CSS del
  visor se reutiliza con `styleUrl` (el `:host` se aplica a cada host), sin cambiar la encapsulación.
- Store: `dirty` (señal), `loadedInfo`, paneles visibles (`shownPanels` / `visiblePanels` / `revealPanel`). Miniaturas,
  carga diferida de índice y adjuntos, «abrir comentarios» y «ver firmas» ya no dependen del sidebar.
- `ui/pdf-chrome.ts` (`PDF_CHROME`): clases de barras, botones, pulsado y paneles. El clásico conserva sus clases
  exactas; el workspace provee las de «Mesa» (joins, `btn-sm`, pulsado = `btn-primary`, paneles acoplados).
- Organizador: modo `inline` (cuadrícula del workspace): cada edición se aplica al momento y el deshacer es el del
  documento. Botones «Mover antes / después» (WCAG 2.5.7, también en el diálogo). Arreglado: Ctrl+Z dentro del
  organizador también llegaba al atajo del visor (doble deshacer).
- Piezas internas `components/mesa/`: `hk-mesa-layout` (rail · centro · inspector, paneles ocultables recordados,
  pliegue por ancho del componente), `hk-mesa-toolbar`, `hk-mesa-state`, `hk-mesa-save-status`.
- Contraste: textos `/40` y `/60` del visor a `/70` (axe lo detectó en cupcake).

### W2 ✅ `hk-pdf-workspace`
Rail (miniaturas virtualizadas con foco roving, índice, adjuntos) · toolbar (badge, estado sin guardar, paginador,
zoom, vista Hoja/Cuadrícula, herramientas, menú; Descargar como único primario cuando hay cambios) · barras de
anotación, diseño y búsqueda · inspector (selección acoplada, documento, firmas, comentarios). `toggleSidebar()`
alterna el rail; `organizePages()` abre la cuadrícula, que se superpone a la hoja sin desmontarla.

Verificado: 6 specs jsdom (`workspace/pdf-workspace.spec.ts`), suite completa 63 archivos / 1818 tests, e2e
`e2e/pdf-workspace.spec.ts` (axe WCAG 2.2 AA en light, dark, kaizen y cupcake, cuadrícula y anotación; reflow a
1280/900/600/375; teclado; paneles) 11/11, builds de lib, demo y demo-v4, capturas en daisyUI 5 y 4.
axe: `target-size` se excluye solo en el contenido de las páginas (los campos del PDF tienen el tamaño que fija el
documento, excepción «esencial» de 2.5.8).

Pendiente: menús con Popover API (ver guía §7); `hk-pdf-comments` y `hk-pdf-signatures-panel` aún con su marcado
clásico dentro del inspector.

### W3 ✅ `hk-document-workspace`
- `DocumentViewerHost` (público): canal opcional por DI. Un renderer lo inyecta con `{ optional: true }` y publica
  secciones, la actual, propiedades y cómo navegar. Los renderers propios que no lo usan funcionan igual.
  Publican: hoja de cálculo (hojas), DOCX (páginas, con la actual por IntersectionObserver), EML/MSG (cabeceras y
  adjuntos), imagen (dimensiones).
- `BUILT_IN_RENDERERS` pasa a `document-viewer.builtins.ts` (compartido por el visor y el workspace).
- Workspace: rail de secciones (si hay más de una) con foco roving · toolbar (badge con nombre y extensión, paginador
  de secciones, zoom genérico con CSS `zoom`, Editar como único primario si el formato tiene editor) · documento sobre
  una tarjeta en la mesa, o el editor · inspector (archivo, propiedades del formato, Descargar). Los PDF abren en
  `hk-pdf-workspace` (`[pdfConfig]`). Textos con `provideHkDocumentWorkspaceLabels`.
- Verificado: 5 specs jsdom, suite completa 64 archivos / 1823 tests, e2e `e2e/document-workspace.spec.ts` (axe en
  light, dark y cupcake, modo edición, reflow) 7/7, builds de lib, demo y demo-v4, capturas en el navegador.

Pendiente: EPUB (capítulos desde el TOC de foliate) y RTF/HTML sin secciones; las etiquetas de las propiedades que
publican los renderers están en inglés, como el resto de sus textos.

### W3b ✅ Lista de documentos (como el expediente de Docsy)
- `hk-document-workspace` acepta `[documents]: WorkspaceDocument[]` (cualquier formato: `id`, `name`, `src`,
  `mimeType?`, `description?`, `pages?`, `thumbnail?`) y `[(active)]`. Sin `active` abre el primero; `[src]` sigue
  sirviendo para un solo documento.
- El rail lista los documentos (`hk-document-list`): vista previa (miniatura dada, la propia imagen o un icono por
  formato), nombre, línea «EXT · descripción · n p.», el abierto con `aria-current`; flechas mueven el foco, Enter abre.
  Modo «Contenido» con las secciones del documento abierto.
- Los PDF siguen abriendo en `hk-pdf-workspace` con todas sus funciones; la lista entra como su modo de rail extra
  (`[extraRail]`, público), así que el rail es el mismo para todos los formatos. `[fileName]` (nuevo en la base
  compartida) nombra el badge y las descargas.
- Si el documento abierto tiene cambios sin guardar (PDF editado o editor con cambios), abrir otro pide confirmación
  (Seguir editando / Descartar y abrir).
- Verificado: specs jsdom (lista, `[(active)]`, teclado, confirmación, rail extra), suite completa 64 / 1828, e2e
  (axe en light, dark y cupcake sobre PDF y texto, edición y confirmación, teclado, reflow) 19/19 junto con los del
  PDF, builds de lib, demo y demo-v4.

### Fuera de alcance (decidido 2026-10-13)
El conjunto de páginas entre documentos al estilo del expediente de Docsy («página i de n» a través de lotes, tira y
hoja de contactos cruzadas, etiquetas, verificación) es específico de esa app y no entra en la librería. Los
workspaces son genéricos; una app lo construye encima con `WorkspaceDocument.thumbnail` / `description`,
`[extraRail]` y `DocumentViewerHost`. Ver también [`page-workspace.md`](page-workspace.md) (informe previo, no se
implementará en la librería).

### W3c ✅ Un workspace es para varios documentos
- `hk-pdf-workspace` también toma `[documents]` + `[(active)]` (PDFs): la lista es el primer modo del rail
  («Documentos | Páginas | Índice | Adjuntos»), el mismo controlador sirve para todos, y abrir otro con cambios sin
  guardar pide confirmación. Al cambiar de documento se cierran las herramientas y la búsqueda, y vuelve la vista Hoja.
  `[src]` sigue sirviendo para un solo documento.
- La lista (`hk-mesa-document-list`) y `WorkspaceDocument` pasan a `components/mesa/`: las comparten los dos
  workspaces, sin que el visor PDF dependa del de documentos.
- La base común obtiene el documento con `currentSource()` / `currentFileName()` (sobrescribibles); `[src]` deja de
  ser obligatorio.
- El área de páginas es enfocable (`tabindex="0"`, `role="region"`, anillo de foco): axe
  `scrollable-region-focusable` con PDFs sin campos. Aplica también al visor clásico.
- Demo: tres PDFs (`public/samples/service-agreement.pdf` e `invoice-0042.pdf`, generados, más el W-9).
- Playwright local con 3 workers: más páginas con PDFium a la vez contra el dev server tumbaban un renderer.

### W3d ✅ Solo listas
Los workspaces ya no aceptan `[src]`: son para listas (`[documents]` + `[(active)]`); un solo documento es
`hk-pdf-viewer` / `hk-document-viewer`. `[src]` y `[fileName]` salen de `PdfViewerHostBase` y vuelven a
`hk-pdf-viewer` (`[src]` otra vez obligatorio); la base declara `currentSource()` / `currentFileName()` abstractos.
`hk-document-workspace` entrega el PDF abierto a `hk-pdf-workspace` como lista de uno, con su propia lista en el rail.

### W3e ✅ Rail dividido
«Documentos | Páginas» al mismo nivel sugería las páginas de todos los documentos. Ahora el rail se divide: arriba la
lista de documentos (con su propio scroll, máx. 40 % de alto) y abajo el documento abierto, con su nombre como título
(«Form W-9.pdf · 6 páginas») y, si las tiene, sus pestañas Páginas · Índice · Adjuntos (en otros formatos, sus
secciones). Se ven las dos cosas a la vez y queda claro de quién son las páginas.

### W3f ✅ Lista a la izquierda, páginas abajo (como en Docsy)
El rail dividido (W3e) no escalaba con muchos documentos. Ahora:
- **Rail**: solo la lista de documentos, a todo el alto. Con 8 o más, un filtro (nombre y descripción, sin acentos);
  con más de 60, filas virtualizadas (CDK). ↓ desde el filtro entra a la lista; Enter con un resultado lo abre.
- **Tira inferior** (`hk-pdf-workspace-strip`): las páginas del documento abierto en horizontal, plegable, con
  «Página n de N»; miniaturas pintadas mientras se ven (caché compartida); ← → Home End. En `hk-document-workspace`,
  la misma tira con las secciones (hojas, páginas DOCX).
- **Índice y adjuntos** pasan al inspector (solo si el documento los tiene).
- **Cuadrícula**: las páginas en cuadrícula, solo para ver, como la hoja de contactos de Docsy: un clic o las flechas
  hacen actual esa página (el inspector la sigue) y te quedas en la cuadrícula. Organizar es el botón «Organizar
  páginas», que abre el modal como en `hk-pdf-viewer` (igual que `controller.organizePages()`).
- Demo: botón «Add 120 documents». e2e: lista larga (virtualizada, filtro, la tira sigue dentro del workspace).
- Nota: el build de `demo` pasa el presupuesto de 4 MB con los cambios sin commit de la sesión del datagrid
  (solo con estos cambios: 3,94 MB).
