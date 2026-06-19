# Document Viewer → Editor Enterprise — Roadmap

> Estado: **propuesta / en iteración**
> Alcance confirmado: editar **PDF (anotar/formularios), Excel, Word/DOCX, Texto/MD/CSV**;
> guardar con **round-trip al formato original + export PDF + eventos al host + descarga local**;
> **single-user primero** (colab en fase posterior); estrategia de deps **híbrida pragmática**
> (in-house/ligero por defecto, libs establecidas ligeras donde ahorren meses).

---

## 1. Diagnóstico — el gap real

El `document-viewer` actual es una base sólida pero **100% read-only**. Lo importante: la librería
ya contiene las dos piezas de edición más caras, así que esto **no es construir editores desde cero**,
sino conectar editores existentes al pipeline de formatos y añadir la serialización de vuelta.

Activos reutilizables ya presentes:

- `DocumentViewerComponent` — façade con detección de formato (mime > filename > url > blob) y **registry/strategy** de renderers.
- Parse por formato (calamine WASM para spreadsheets, image-engine, libheif, docx-preview, etc.).
- **`EditorComponent`** — editor rich-text TipTap/ProseMirror (contrato HTML string) → base para DOCX.
- **`hk-table` con edición inline** — `enableInlineEditing`, `cellEditors`, `editType`, eventos `cellEdit`/`cellEditError` → base para Excel.
- Patrón de controllers `createX()` consolidado (`createForm`, `createTable`, `createPdfViewer`, `createCommandPalette`…).

| Pieza | Estado hoy | Acción |
|---|---|---|
| Detección formato + registry renderers | ✅ Sólido | Reutilizar / extender |
| Parse (bytes → modelo) | ✅ por formato | Reutilizar |
| **Edición** | ❌ todo read-only | Conectar editores existentes + nuevos |
| **Serialize (modelo → bytes formato original)** | ❌ no existe | **Construir — corazón del round-trip** |
| **Undo/redo unificado** | ❌ (TipTap trae el suyo; table no) | Command stack genérico |
| **Shell editor (toolbar/status/save)** | Parcial (toolbar interno del editor) | Shell reutilizable |
| Anotación PDF / formularios | ❌ pdfjs solo render | Capa overlay nueva + writer |

---

## 2. Arquitectura objetivo

Extender el façade **sin romper el viewer** (la ruta read-only sigue intacta).

```
DocumentViewerComponent   →  añadir  mode: 'view' | 'edit'
createDocumentEditor(...)  →  DocumentEditorController  (patrón createForm/createTable)
```

### 2.1 `DocumentEditorController` (nuevo)

Sigue el patrón `createX()` de la casa. Contrato propuesto:

```ts
interface DocumentEditorController {
  // estado reactivo (signals)
  content():   unknown;          // modelo editable actual (por formato)
  format():    ResolvedFormat;
  isDirty():   boolean;
  canUndo():   boolean;
  canRedo():   boolean;

  // acciones
  undo():   void;
  redo():   void;
  save():   Promise<Uint8Array>;                 // bytes en formato ORIGINAL
  exportAs(target: 'original' | 'pdf'): Promise<Blob>;
  reset():  void;

  // wiring de template
  config: Signal<DocumentEditorConfig>;
}
```

Outputs del componente (cubren "emitir cambios al host"):
`(contentChange)`, `(dirtyChange)`, `(save)`.

### 2.2 Tres registries paralelos

Extiende el registry de renderers actual:

1. `viewers`     — ya existe (read-only).
2. `editors`     — componente **editor** por formato.
3. `serializers` — función `(modelo) => Uint8Array` por formato. **Lo nuevo y crítico para round-trip.**

Cada formato editable implementa el trío: **parse → edit → serialize**, más su integración con el command-stack.

### 2.3 Infra transversal nueva

- **`lib/utils/command-stack.ts`** — undo/redo genérico (comandos con `do/undo`). Lo consumen table-edit y PDF; TipTap mantiene su historial interno y se adapta como un comando compuesto del stack global del controller.
- **`DocumentEditorShellComponent`** — chrome común: toolbar configurable, status bar (dirty / zoom / página / hoja), botones Save/Export, toggle view↔edit. Promover el `editor-toolbar` interno del `EditorComponent` a **toolbar reutilizable**.
- **Pipeline `exportAs`** unificado.

Reglas duras del repo que aplican a todo editor nuevo:
- Standalone, OnPush, signals (`input()`/`output()`/`computed()`), sin NgModules.
- Debe pasar **AXE** y cumplir **WCAG AA** (foco, contraste, ARIA) — crítico en grids editables y toolbars.
- Todo lazy / peer-dep **opcional**, como ya hace el viewer (cuidar bundle).
- `[class]` object syntax, no `ngClass`; control flow nativo `@if/@for`.

---

## 3. Decisiones de dependencias (híbrido pragmático)

| Formato | Editor | Serializer (round-trip) | Estrategia |
|---|---|---|---|
| **Texto / MD / CSV** | textarea + nº de línea custom; CSV → `hk-table` editable; MD → split con preview | trivial (string→bytes) / CSV builder in-house | **100% in-house** |
| **Excel** | `hk-table` inline editing (existe) + grid mejorado (selección de rango, copy/paste, formula bar) | **`rust_xlsxwriter` → WASM** dentro del `document-engine` existente | In-house WASM (coherente con calamine/libheif) |
| **Word / DOCX** (default, accesible) | `EditorComponent` (TipTap, existe) | DOCX ↔ ProseMirror **subset curado** + lib `docx` (js) para escribir | Híbrido DOM: reusa TipTap, writer JS, cumple WCAG AA |
| **Word / DOCX** (opcional, fidelidad Syncfusion-class) | **LibreOffice WASM (ZetaOffice + `zetajs`)** en canvas | Nativo del motor (round-trip 1:1 real) | **Módulo pesado opt-in** (ver §3.1) |
| **PDF** | **Capa overlay de anotación nueva** (SVG/canvas sobre pdfjs) + relleno de AcroForms | **`pdf-lib`** para inyectar anotaciones/valores y aplanar | `pdf-lib` peer-dep opcional (ligero) |

Notas:
- **Fórmulas Excel**: fase posterior. HyperFormula es pesado/licencia → empezar editando **valores**, sin recálculo.
- **DOCX round-trip (default)**: fidelidad de **subset declarado** (headings, párrafos, bold/italic/underline, listas, tablas, imágenes, links) + **warning** en lo no soportado. La fidelidad perfecta es una trampa enterprise.
- **PDF**: no se edita el texto base del PDF (fuera de alcance); solo overlay + formularios + aplanado.

### 3.1 DOCX "Syncfusion-class" — decisión: LibreOffice WASM como módulo opcional

Para edición DOCX **paginada y de alta fidelidad** (equivalente al DocumentEditor de Syncfusion), reinventar
el motor de layout de Word in-house **no es proporcional** (años-persona). La vía elegida es **LibreOffice WASM
vía ZetaOffice + el wrapper `zetajs`**, integrado como un **renderer/editor pesado opt-in** en el façade.

**Licencias (verificado):** `zetajs` = **MIT**; LibreOffice/ZetaOffice = **LGPLv3+ / MPL-2.0** → **NO es AGPL**
(a diferencia de SuperDoc y OnlyOffice, descartados por AGPL). Pasa el filtro de licencia del proyecto.

**Caveats que pesan más que la licencia — por eso NO es el editor por defecto:**
- **LGPLv3 + WASM = "relinking"**: hay que publicar las fuentes de LibreOffice y permitir recompilar/reemplazar
  esa parte. No obliga a abrir el código Angular propietario, pero es un esfuerzo de cumplimiento real (mucho menor que AGPL).
- **Peso**: decenas–cientos de MB → **jamás en el bundle base**. Solo lazy + vía CDN (Allotropia hostea uno).
- **🔴 Accesibilidad**: render en `<canvas>` (Qt5/Emscripten), no DOM → **no es accesible nativamente** y
  **no pasa AXE/WCAG AA**, que es regla dura del repo. Por eso va como módulo aislado opt-in, no como default.
- **Madurez**: ZetaOffice WASM en beta abierta; colab solo prototipo (OK para single-user, que es el alcance).

**Empaquetado**: módulo separado (p. ej. `@hakistack/ng-daisyui-office` o peer-dep opcional `zetajs`), cargado
solo cuando el consumidor lo active y acepte el trade-off peso/a11y/LGPL. El default DOCX sigue siendo el editor
de flujo TipTap (DOM, accesible, sin licencia).

---

## 4. Roadmap por fases (ordenado por riesgo/valor)

### Fase 0 — Fundación  *(habilita todo lo demás)*
`mode` input en el façade · `createDocumentEditor` + `DocumentEditorController` · `command-stack.ts` ·
`DocumentEditorShellComponent` (toolbar/status/save) · serializer registry · pipeline `exportAs`.
Slice vertical contra **Texto** para validar el contrato end-to-end.

### Fase 1 — Texto / Markdown / CSV  *(valida la fundación, bajo riesgo)*
Editor de texto + nº de línea; MD con preview split; CSV sobre `hk-table` editable.
Save trivial + descarga local + eventos al host.

### Fase 2 — Excel  *(alto valor)*
Conectar `hk-table` editable al `ParsedSpreadsheet`; grid mejorado (rango, copy/paste, formula bar UI).
Writer `.xlsx` vía WASM (`rust_xlsxwriter`). **Sin fórmulas calculadas todavía.**

### Fase 3 — PDF anotación / formularios  *(alto valor, riesgo medio — es overlay, no toca internals)*
Capa de anotación (resaltado, dibujo, notas, sellos, firma) + rellenar AcroForms.
Guardar/aplanar vía `pdf-lib`. Export PDF nativo.

### Fase 4 — DOCX rich-text default (TipTap)  *(mayor riesgo: round-trip)*
Parse docx → TipTap, editar, serializar → docx (subset). Export a PDF desde el documento. Editor DOM, accesible, sin licencia.

### Fase 4b — DOCX fidelidad Syncfusion-class (opcional, LibreOffice WASM)  *(módulo pesado opt-in)*
Integrar ZetaOffice + `zetajs` como renderer/editor pesado (canvas, lazy, CDN) detrás de un flag de capacidad.
Round-trip 1:1 real. Ver §3.1 — caveats de peso, LGPL-relinking y accesibilidad (no es default).

### Fase 5 — (posterior) Enterprise / colaboración
Comentarios/anotaciones persistidas → colaboración en tiempo real (CRDT, presencia, cursores).
Fuera del alcance inicial (single-user primero).

---

## 5. Riesgos principales

- **Round-trip DOCX** — fidelidad. Mitigar: subset declarado + warnings en features no soportadas.
- **xlsx writer en WASM** — toolchain Rust adicional (ya existe para calamine/libheif → factible).
- **A11y en grid de edición** — navegación por teclado, ARIA, gestión de foco; debe pasar AXE/WCAG AA.
- **A11y del módulo LibreOffice WASM** — render en canvas NO accesible → aislado como opt-in, nunca default; documentar el trade-off al consumidor.
- **LGPLv3 relinking (LibreOffice WASM)** — cumplir publicando fuentes + permitiendo relink del blob WASM; no afecta el código propietario.
- **Bundle size** — LibreOffice WASM (decenas–cientos de MB) solo lazy + CDN; resto lazy / peer-dep opcional como el viewer actual.

---

## 6. Estado de ejecución

- [x] Fase 0 — Fundación *(command-stack, createDocumentEditor + DocumentEditorController, editor/serializer registries, DocumentEditorShellComponent reusando hk-editor-toolbar, `mode` en el façade, pipeline `exportAs`, slice vertical de Texto end-to-end — build + 1403 tests + demo `/document-viewer/editor` en verde)*
- [x] Fase 1 — Texto / MD / CSV *(dispatcher por extensión dentro del editor `text`: plain textarea + gutter de nº de línea, Markdown split-preview con renderer in-house + DOMPurify, CSV sobre `hk-table` editable; modelo canónico = string → reusa `serializeText`; 0 deps nuevas; helpers `parseCsv`/`serializeCsv`/`renderMarkdown` con specs)*
- [ ] Fase 2 — Excel
- [ ] Fase 3 — PDF anotación / formularios
- [ ] Fase 4 — DOCX rich-text default (TipTap)
- [ ] Fase 4b — DOCX Syncfusion-class opcional (LibreOffice WASM)
- [ ] Fase 5 — Colaboración (posterior)
