# hk-pdf-viewer → Visor + Editor PDF enterprise — Plan de refactor

> **Estado:** propuesta · **Fecha:** 2026-10-12 · **Alcance:** paridad funcional completa con Syncfusion PDF Viewer (ej2 35.1.39), sin dependencias propietarias ni AGPL, con UI 100 % daisyUI.
>
> Este documento reemplaza la sección "PDF" de `document-editor.roadmap.md` (que aún asume pdf.js + pdf-lib) y deja obsoletos `PERFORMANCE.md` / `RUST_ENGINE.md` (era pdf.js). `PDFIUM_ENGINE.md` sigue vigente como referencia del motor.

---

## 0. Cómo se obtuvo la evidencia

| Fuente | Método | Qué produjo |
|---|---|---|
| `@syncfusion/ej2-pdfviewer@35.1.39`, `ej2-angular-pdfviewer`, `ej2-pdf`, `ej2-pdf-data-extract` | `npm pack` (sin ejecutar), lectura del `src/` sin minificar (~160 k líneas viewer + ~129 k ej2-pdf) | Arquitectura, protocolos, algoritmos (citas archivo:línea en §1) |
| REA `analyze_javascript_application` | Grafo estático de 289 módulos JS / 1.02 M nodos AST / 1 634 hallazgos | Inventario de módulos; no hay red ni IPC oculta en modo cliente |
| Parser propio de la sección *export* WASM | `pdfium.wasm` de Syncfusion vs el nuestro | **Syncfusion: 461 exports · nuestro: 468**. Misma API pública PDFium |
| Binaryen `wasm-dis` + diff normalizado de cuerpos de función | 5 683 vs 5 684 funciones | **70 % de funciones idénticas byte a byte** (normalizando índices); 289 de los exports idénticos. Diferencias = revisión de PDFium / inlining, **no** código propietario |
| Auditoría de nuestro `pdf-viewer/` | Lectura completa del componente, engine, worker, Rust crate, docs, demo | Inventario, gaps y bugs (§2) |

> Ghidra (vía REA) no carga WASM: REA solo admite ejecutables nativos y este Ghidra no tiene el plugin de WASM. Se usó `wasm-dis` en su lugar. Es suficiente, porque PDFium es open source (BSD/Apache) y su C++ original es la mejor "decompilación".

**Regla de sala limpia.** El código de Syncfusion es propietario: se estudió para entender técnicas y no se copia ni una línea. Todo lo que aparece abajo son ideas, algoritmos estándar o API pública de PDFium.

---

## 1. Cómo funciona Syncfusion (verificado)

### 1.1 Arquitectura de dos motores
- **PDFium WASM** en **un solo** Web Worker. El worker se crea con `PdfiumRunner.toString()` → Blob → `new Worker(blobUrl)` (`pdfviewer.js:5518`) y luego `importScripts(resourceUrl + '/pdfium.js')`. Este motor solo se encarga de **píxeles y texto**.
- **`@syncfusion/ej2-pdf`**, un parser y escritor de PDF en JS puro que corre en el **hilo principal**. Se encarga de la estructura: tamaños de página, links, outline, formularios, anotaciones, import/export y guardado. Por eso el documento se parsea dos veces y hay dos copias de los bytes.
- **Modo servidor:** si `serviceUrl` tiene valor, cambian a endpoints REST (`Load`, `RenderPdfPages`, `RenderPdfTexts`, …). El modo cliente reutiliza los mismos objetos de petición: `PdfRenderer` es un "servidor dentro del navegador".
- **El build de PDFium es upstream, sin parches** (verificado con REA y `wasm-dis`). **Nosotros ya tenemos el mismo motor.** Su ventaja es la capa JS, no el binario.

### 1.2 Render y virtualización
- **Scheduler:** cola con prioridad High/Medium/Low, con **una sola tarea en vuelo**. Los bitmaps se **copian** (no hay transfer list).
- **Las páginas son `<img>`:** RGBA → canvas → `toDataURL` PNG → Blob URL. `revokeObjectURL` no aparece en ningún sitio, así que hay fuga de memoria.
- **Resolución:** el raster es fijo a 1.5× e ignora `devicePixelRatio`, con un tope de 4096 px. Con zoom alto renderizan solo el viewport visible más un 10 % de margen en un canvas superpuesto ("active viewport"). Los tiles existen solo en modo servidor.
- **DOM:** se mantiene la ventana de páginas actual −3 … +4 y el resto se **elimina** del DOM. Los placeholders se posicionan en absoluto con la altura acumulada. La página actual se busca con un escaneo lineal.
- **Zoom:** niveles `[10…400] %`, fit-width/fit-page basados en la **página más ancha**, re-render con debounce de 800 ms y estiramiento CSS como paso intermedio.

### 1.3 Texto, selección y búsqueda
- **Extracción:** char a char con `FPDFText_GetUnicode/GetCharBox/GetCharAngle` → palabras → líneas, con detección de RTL.
- **Capa de texto:** un `<div>` transparente por palabra, ajustado con `measureText` + `scaleX`. La selección es la nativa del navegador, pero dirigida por código (hit-test char a char), y se reconstruye tras eliminar páginas del DOM.
- **Búsqueda:** `FPDFText_FindStart/FindNext` en el worker en lotes de 100 páginas a prioridad Medium (el render puede intercalarse), más un índice JS de respaldo. Los resaltados son divs.

### 1.4 Edición
- **Raster:** PDFium renderiza **sin** el flag `FPDF_ANNOT`. Las anotaciones se dibujan aparte, en un **canvas por página** con un grafo de escena (un ej2-diagram recortado: Container/Path/Text/Image con measure/arrange). Los handles de selección van en una capa **SVG**.
- **Modelo:** tres representaciones de las anotaciones: nodo de escena, registros JSON por tipo y página (con `status: NewlyAdded | ExistingModified | Deleted`) y la colección pública. La unidad es px CSS a 96 dpi; se convierte con ×0.75 a puntos solo al guardar.
- **Undo/redo:** pilas `actionCollection`/`redoCollection` con unos 40 tipos de acción y snapshots por `cloneObject`. Organize tiene **su propia pila**, separada.
- **Guardado:** si el documento no cambió, devuelve los bytes originales. Si cambió: re-parsea el original → *replay* del JSON (update/delete/add) → ej2-pdf genera los `/AP` → `save()` **incremental**.
- **Formularios:** inputs HTML reales superpuestos (como hacemos nosotros). El diseñador hospeda esos inputs como nodos del grafo y escribe AcroForm con las acciones JS `AFDate_*`.
- **Firmas:** dibujada (→ Ink), escrita (→ FreeText) o subida (→ Stamp). **El viewer no firma digitalmente**, aunque ej2-pdf soporta CMS/CAdES/LTV.
- **Redacción:** `PdfRedactor.redactSync()` elimina glifos y recorta paths (Weiler–Atherton). **No redacta imágenes en modo sync**, que es el que usa el viewer.
- **Extras:** medición (distancia, perímetro, área, radio, volumen, con `/Measure` y calibración), sellos (estándar, Sign Here, dinámicos, imagen, texto), comentarios con respuestas y estado, links editables, XFDF/JSON/FDF/XML, colaboración (operaciones versionadas por `UpdateAction`), herramientas WebMCP, comparador (LCS de palabras).
- **Accesibilidad:** el texto etiquetado (tagged PDF) **solo funciona en modo servidor**. En cliente está hard-codeado `isTaggedPdf = false`.

### 1.5 Dónde podemos superarlos (mismo motor, mejor ingeniería)
| Syncfusion | Nosotros (objetivo) |
|---|---|
| 1 worker, 1 tarea en vuelo, copias | Pool de N workers, `ImageBitmap` transferible, cancelación real |
| `<img>` vía PNG + Blob URL (con fuga) | `canvas` + `drawImage(ImageBitmap)` directo; LRU con presupuesto en **bytes** |
| Resolución fija 1.5× | Consciente de DPR + tiles en zoom alto, tope adaptativo por dispositivo |
| Búsqueda lineal de página actual | Búsqueda binaria sobre los offsets acumulados |
| Dos motores, y ej2-pdf **parsea el documento entero en el hilo principal** al cargar | PDFium para leer y pintar + **`hk-pdf-writer` propio**: lazy, en un worker, que solo toca los objetos que cambian y guarda en **incremental** (§3.14) |
| UI con 9 paquetes de widgets propios (`ej2-buttons`, `-dropdowns`, `-navigations`, `-popups`, `-inputs`, `-lists`, `-notifications`, `-inplace-editor`, `-data`; verificado en su `package.json`) | **0 dependencias de UI**: clases daisyUI + CDK. El tema del consumidor se aplica solo |
| Tagged PDF solo en servidor | Árbol de estructura en cliente con `FPDF_StructTree_*` |
| Pilas undo separadas | Una sola pila de comandos (anotaciones + formularios + páginas) |
| Redacción sin imágenes (sync) | Redacción de texto + paths + **píxeles de imagen** |

---

## 2. Estado actual de `hk-pdf-viewer` (auditoría)

### 2.1 Lo que ya funciona
- **Motor:** PDFium (paulocoutinhox/pdfium-lib, tag 7623) + crate Rust `pdf-engine` (pdfium-render 0.9.2, parcheado) → worker inline vía esbuild (chunk lazy de ~6 MB, requiere CSP `worker-src blob:`), con un pool de 2 workers.
- **Render:** IntersectionObserver con buffer, LRU de 16 bitmaps, placeholder progresivo, DPR limitado a 4096 px, carga diferida de capas con `requestIdleCallback`.
- **Lectura:** búsqueda (case/whole-word), selección de texto, outline, links, adjuntos, miniaturas, pantalla completa, modos continuo y single, zoom fit-width/fit-page/auto/numérico, contraseña, layouts `default`/`preview`, slot `hkPdfToolbar`, etiquetas i18n globales.
- **Edición básica:** resaltado rectangular, nota, texto libre, tinta; formularios en overlay HTML de 5 tipos con `formValues` bidireccional; borrar e insertar páginas en blanco; rotación; `save()`, `saveAndDownload()`, `print()`, `exportPageAsImage()`, `exportText()`.

### 2.2 Bugs a corregir primero (verificados en código)
1. `emitError` pone `loaded=false`, así que **cualquier error recuperable oculta el documento entero** (`component.ts:995`, `:2735`).
2. `toViewerError` todavía mapea excepciones de pdf.js; los errores de PDFium y HTTP acaban como `unknown` (`:979`, `:899`).
3. **Link overlay `a.href = link.uri` sin sanitizar** (posible `javascript:`) (`:1824`). Hay que usar una whitelist de esquemas.
4. El `aria-label` de los links internos reutiliza "Page N thumbnail"; los widgets de formulario no usan el nombre alternativo `TU`.
5. Space y las flechas se capturan en el host aunque el foco esté en botones o tabs (`:3404`).
6. `isDesynced` del pool nunca se lee.
7. `afterAnnotationChange` → `renderAll()` re-rasteriza **todas** las páginas vivas (`:3343`).
8. `download()` entrega los bytes **originales**, así que se pierden las ediciones.
9. Los radio buttons envían `'true'`, así que `formValues` no sabe qué opción está seleccionada (`:1915`).
10. La cancelación solo ocurre en el hilo principal: el worker no tiene el caso `'cancel'`.
11. Hay N llamadas secuenciales a `pageSize` al abrir y N llamadas `pageText` en la primera búsqueda.
12. Los resaltados de búsqueda marcan el segmento completo, no el match.

### 2.3 Deuda estructural
- Un componente de **3 435 líneas** con unos 60 campos y unos 120 métodos. El HTML duplica el page-stack (`html:468` y `:778`). Los overlays se construyen imperativamente con `document.createElement`.
- **CSS:** `::ng-deep` en todas partes y colores `rgb()` hard-codeados (no son tokens daisyUI). Quedan restos de CSS de pdf.js.
- **API:** no tiene **ningún `output()`**, el estado del controller no expone tool/dirty/rotations, y `document-viewer` no puede pasar el control.
- **Tests:** solo `pdf-viewer.helpers.spec.ts` (70 líneas).
- **Repo y docs:** `pdfium_worker_inline.ts` (6 MB) está commiteado aunque el `.gitignore` dice lo contrario, y `ng-package.json` sigue listando `pdfjs-dist`.

---

## 3. Arquitectura objetivo

### 3.1 Principios
1. **Dos piezas, cada una en lo suyo:**
   - **PDFium** se encarga de leer, pintar, extraer texto y hacer operaciones destructivas de contenido (redactar, aplanar, quitar seguridad).
   - **`hk-pdf-writer`**, propio y en TypeScript, se encarga de **escribir**: anotaciones con su `/AP`, campos AcroForm, páginas, metadatos y firmas, siempre como **actualización incremental**.
   - Sin `pdf-lib`. Detalle en §3.14.
2. **Los workers de render son de solo lectura.** Las ediciones viven en un **modelo de documento** en el hilo principal (signals). El raster nunca se invalida por una anotación. Así desaparecen la desincronización del pool y el `renderAll()`.
3. **Guardar = replay de un log de operaciones** en un *writer worker* con `hk-pdf-writer`, que añade al final del archivo una sección con solo los objetos cambiados. Es la misma estrategia que Syncfusion (replay + incremental, verificada), pero sin parsear el documento entero.
4. **Páginas virtuales:** reordenar, borrar, insertar, rotar o importar es un **mapeo** `displayIndex → { sourceDoc, sourceIndex, rotation }`. No muta los workers. Las páginas importadas son documentos fuente adicionales.
5. **Funcionalidades tree-shakable.** Cada capacidad es un `provide…`/`with…` (al estilo de `Inject(Toolbar, Magnification, …)` de Syncfusion, pero idiomático en Angular).
6. **Comandos serializables.** Toda mutación es un `Command` JSON con su inversa. Eso da undo/redo unificado y deja la puerta abierta a colaboración más adelante.
7. **UI 100 % daisyUI** (§6): tokens semánticos, sin colores fijos y **sin librerías de widgets de terceros**, solo clases daisyUI y comportamiento de CDK. Al cambiar el tema daisyUI del consumidor (incluido el modo oscuro y los temas personalizados), toolbar, paneles, diálogos y adorners cambian solos. Las piezas de motor (`core/`, `hk-pdf-writer`) no tienen UI.

### 3.2 Estructura de carpetas

```
pdf-viewer/
├── core/                         # TS puro, sin Angular → testeable con Vitest
│   ├── engine/
│   │   ├── pdf-engine.types.ts   # interfaz + protocolo v2 (requestId, priority, cancel, transfer)
│   │   ├── worker-client.ts      # ex pdfium-engine.ts
│   │   ├── engine-pool.ts        # render pool (solo lectura) + writer worker dedicado
│   │   ├── scheduler.ts          # cola de prioridad High/Med/Low + cancel + dedupe
│   │   └── worker/               # pdfium.worker.ts + handlers por dominio
│   ├── geometry/                 # pt⇄px⇄viewport, matrices de rotación, quads, hit-test
│   ├── document/                 # PdfDocumentModel (signals): páginas virtuales, metadatos, dirty
│   ├── render/                   # BitmapCache (presupuesto en bytes), TileManager, RenderPlanner
│   ├── text/                     # TextIndex por página (chars/words/lines), SearchEngine
│   ├── annotations/              # modelo, AP generator, serializers XFDF/JSON
│   ├── forms/                    # FormModel, validación, formato AF*, tab order
│   ├── commands/                 # CommandStack (undo/redo/merge/transactions)
│   ├── signatures/               # signature store, PdfSigner (interfaz), validador
│   ├── redaction/                # planner + aplicadores (texto/paths/imagen)
│   ├── pdf-writer/               # hk-pdf-writer (§3.14): lector lazy + escritor incremental + AP + AcroForm + firmas
│   └── io/                       # pipeline de guardado (writer → PDFium opcional → firma), print, export, download
├── ui/                           # componentes Angular pequeños (OnPush, signals)
│   ├── viewport/                 # hk-pdf-viewport: virtual scroll de páginas
│   ├── page/                     # hk-pdf-page: canvas + capas
│   ├── layers/                   # text, search-highlight, link, form, annotation (canvas), adorner (SVG)
│   ├── toolbar/                  # main, annotation, form-designer, redaction (responsive + overflow)
│   ├── sidebar/                  # thumbnails, outline, comments, attachments, signatures, layers
│   ├── organize/                 # grid de páginas (dialog) con drag & drop
│   ├── dialogs/                  # signature, stamp-picker, text-stamp, calibrate, form-field-props, link
│   └── panels/                   # properties panel (contextual)
├── features/                     # provideHkPdfAnnotations(), withForms(), withOrganize(), …
├── pdf-viewer.component.ts       # shell < 400 líneas
├── pdf-viewer.store.ts           # estado global del visor (signals)
├── pdf-viewer.helpers.ts         # createPdfViewer()
└── …types / labels / directives
```

### 3.3 Protocolo del worker, v2
- Cada mensaje lleva `{ id, docId, op, priority, payload }`. Las respuestas se correlacionan por `id`, y existe `cancel(id)`.
- **Cancelación real:**
  - Una tarea cancelada se descarta **antes** de empezar.
  - Los renders largos usan `FPDF_RenderPageBitmap_Start/Continue` con un callback `IFSDK_PAUSE` que consulta un flag de cancelación. Esa API está exportada en nuestro build (verificado).
- **Operaciones en lote:**
  - `pageSizes()` devuelve todos los tamaños en un solo mensaje (hoy son N mensajes).
  - `textBatch(pages[])`.
  - `annotationsBatch(pages[])`.
- **Transferencias:**
  - El bitmap se crea en el worker con `createImageBitmap(imageData)` y se transfiere.
  - Una copia como máximo desde el heap WASM.
  - La ruta caliente de render llama `FPDF_RenderPageBitmapWithMatrix` directamente con `cwrap`, sin pasar por el `Vec` de Rust (hay que medirlo antes y después).
- **Prioridades:**
  - High: páginas visibles y el tile del viewport.
  - Medium: prefetch y lotes de búsqueda (cada 50 páginas, cediendo al render).
  - Low: miniaturas e índice de texto completo.

### 3.4 Render y virtualización
- **Ventanas de DOM:** solo existen los wrappers del rango `visible ± overscan`, en posición absoluta sobre una altura total precalculada. La página actual se busca por **búsqueda binaria** sobre los offsets acumulados.
  - Reutilizar `hk-virtual-scroller` si su API lo permite; si no, extraer la lógica compartida a `lib/utils/` (regla 3+).
- **Raster base:** `scale × DPR`, con tope adaptativo según la memoria del dispositivo (`navigator.deviceMemory`) en vez de un 4096 fijo.
- **Tiles:** se usan cuando el lado del canvas supera el tope. Son tiles de 512 px de la región visible, renderizados con matriz y clip, y caben en la misma caché que el raster base.
- **Caché LRU por bytes:** presupuesto por defecto de 256 MB en escritorio y 96 MB en móvil, configurable, y libera las entradas con `ImageBitmap.close()`.
- **Zoom:** escala CSS intermedia (`transform`) mientras dura el gesto y re-render con debounce de unos 150 ms. Pinch, Ctrl+rueda, doble tap y zoom centrado en el puntero. Fit-width/page usan la **página más ancha visible** (soporta tamaños mixtos).
- **Pantalla:** modo spread de 2 páginas y etiquetas de página (`FPDF_GetPageLabel`).
- **Documentos grandes:**
  - Fase A: `pageSizes` en lote más la ventana de DOM (objetivo: 5 000 páginas sin degradación).
  - Fase B: **carga por rangos HTTP**. En el worker se puede usar XHR síncrono con cabecera `Range`, que está permitido en workers, como callback de `FPDF_LoadCustomDocument`, combinado con `FPDFAvail_*` para documentos linearizados.

### 3.5 Texto, selección y búsqueda
- **`TextIndex` por página:** chars con su caja (`FPDFText_GetCharBox`/`GetLooseCharBox`), agrupados en palabras y líneas, con RTL. Se cachea con LRU y se reutiliza para búsqueda, selección, text-markup y redacción.
- **Capa de texto:** un span por **palabra** con `scaleX` (como ahora, pero a nivel de palabra) y selección nativa. La selección se reconstruye a partir de los offsets de char cuando la ventana de DOM elimina páginas.
- **Búsqueda:** `FPDFText_FindStart/FindNext` en el worker, incremental y cancelable. Los resultados llegan en streaming, con un contador "n de m" en vivo (región `aria-live`).
  - El resaltado es **exacto por char** usando `FPDFText_CountRects/GetRect`.
  - Normalización de comillas y guiones, ignorar acentos opcional, y búsqueda por regex en el índice JS.

### 3.6 Anotaciones
- **Modelo:** `HkAnnotation` es una unión discriminada por `type`: highlight, underline, strikeout, squiggly, line, arrow, rect, ellipse, polygon, polyline, cloud, distance, perimeter, area, radius, volume, freeText, ink, stamp, note, link, redact y signature.
  - **Campos comunes:** `id`/`NM`, `page`, `rect` en **puntos PDF**, `color`, `opacity`, `author`, `created`/`modified`, `locked`, `flags` y `replies[]` con estado.
- **Render de anotaciones editables:**
  - Al cargar, en los workers de render se marcan como `Hidden` con `FPDFAnnot_SetFlags` los tipos que el editor gestiona. Así el raster no las pinta y nuestra capa sí, sin desincronizar.
  - El resto de tipos (3D, multimedia, APs exóticos) se rasterizan normalmente con `FPDF_ANNOT` y quedan en solo lectura.
- **Capa de anotaciones:** Canvas2D por página para las formas, más una capa **SVG** de adorner (handles, rotación, endpoints y vértices). Se puede navegar con teclado: Tab entre anotaciones, flechas para mover, Shift+flechas para redimensionar, Supr para borrar.
- **Escritura al guardar:** se hace con `hk-pdf-writer` (§3.14). Genera el diccionario completo de cada tipo según ISO 32000:
  - Las claves que PDFium **no puede escribir** también entran: `/L`, `/LE`, `/Vertices`, `/Measure`, `/IT`, `/IRT`, `/RC`, `/State` (verificado: no hay `SetLine` ni `SetVertices` en sus exports).
  - Cada anotación lleva su **`/AP` generado por nosotros**, para que cualquier visor la muestre igual.
  - Clave privada `/HKData` (JSON) opcional, para reeditar con total fidelidad (Syncfusion hace lo mismo con `CustomData`).
- **Medición:** diálogo de calibración (ratio y unidades in/cm/mm/pt/pica/ft/ft-in/m y profundidad), etiqueta en vivo y diccionario `/Measure` estándar.
- **Sellos:**
  - Estándar y "Sign Here" como vectores propios: SVG que se convierte a path del AP.
  - Dinámicos ("Aprobado por {author} {fecha}").
  - De imagen: subida → `FPDFImageObj_SetBitmap`.
  - De texto: diseñador en un diálogo.
- **Comentarios:** panel con acordeón por página, respuestas (`/IRT`), estado (`/State`, `/StateModel=Review`), filtros por autor, tipo y estado, y bloqueo.
- **Import/export:** XFDF (ISO 19444-1) y JSON, con serializadores propios en TS.
- **Portapapeles:** copiar, cortar y pegar dentro del documento y también entre documentos (`ClipboardEvent` con un MIME propio). Orden z con traer al frente y enviar atrás (Syncfusion no lo tiene).

### 3.7 Formularios
- **Modo rellenar:** overlay HTML accesible (como ahora), pero completo:
  - Multilínea, `maxLength`, comb, password, fecha y hora, radios con valor de opción real, listbox multi, `required`, solo lectura y orden de tabulación desde `/Tabs`/estructura.
  - Formato y validación `AFNumber_*`/`AFDate_*`/`AFSpecial_*` reimplementados en TS. **No se ejecuta JS arbitrario del PDF.**
  - Import/export de datos en JSON/XFDF/FDF. `resetForm()`.
- **Diseñador:**
  - Herramientas: textbox, password, checkbox, grupo de radios, dropdown, listbox, firma, iniciales y fecha.
  - Mover y redimensionar con el mismo adorner que las anotaciones. Panel de propiedades (general, apariencia, opciones). Renombrado con detección de duplicados.
  - **Escritura:** PDFium no crea campos, así que lo hace `hk-pdf-writer`:
    - Campo y widget, añadidos a `/AcroForm /Fields` y a `/Annots` de la página.
    - `/DA` + `/DR` con las fuentes.
    - Apariencias `/On`/`/Off` para checkbox y radio.
    - Acciones `/AA` con `AFDate_*`/`AFNumber_*`.
  - Al ser incremental, **no invalida las firmas existentes**: sigue la regla de "cambios permitidos" de `/DocMDP`. Si el nivel de MDP lo prohíbe, la UI avisa y bloquea.

### 3.8 Firmas
- **Firma manuscrita:**
  - Diálogo con pestañas Dibujar / Escribir / Subir.
  - **Dibujar:** pad propio con pointer events, presión y suavizado tipo *perfect-freehand* (MIT) o una implementación propia de curvas cuadráticas.
  - **Escribir:** 3–4 fuentes manuscritas OFL, que se embeben como subconjunto.
  - **Subir:** quitar el fondo blanco y recortar automáticamente.
  - Iniciales. Firmas guardadas mediante un `SignatureStore` inyectable (localStorage por defecto, con límite configurable).
- **Dónde se coloca:** libre sobre la página o dentro de un campo de firma. Se puede aplanar (`FPDFPage_Flatten`) o dejar como anotación.
- **Firma digital** (fase opcional) mediante la interfaz `PdfSigner`:
  - (a) **Firmante externo:** el hash del ByteRange se envía a un servidor o HSM del consumidor y vuelve el CMS. Es lo recomendado.
  - (b) **PKCS#12 local** con `pkijs` (BSD-3) + WebCrypto.
  - El placeholder, el ByteRange y la inserción del CMS los escribe `hk-pdf-writer` como **última** sección incremental, sin dependencia de `@signpdf`. Soporta `/DocMDP` (firma de certificación) y firmas múltiples.
- **Validación:** se leen las firmas con `FPDFSignatureObj_*` (contenido, ByteRange, motivo y hora) y se verifican con `pkijs`. Panel de firmas en el sidebar con insignias soft (válida / modificada / desconocida).

### 3.9 Organizar páginas
- **Diálogo (modal daisyUI de pantalla completa):** cuadrícula de miniaturas con selección múltiple, arrastrar y soltar (CDK DragDrop), rotar izquierda/derecha, borrar, duplicar, insertar en blanco antes/después, importar PDF (se convierte en documento fuente adicional), extraer rango (o como archivos separados) y slider de zoom.
- **Modelo:** todo son comandos sobre las **páginas virtuales**, en la pila de undo unificada.
- **Al guardar:** lo hace `hk-pdf-writer` de forma incremental:
  - Reordenar o borrar = reescribir `/Pages /Kids` (y `/Count`).
  - Rotar = nueva versión del diccionario de página con `/Rotate`.
  - Insertar en blanco = nuevo objeto `/Page`.
  - **Importar desde otro PDF** = copia profunda del grafo de objetos de esas páginas, renumerado, con deduplicación de recursos compartidos (fuentes, imágenes).
- **Opción "compactar":** pasa por PDFium (`FPDF_ImportPagesByIndex` en un documento nuevo + guardado completo) para eliminar objetos huérfanos.

### 3.10 Redacción (verdadera)
- **Marcar:** por área, por selección de texto (usa `TextIndex`) o por páginas (actual, pares, impares, rango). Propiedades: relleno, borde, texto superpuesto (repetible) y fuente.
- **Aplicar** (writer worker, por cada página afectada):
  1. **Texto:** se recorren los objetos de texto, se calculan los chars que intersectan y se reconstruye el objeto con `FPDFTextObj_GetFont` + `CreateTextObj` usando solo los glifos que quedan.
  2. **Imágenes:** `FPDFImageObj_GetBitmap`, se pintan en negro los píxeles de la región y se aplica `SetBitmap`. Así **sí** se eliminan los píxeles, cosa que Syncfusion no hace en modo sync.
  3. **Paths:** si están dentro de la región se eliminan; si la cruzan se recortan con clipping de polígonos (Greiner–Hormann) o, como alternativa segura, se rasteriza la región.
  4. Se eliminan las anotaciones, links y widgets dentro de la región y se pinta el overlay.
  5. `FPDFPage_GenerateContent`.
- ⚠️ **La redacción obliga a un guardado COMPLETO** (`FPDF_NO_INCREMENTAL`). Una actualización incremental dejaría la revisión anterior, con el texto original, dentro del archivo. Por eso el pipeline (§3.12) pasa por PDFium siempre que hay redacción.
- **Opción "modo paranoico":** rasterizar la página completa. Además, se limpian metadatos XMP e Info y se avisa de que la redacción es irreversible.
- **Tests de regresión:** extraer el texto después de redactar y verificar que el término no aparece.

### 3.11 Undo/redo y estado sucio
- **`CommandStack`** con `execute/undo/redo`, `merge`, `beginTransaction/commit` (por ejemplo, un arrastre es un solo comando) y un límite configurable. Atajos Ctrl+Z / Ctrl+Shift+Z.
- **Estado sucio:** `dirty = stack.savedIndex !== stack.index`, con `beforeunload` opcional.
- Undo nativo de PDFium (`FORM_Undo`) solo para el texto dentro de un widget enfocado, si algún día se usa el form-fill environment.

### 3.12 Guardar, imprimir y exportar
- **Guardar** (pipeline en el writer worker):
  1. **Sin cambios** → bytes originales.
  2. **`hk-pdf-writer`** → *replay* del log de operaciones como sección incremental: anotaciones, formularios, páginas, metadatos. Cuesta O(cambios), no O(documento): en un PDF de 200 MB se añaden unos KB.
  3. **Solo si hace falta, PDFium** sobre el resultado: redacción, `flatten`, quitar o cambiar la seguridad, o "compactar". En este caso se hace un guardado **completo** (`FPDF_NO_INCREMENTAL`).
  4. **Firma digital** (opcional) → `hk-pdf-writer` añade la última sección incremental.
  - **Después de guardar**, los workers de render recargan los bytes nuevos como base y el log de operaciones se reinicia (sin perder el historial de undo si se configura así).
  - **Opciones:** `flatten` (anotaciones y/o formularios), `includeAnnotations`, `password`, `mode: 'incremental' | 'full'`.
- **`download()` guarda las ediciones** (corrige el bug 8). Hook `onSave(bytes)` para enviar a un servidor.
- **Impresión:** se renderizan las páginas con `FPDF_PRINTING | FPDF_ANNOT` a resolución de impresión en un iframe oculto, con un diálogo daisyUI de rango, escala y anotaciones sí/no. También existe el modo "nativo", que es el actual.
- **Exportar:** página como PNG/JPEG/WebP, texto, XFDF/JSON de anotaciones, datos de formulario y extracción de páginas.

### 3.13 Accesibilidad e i18n
- **Tagged PDF en cliente:** `FPDF_StructTree_*` → capa semántica oculta (h1–h6, p, listas, tablas, alt de figuras). La capa de texto plano se marca `aria-hidden` cuando la semántica existe. **Diferenciador frente a Syncfusion.**
- **Roles y foco:**
  - `role="document"`, cada página como región etiquetada, y anuncios en vivo de página, búsqueda y guardado.
  - Foco gestionado en diálogos (CDK `cdkTrapFocus`) y anotaciones accesibles por teclado.
- **Atajos:** solo cuando el foco está en el viewport. Además de los atajos se añade el diálogo de `kbd`.
- **Contraste:** los colores de resaltado de búsqueda y selección se derivan de tokens que cumplen WCAG AA.
- **Etiquetas e idioma:** `HK_PDF_LABELS` por instancia (input `labels`) además del global, y unos 20 strings que siguen hard-coded pasan a ese sistema. Se revisa RTL.

### 3.14 `hk-pdf-writer`: motor de escritura propio

**¿Por qué propio y no `pdf-lib`?** Porque funciona mejor en todo lo que importa a un editor:

| Criterio | `pdf-lib` | `ej2-pdf` (Syncfusion) | **`hk-pdf-writer`** |
|---|---|---|---|
| Modo de guardado | Reescritura completa siempre | Incremental | **Incremental** (completo opcional) |
| Firmas existentes | Las rompe | Las conserva | **Las conserva** |
| Parseo | Documento entero al cargar | Documento entero, **en el hilo principal** | **Lazy**: trailer, catálogo y solo los objetos tocados, **en un worker** |
| Coste de guardar en un PDF de 200 MB | Reescribir 200 MB | Parseo completo + append | **Append de KB** |
| `/L`, `/Vertices`, `/Measure`, `/IRT`, `/RC` | Manual, a bajo nivel | Sí | Sí, tipado |
| Firma digital | No | Sí | Sí (§3.8) |
| Mantenimiento | Upstream casi parado | Propietario | Nuestro, con tests |
| Tamaño | ~300 KB min | ~1 MB+ | Objetivo < 120 KB min (sin fuentes), lazy |

**Alcance acotado.** Es solo lo que el editor necesita. **No** es un clon de ej2-pdf, que tiene ~129 k líneas con grids, listas, capas, 3D y layout de texto. Estimación: ~10–14 k líneas de TS.

**Módulos (`core/pdf-writer/`, TS puro, sin Angular; se puede publicar como entry point secundario `@hakistack/ng-daisyui/pdf-core` para usarlo sin UI o en Node):**

| Módulo | Contenido |
|---|---|
| `syntax/` | Lexer y parser de objetos: dict, array, name, string literal/hex, número, ref, stream. Codificación PDFDocEncoding / UTF-16BE |
| `xref/` | Tabla clásica, **xref streams**, **object streams** (`/ObjStm`), híbridos, cadena `/Prev`. Reparación: si el xref está roto, se normaliza primero con PDFium (`SaveAsCopy`) |
| `filters/` | Flate decode/encode con **`CompressionStream`/`DecompressionStream` nativos** (sin dependencias), predictores PNG y ASCIIHex/85 de lectura |
| `security/` | Leer y escribir documentos cifrados: RC4 40/128, **AES-128/256** (R4/R6) con WebCrypto; MD5 y RC4 implementados en casa (son pequeños) |
| `model/` | `PdfDoc` lazy (`getObject(ref)`, `catalog`, `pages[]`, `allocRef()`, `update(ref, obj)`), con un mapa de objetos modificados |
| `writer/` | Serializador + **actualización incremental** (objetos nuevos o modificados + sección xref del mismo tipo que el original + `/Prev`) + guardado completo opcional con recolección de basura |
| `content/` | Builder de content streams (`q/Q/cm/re/m/l/c/h/S/f/B/BT/Tf/Tj/TJ/rg/RG/gs/w/d`), ExtGState para la opacidad |
| `appearance/` | Generadores de `/AP` por tipo: markup con quads, formas, **bordes nube**, flechas y line endings, tinta (suavizada a Bézier), free text con ajuste de línea, sellos vectoriales, widgets de formulario |
| `fonts/` | Métricas de las 14 fuentes estándar (AFM de Adobe, redistribuibles) para `/DA` y ajuste de línea. **TrueType: parser + subsetter** (`glyf/loca/cmap/hmtx`) para CJK, árabe, firmas escritas a mano y fuentes del consumidor |
| `acroform/` | Crear y editar campos y widgets, `/DR`, `/NeedAppearances` como alternativa, opciones y estados de apariencia |
| `pages/` | Reordenar, borrar, insertar e importar con copia profunda de objetos entre documentos |
| `signature/` | Placeholder, `/ByteRange`, hash (WebCrypto), inserción del CMS, `/DocMDP`, varias firmas |
| `interchange/` | **FDF** (usa la misma sintaxis PDF, así que reutiliza el writer) y **XFDF** |

**Cómo encaja con PDFium:**
- PDFium **lee** el documento para pintarlo.
- `hk-pdf-writer` **escribe**.
- PDFium vuelve a entrar solo para las operaciones destructivas de contenido (redacción, aplanado), que necesitan reescribir content streams y un guardado completo.
- Las dos piezas comparten las **mismas coordenadas** (`core/geometry`) y el **mismo modelo** de anotaciones, así que lo que se ve es lo que se guarda.

**Calidad:**
- Pruebas de round-trip contra PDFium: cada salida se reabre en el worker y se compara con el modelo (tipo, rect, color, `/AP` renderizado contra referencia por diff de píxeles).
- Validación con **veraPDF** / qpdf `--check` en CI (herramientas externas, solo en CI).
- Fuzzing del parser con el corpus de PDFs.

---

## 4. API pública objetivo

```ts
const viewer = createPdfViewer({
  zoom: 'fit-width',
  mode: 'continuous',            // 'single' | 'spread'
  author: 'Jose Rios',
  features: {                    // cada una se carga de forma lazy
    annotations: true,           // o { tools: ['highlight','ink','rect',…] }
    forms: 'fill',               // 'fill' | 'design' | false
    signatures: { store: 'local', limit: 5 },
    organize: true,
    redaction: true,
    measure: true,
  },
  permissions: { print: true, download: true, copy: true },   // + permisos del PDF
  onSave: async (bytes) => api.upload(bytes),
});
```

```html
<hk-pdf-viewer [src]="src" [config]="viewer.config"
  (loaded)="…" (pageChange)="…" (annotationAdd)="…" (annotationChange)="…"
  (annotationRemove)="…" (formFieldChange)="…" (pagesChange)="…"
  (dirtyChange)="…" (saved)="…" (error)="…" />
```

**Controller (sin romper la API actual, solo se añade):**
- `annotations.add/update/remove/select/list/import(xfdf)/export()`
- `forms.get/set/reset/validate/import/export`
- `pages.move/rotate/delete/insertBlank/duplicate/import(src)/extract(range)`
- `history.undo/redo/canUndo/canRedo`
- `redaction.mark/apply`
- `signatures.place/validate`
- `save({ flatten })`, `print({ range })`
- `state()`, que añade `tool`, `selection`, `dirty`, `canUndo` y `permissions`.

**Integración con `document-viewer` y `document-editor`:** `pdf.renderer` acepta un controller externo, y `document-editor` registra `resolveEditor('pdf')` → `hk-pdf-viewer` con las features de edición activas.

---

## 5. Fases de entrega

Cada fase se puede publicar por separado, deja la demo en verde y no rompe la API.

| Fase | Contenido | Criterio de salida |
|---|---|---|
| **0. Estabilizar** (1 sem) | Bugs §2.2 (1–9, 12); quitar el inline de 6 MB del repo (generarlo en el build); limpiar `pdfjs-dist` y CSS/comentarios de pdf.js; actualizar `PDFIUM_ENGINE.md`; marcar `PERFORMANCE.md`/`RUST_ENGINE.md` como obsoletos | Tests de los bugs; la demo funciona |
| **1. Partir el componente** (2 sem) | Extraer `core/` (engine, scheduler, geometry, document, render, text) y `ui/` (viewport, page, layers, toolbar, sidebar). Shell < 400 líneas. Añadir `output()`s. Tests unitarios del pool, scheduler, geometry y CommandStack | Paridad funcional 1:1 con la v actual; cobertura de `core/` ≥ 80 % |
| **2. Rendimiento** (2 sem) | Protocolo v2 (lotes, cancel, prioridades), ventana de DOM, LRU por bytes, tiles, ruta caliente con `cwrap`, búsqueda incremental con resaltado exacto, pinch/Ctrl+rueda, spread, etiquetas de página | Benchmarks §7 superados |
| **2W. `hk-pdf-writer` núcleo** (3 sem, en paralelo con la fase 2) | syntax, xref (tabla, stream, objstm), filters, model lazy, writer incremental, content builder, métricas estándar 14; tests de round-trip + qpdf `--check` en CI | Abrir → modificar `/Info` → guardar incremental en el corpus completo; PDFium y qpdf lo aceptan |
| **3. Anotaciones I** (3 sem) | Modelo + CommandStack + adorner; text markup (4 tipos, desde la selección), formas (línea, flecha, rectángulo, elipse, polígono, polilínea, nube), tinta + borrador, texto libre, nota, panel de propiedades, comentarios con respuestas y estado, guardado por replay | Round-trip: crear → guardar → reabrir en Acrobat/Chrome/PDFium se ve igual y es reeditable |
| **4. Anotaciones II** (2 sem) | Sellos (estándar, dinámicos, imagen, texto), medición y calibración, links editables, XFDF/JSON, portapapeles, orden z, bloqueo y permisos | XFDF importado y exportado valida contra Acrobat |
| **5. Formularios** (3 sem) | Relleno completo (formatos AF*, validación, tab order, radios correctos, import/export) + diseñador (`hk-pdf-writer/acroform` + subsetter TrueType + `security/` para PDFs cifrados) | Formularios IRS/gov de prueba rellenables; diseño → guardado → abre en Acrobat |
| **6. Firmas** (2 sem) | Diálogo dibujar/escribir/subir, store, campos de firma, aplanado; validación de firmas existentes | Firma visible persiste en Acrobat |
| **6b. Firma digital** (opcional, 2 sem) | `PdfSigner` (externo + PKCS#12), incremental | Acrobat la reporta válida |
| **7. Organizar** (2 sem) | Diálogo de organizar, páginas virtuales, importar, extraer, en la pila unificada | Reordenar 500 páginas sin re-render visible |
| **8. Redacción** (2 sem) | Marcar y aplicar texto/imagen/paths, modo paranoico, limpieza de metadatos | Suite de regresión: 0 fugas de texto y píxeles |
| **9. A11y + i18n + móvil** (2 sem) | Struct tree, roles, atajos, labels por instancia, toolbar responsive con overflow, gestos táctiles | AXE limpio; WCAG AA; uso completo a 375 px |
| **10. Grandes y extras** (continuo) | Carga por rangos y linearizados; comparador (diff LCS de palabras + scroll sincronizado); herramientas WebMCP; colaboración (el log de operaciones ya es serializable) | — |

---

### Estado de la fase 0 (2026-10-12, rama `refactor/pdf-viewer-phase-0`)

**Hecho:**
- Bugs §2.2 corregidos: 1, 2, 3, 4, 5, 6, 7, 8, 9 y 12.
- El 6 se resolvió con auto-reparación del pool: si una mutación falla en algunos workers, se reabren los bytes de un worker sano.
- El 9 tenía causa raíz en `pdfium-render`, que nunca registraba las páginas en el form-fill (`FORM_OnAfterLoadPage`). Se arregló con parches vendorizados y está cubierto por `npm run test:pdf-engine`.

**Diferido:**
- Sacar `pdfium_worker_inline.ts` (6 MB) del repo. Hoy es el mecanismo de distribución: `src/lib/wasm/pdf/` está en `.gitignore` y generar el worker requiere Rust + `wasm-pack` + `pdfium:fetch`. Para quitarlo hace falta decidir antes entre CI que lo genere, Git LFS o un artefacto de release.
- El bug 10 (cancelación en el worker) va en la fase 2.
- Las referencias restantes a pdf.js en comentarios internos desaparecen con la extracción de la fase 1.

### Estado de la fase 1 (2026-10-12)

El componente pasó de 3,435 líneas a un shell de 298, más estas capas:

- **`core/`** (TS puro, con tests): `geometry`, `bitmap-cache`, `text-index`, `command-stack` y `types`.
- **`services/`** (uno por visor, en los `providers` del shell): `store`, `page-data`, `viewport`, `layers`, `forms`, `find`, `thumbnails`, `annotation-tools` y `document`.
- **`ui/`**: `toolbar`, `find-bar`, `sidebar`, `pages` y `text-editor`.

Cambios de comportamiento:

- **Outputs nuevos:** `loaded`, `pageChange`, `viewerError`, `dirtyChange` y `pagesChange`. Se emiten además de los callbacks de `config`, que siguen funcionando igual.
- **El editor de texto es ahora un diálogo modal accesible** (`cdkTrapFocus`, `label` asociado, sin `autofocus`). Su fondo antes era transparente porque usaba `hsl(var(--b1))`, una variable que no existe en daisyUI v4 ni v5; ahora usa un token.

Decisiones:

- **El store lee el puente del controller desde `config`.** Así el estado funciona aunque el efecto de carga del documento se ejecute antes que el de enlazar el controller.
- **Las dependencias circulares entre servicios se resuelven con `Injector.get` perezoso**, documentado en cada caso.
- **Todo el CSS sigue en una sola hoja**, ahora con `:host ::ng-deep` en todas las reglas.

**Pendiente para la fase 2:** el scheduler del protocolo v2 (no se creó en la fase 1).

### Estado de la fase 2 (2026-10-12)

**Hecho** (un commit por punto, todos con tests):

1. **Protocolo v2 del worker:**
   - Cola con prioridad `high`/`normal`/`low`; las mutaciones actúan como barreras.
   - Cancelación real de renders encolados.
   - `pageSizes` y `pagesText` en lote.
   - Verificado con el worker real en `worker_threads` (`npm run test:pdf-engine`).
2. **Caché de rasters con presupuesto en bytes:** 96 MB o 256 MB según `deviceMemory`, configurable con `config.bitmapCacheMB`.
3. **Ventana de DOM con layout aritmético** (`core/page-layout`):
   - Solo existen las páginas cercanas a la vista; los espaciadores reproducen la altura exacta. Un documento de 1,000 páginas monta menos de 10.
   - Navegación a páginas no montadas.
   - El zoom conserva la posición de lectura.
   - El IntersectionObserver desaparece.
4. **Búsqueda en streaming:**
   - Lotes de 25 páginas a prioridad baja.
   - Muestra la primera coincidencia en cuanto existe.
   - Una consulta nueva cancela la anterior.
   - El índice WASM se reutiliza en las búsquedas siguientes.
   - Estado accesible (`role=status`).
5. **Zoom por gestos:**
   - Pinch de trackpad (Ctrl+rueda), Ctrl/⌘+rueda, eventos `gesture*` de Safari y pinch táctil.
   - Vista previa con transform CSS y commit anclado al puntero.
6. **Modos `spread` y `spread-cover`** (layout por filas) y **etiquetas de página** (`/PageLabels`): el campo de página las acepta y las miniaturas las muestran.
7. **Tiles de detalle:**
   - Con zoom por encima del límite de canvas, la región visible se renderiza nítida con `render_tile`.
   - Verificado píxel a píxel contra el render completo.
8. **Miniaturas virtualizadas** con el mismo layout.

**Bugs encontrados de paso (con commit propio):**
- **Búsqueda WASM rota desde su origen:** `new WasmPdfIndex()` en lugar del factory `WasmPdfIndex.new()` escribía en la dirección 0 del heap compartido con tablas, árboles y formularios.
- **Colores de miniaturas:** usaban variables de daisyUI v3, inexistentes en v4/v5.
- **Fallo de build de las demos** por el presupuesto de tamaño.
- **Lint de la librería.**

**Diferido:**
- La "ruta caliente con `cwrap`": hay que medir en navegador antes de tocarla.
- Tiles para páginas rotadas (hoy usan el raster reducido).
- Caché de bitmaps de miniaturas.
- **Los benchmarks de §7 no se han medido:** necesitan navegador. Hay que pasarlos en la demo de rendimiento antes de dar la fase por cerrada.

### Estado de la fase 2W (2026-10-12)

**Hecho:** el núcleo de `hk-pdf-writer` vive en `core/pdf-writer/`. Son ~1.7 k líneas de TS puro, sin dependencias.

- **Lectura:**
  - `objects`/`parser`: todos los tipos de objeto, escapes de nombres y strings, PDFDocEncoding y UTF-16BE. Si un `/Length` es erróneo, se recupera buscando `endstream`.
  - `xref`: tabla clásica, xref streams con predictores PNG, object streams, híbridos (`/XRefStm`) y la cadena `/Prev`. Si la cadena está rota, el xref se reconstruye escaneando el archivo.
  - `filters`: Flate con `CompressionStream` nativo, PNG/TIFF y ASCIIHex/85.
- **Modelo:** `PdfDoc` es lazy: solo parsea el xref y los objetos que se tocan. Ofrece `add`/`update`/`delete`, `pages()` con herencia de atributos y `setInfo`.
- **Escritura:** `saveIncremental` añade al final solo los objetos cambiados.
  - Los bytes originales quedan intactos, así que las firmas siguen siendo válidas.
  - Usa una sección del mismo tipo que la última del archivo (tabla o xref stream), con `/Prev` y un `/ID` nuevo.
  - En un archivo reconstruido escribe una sección completa sin `/Prev`, lo que de paso lo repara.
- **Contenido:** `ContentBuilder` (operadores de gráficos y de texto, elipses con Bézier) y métricas de las 14 fuentes estándar con ajuste de línea.
- **Verificación:**
  - 25 tests unitarios.
  - `npm run test:pdf-engine` reabre en PDFium cada guardado incremental (título nuevo, anotación añadida, todas las páginas renderizan) y lo pasa por `pdfinfo` si Poppler está instalado.
  - Se probaron tablas clásicas, PDFs escritos por PDFium y un PDF real (formulario W-9 del IRS: 3 xref streams, 17 object streams, varias actualizaciones incrementales).
  - Con `PDF_CORPUS=<dir>` el mismo round-trip se ejecuta sobre un corpus propio.

**Pendiente / diferido:**
- `security/` (cifrado): `PdfDoc.load` rechaza los cifrados con `PdfUnsupportedError`.
- Guardado completo con recolección de basura.
- qpdf/veraPDF en CI: qpdf no está instalado en local, así que la validación externa usa `pdfinfo`.
- Corpus amplio y fuzzing del parser.

### Estado de la fase 3 (2026-10-12)

**Hecho:**

- **Modelo** (`core/annotations/`): `HkAnnotation` cubre text markup (4 tipos), rectángulo, elipse, línea/flecha, polígono, polilínea, nube, tinta, texto libre y nota.
  - Incluye respuestas y estado de revisión.
  - Coordenadas en puntos de la página mostrada; `PageSpace` las convierte a espacio de usuario para cualquier `/Rotate` y CropBox.
- **Una sola lista de dibujo** por anotación alimenta tres salidas: SVG en pantalla, Canvas2D (miniaturas y exportar a imagen) y el `/AP` del archivo. Lo que se ve es lo que se guarda.
- **Importación** con hk-pdf-writer:
  - Los hilos (`/IRT`, `/State`) se adjuntan a su anotación.
  - Medición, callouts, grupos y ocultas quedan en el raster, en solo lectura.
  - En los workers, `set_hidden_annotations` las oculta solo mientras dura cada render, así que un guardado de PDFium no se ve afectado.
- **Edición:**
  - `PdfAnnotationsService` con `CommandStack`: undo/redo con Ctrl+Z, Ctrl+Shift+Z y Ctrl+Y; un arrastre de slider es un solo paso; estado sucio integrado en `dirtyChange`.
  - El bloqueo respeta la semántica de `/F Locked`.
  - Herramientas: markup desde la selección de texto, formas por arrastre (Shift fuerza cuadrado / 45°), polígonos vértice a vértice, tinta, borrador que parte trazos, texto libre editable en sitio, nota.
  - Adorner SVG para mover, redimensionar y editar vértices.
  - Teclado: Tab entre anotaciones, flechas mueven, Shift+flechas redimensionan, Supr borra, Enter edita o abre comentarios.
- **UI daisyUI:**
  - Fila de herramientas que se abre con "Annotate".
  - Panel de propiedades flotante (colores, relleno, opacidad, grosor, línea discontinua, terminaciones, nube, fuente, tamaño, alineación, icono, bloqueo).
  - Panel de comentarios agrupado por página, con filtros por tipo, autor y estado, respuestas, estado y edición.
  - Todos los textos pasan por `provideHkPdfLabels`.
- **Guardado por replay:**
  - `writeAnnotationChanges` escribe solo la diferencia con lo importado, como actualización incremental. Si solo cambian anotaciones, los bytes originales y sus firmas quedan intactos.
  - Ediciones de PDFium (formularios, páginas, rotación) → primero un guardado de PDFium y después el incremental encima.
- **API pública:** `getAnnotations`, `addAnnotation`, `updateAnnotation`, `deleteAnnotation`, `selectAnnotation`, `undo`, `redo` y `annotationAuthor`.
- Se eliminaron las rutas antiguas que escribían anotaciones con PDFium.
- **Verificación:**
  - Tests de round-trip en todos los tipos, con `/Rotate` 0 y 90.
  - Tests de integración en jsdom: teclado, herramientas, comentarios, guardado.
  - `test:pdf-engine` comprueba por píxel que PDFium pinta nuestros `/AP` donde dice el modelo y que ocultar no se persiste.

**Desviaciones del plan:**

- Las anotaciones se pintan en **SVG**, no en Canvas2D: nítidas a cualquier zoom, sin repintado y con destinos accesibles. Canvas2D queda para miniaturas y exportación.
- No se escribe `/HKData`: las claves estándar bastan para todo lo que modela el editor.
- El escritor corre **en el hilo principal**. Es lazy y O(cambios); moverlo a un worker queda para cuando haya medidas.

**Pendiente:**

- **Verificación en navegador:** no se ha probado en navegador (captura de puntero, `mix-blend-mode`, precisión de los quads desde la selección). Tampoco el round-trip en Acrobat y Chrome que pide el criterio de salida.
- **Edición:**
  - Editar respuestas desde la UI (la API existe).
  - Agrupar trazos de tinta consecutivos.
  - Conservar `/RC` (texto enriquecido) al editar.
  - Markup con selección hecha solo con teclado (hoy se aplica pulsando la herramienta).
- **Documentos cifrados:** las anotaciones quedan en solo lectura hasta que exista `security/`.
- **Después de guardar:** recargar los workers con los bytes nuevos como base (hoy cada guardado vuelve a hacer el replay desde el original).

### Estado de la fase 4 (2026-10-12)

**Hecho:**

- **Sellos:**
  - 14 estándar (con los `/Name` de Acrobat), dinámicos (quién y cuándo, resueltos al colocarlos), "Sign here" / "Initial here" / "Witness" en forma de flecha.
  - Diseñador de sellos de texto con vista previa (texto, segunda línea, forma, color).
  - Sellos de imagen: un JPEG en gris o RGB se embebe tal cual (DCTDecode); el resto se redibuja como PNG y se escribe como imagen Flate con su `/SMask`. Una misma imagen se guarda una sola vez por guardado.
  - Se reeditan gracias a una clave privada `/HKStamp` y a la imagen que se relee del XObject. Los sellos de otros editores siguen en el raster, en solo lectura.
- **Medición:**
  - Distancia, perímetro, área, radio y volumen, con calibración al estilo de Acrobat ("1 in = 10 ft"), unidades in/cm/mm/pt/pica/ft/ft-in/m, decimales y profundidad.
  - La etiqueta forma parte de la misma lista de dibujo (pantalla, miniaturas y `/AP`).
  - Se escribe el `/Measure` estándar (RL, NumberFormat) con su `/IT`. Para volumen y radio se usan `PolygonVolume` y `CircleDimension`, como otros editores.
- **Links editables:**
  - Destino URI, página o destino con nombre (`/Dests` y el árbol `/Names`).
  - Mientras se lee, navegan; con las herramientas de anotación abiertas, se pueden seleccionar, mover y editar en el panel (URL validada, página).
  - El overlay de links de PDFium omite los que gestiona el modelo, así que cada link solo se hace clic una vez.
- **XFDF (ISO 19444-1) y JSON:**
  - Exportar e importar todos los tipos, con hilos (`inreplyto`, `state`).
  - Lo que XFDF no expresa (contenido de sellos, escalas) viaja en un namespace propio que otros lectores ignoran.
  - La importación es un solo paso de deshacer.
- **Portapapeles:** copiar, cortar y pegar con un MIME propio, también entre visores. Si el navegador descarta el tipo propio, se usa el texto plano como respaldo. También hay "Duplicar".
- **Orden z:** traer al frente, adelante, atrás y al fondo. Al guardar se reescribe `/Annots` respetando la posición de lo que no gestionamos (widgets, links ajenos). Si solo cambió el orden, no se reescribe ninguna anotación.
- **Permisos:**
  - `annotationMode`: `edit`, `review` (solo comentarios, respuestas y estado) o `view`.
  - `restrictAnnotationsToAuthor`.
  - `/F ReadOnly` se trata como bloqueo.
- **API pública:** `exportAnnotations`, `importAnnotations`, `setMeasureScale`.
- **Verificación:**
  - 31 tests del núcleo y 14 de integración.
  - `test:pdf-engine` comprueba por píxel en PDFium el sello de imagen (opaco, transparente, semitransparente), el marco del sello de texto y la línea de medición. También que PDFium resuelve nuestros links y que todo se relee después de un guardado de PDFium.

**Pendiente:**

- El criterio de salida ("XFDF valida contra Acrobat") no se ha probado en Acrobat; solo hay round-trip propio y la estructura del spec.
- En páginas con `/Rotate`, el overlay de PDFium no puede emparejar sus rects con los links gestionados (usa otra convención), así que un link movido en una página rotada también navega desde su posición original.
- Sellos de texto con caracteres fuera de WinAnsi (necesitan TrueType, fase 5).

## 6. Theming (daisyUI v5 / Tailwind v4)

| Pieza | Componente daisyUI |
|---|---|
| Toolbar principal y de herramientas | `navbar` + `join` de `btn btn-ghost btn-sm btn-square`; activo = `btn-active`; overflow = `dropdown` + `menu` |
| Zoom | `join` (− / `select select-sm` / +) y `range range-xs` en organize |
| Sidebar | `drawer` en móvil, `tabs tabs-box` en escritorio; miniaturas en `card` con anillo `ring-primary` para la página activa |
| Comentarios | `collapse collapse-arrow` por página, `chat` para las respuestas, `badge badge-soft` para el estado (feedback: soft, no sólido) |
| Panel de propiedades | `fieldset` + `input`/`select`/`toggle`/`range`, muestras de color como `btn btn-circle btn-xs` |
| Diálogos (firma, sellos, calibración, campo, link, organize, imprimir) | `modal` (organize = `modal-box` a pantalla completa); popovers sobre la página con **CDK Overlay** + CSS global y variables `--hk-*` (patrón de hk-select) |
| Carga y errores | `skeleton` para los placeholders de página, `loading`, `alert alert-error alert-soft` (que no oculte el documento) |
| Atajos | `kbd` |

**Reglas de color:**
- **UI:** solo tokens (`--color-primary`, `base-*`, …). Prohibido `rgb()` fijo en el CSS.
- **Resaltado de búsqueda:** `color-mix(in oklab, var(--color-warning) 40%, transparent)`; el match actual usa `--color-accent`.
- **Color de anotaciones:** es **dato del documento** (se guarda en el PDF), no tema. Las muestras de color se derivan de los tokens, pero se **resuelven a RGB absoluto** (`getComputedStyle`) en el momento de crear la anotación.
- **Modo oscuro:** el lienzo de página sigue blanco (fidelidad). Se añade la opción `pageTheme: 'dark'`, que invierte la página con un filtro CSS y excluye las imágenes.

**Compatibilidad dual:**
- Las demos en `shared-demos` corren con daisyUI v4/TW3 **y** v5/TW4: hay que usar las grafías duales y nada exclusivo de v5 en lo compartido.
- El CSS propio del componente se migra de `::ng-deep` a estilos de host con variables `--hk-pdf-*`.

---

## 7. Presupuestos de rendimiento (medidos con la demo de rendimiento)

| Métrica | Objetivo |
|---|---|
| Primer render (PDF de 1 MB y 50 páginas, máquina de gama media) | < 400 ms desde que llegan los bytes |
| Scroll a 60 fps (documento de 1 000 páginas) | ≤ 1 frame largo por segundo; ≤ 40 nodos de página en el DOM |
| Memoria con un documento de 5 000 páginas | < 400 MB en total (caché incluida, configurable) |
| Zoom al 400 % | Nitidez completa del viewport en < 250 ms (tiles) |
| Búsqueda en un documento de 1 000 páginas | Primer resultado < 300 ms; streaming sin bloquear el scroll |
| Re-render tras editar una anotación | **0** rasterizaciones de página (la capa es independiente) |
| Copias por bitmap | ≤ 1 copia en el worker + transferencia |

**Herramientas:** `performance.mark` en el scheduler, un overlay de depuración opcional (`debug: true`) y pruebas de humo con PDFs grandes en CI (Playwright).

---

## 8. Dependencias (todas libres y no AGPL)

| Dependencia | Licencia | Uso | Carga |
|---|---|---|---|
| PDFium (pdfium-lib) | BSD-3 / Apache-2 | Motor | Ya presente |
| pdfium-render (vendorizado) | MIT / Apache-2 | Crate Rust | Ya presente |
| **`hk-pdf-writer` (propio)** | Nuestra | Toda la escritura (§3.14), en lugar de `pdf-lib` | Lazy, solo en el writer worker |
| pkijs + asn1js | BSD-3 | Solo para construir y verificar el CMS (ASN.1/X.509) en la firma digital. Es el único trozo que no conviene reescribir (criptografía) | Lazy (fase 6b) |
| perfect-freehand (opcional) | MIT | Suavizado de tinta y firma | Pequeña; también se puede hacer en casa |
| @angular/cdk (drag-drop, overlay, a11y) | MIT | Organize, popovers, foco | Ya es peer |

**Descartadas:**
- MuPDF, SuperDoc, OnlyOffice: AGPL.
- pdf.js: era un segundo motor y ya se eliminó.
- Syncfusion: propietario. Además, el `package.json` raíz tiene ahora `@syncfusion/ej2-angular-pdfviewer` **sin commitear y sin uso**; conviene quitarlo antes del commit.

---

## 9. Testing

- **Unit (Vitest):** `core/` completo (geometry, scheduler, cache, CommandStack, serializadores XFDF, validadores AF*, redaction planner) con un `PdfEngine` mock.
- **Integración (Vitest + worker real en jsdom/happy-dom con WASM):** pruebas de round-trip de guardado por tipo de anotación, campo y operación de página.
- **E2E (Playwright):** abrir, buscar, anotar, guardar y reabrir; organize con drag; formularios; teclado; AXE.
- **Corpus de PDFs:** cifrados, rotados, de tamaños mixtos, linearizados, con 5 000 páginas, firmados, XFA (se detecta y se avisa), RTL y CJK.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| PDFium no tiene setters para `/L`, `/Vertices` y `/Measure` | Los escribe `hk-pdf-writer` (resuelto por diseño) |
| PDFs mal formados (xref roto, offsets falsos) rompen el writer | Detectarlo y normalizar primero con PDFium (`SaveAsCopy`) antes del guardado incremental; fuzzing del parser |
| Alcance del writer (cifrado, object streams, fuentes) | Construirlo por capas: núcleo (2W) → AcroForm + TrueType (5) → firma (6b). PDFs cifrados con permisos de edición: hasta tener `security/`, se avisa y se ofrece guardar sin cifrado mediante PDFium |
| Divergencia entre lo que pinta PDFium y lo que escribimos | Tests de round-trip con diff de píxeles en CI |
| Redacción incompleta (fuentes Type3, texto en XObjects/patterns) | Recorrer los form XObjects; si falla, usar el modo paranoico (rasterizar la región o la página); suite de regresión |
| Tamaño del chunk (~6 MB) | Ya es lazy; añadir `wasm-opt -Oz` y separar el wasm de Rust si deja de ser necesario tras la ruta caliente con `cwrap` |
| CSP sin `blob:` | Documentar; opción `workerUrl` para servir el worker como asset |
| Alcance enorme | Fases publicables; las features son flags lazy, así que el bundle base no crece |

---

## 11. Próximos pasos inmediatos

1. Revisar y aprobar este plan (en especial §3.1: escritura por replay y workers de solo lectura).
2. Fase 0 en una rama `refactor/pdf-viewer-phase-0`.
3. Crear el esqueleto de `core/` y mover el engine sin cambiar el comportamiento (Fase 1, primer PR).
