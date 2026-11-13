# Guía de estilo «Mesa»

Lenguaje visual de los componentes de trabajo de `@hakistack/ng-daisyui` (visores, workspaces, editores de páginas).
La metáfora: una **mesa** (`bg-base-200`) sobre la que se apoyan **hojas** y **tarjetas** (`bg-base-100`). Todo se expresa con
tokens y componentes estándar de daisyUI; el estilo no añade colores, variables ni CSS propios.

Referencia de origen: el workspace de páginas de Docsy (`record-page-workspace`, `page-set-toolbar`, `page-sheet`, `page-thumb`,
`page-strip`, `page-lote-editor`). Esta guía describe su gramática; no su funcionalidad.

---

## 1. Tokens

| Uso | Clase |
|---|---|
| Mesa (lienzo de trabajo, fondo de visores) | `bg-base-200` |
| Hojas, tarjetas, paneles, barras | `bg-base-100` |
| Separadores y bordes | `border-base-300` |
| Texto principal | `text-base-content` (por defecto) |
| Texto secundario (metadatos, contadores, ayudas) | `text-base-content/70` |
| Contorno de hoja/miniatura | `ring-base-content/45` |
| Marca, overlays sobre la página, página actual | `neutral` / `neutral-content` |
| Acción principal, toggle pulsado | `primary` / `primary-content` |
| Etiqueta de contexto activo (filtro, modo edición) | `secondary` / `secondary-content` |

Reglas:

- **Solo tokens de daisyUI.** Nada de hex, `rgb()`, `var(--…)` propias ni hojas de estilo de componente para dar color o forma.
- **Los colores de marca (`primary`, `secondary`) solo como relleno con su `*-content`**: `btn-primary`, `badge-primary`,
  `badge-secondary`. Nunca `text-primary`, `border-primary`, `bg-primary/10` ni `ring-primary`.
- Los colores de **estado** (`error`, `warning`, `info`, `success`) solo dentro de `alert-*` y badges de estado. No tiñen superficies.
- Contraste: `text-base-content/70` sobre `base-100`/`base-200` cumple 4.5:1 en los temas de daisyUI; opacidades menores
  (`/50`, `/60`) no se usan para texto.

## 2. Superficies

- **Mesa**: el área de trabajo (escenario del visor, cuadrícula de páginas) es `bg-base-200`.
- **Bloque de trabajo**: un solo contenedor exterior `bg-base-100 rounded-box border border-base-300 shadow-sm overflow-hidden`.
- **Dentro del bloque, los paneles se separan con líneas finas** (`border-b`, `border-t`, `border-r`, `border-l` + `border-base-300`).
  No se anidan cajas con borde y sombra dentro de otras cajas.
- **Tarjetas** sobre la mesa (p. ej. una página en el editor de páginas): `bg-base-100 rounded-box border border-base-300 shadow-sm`.
- **Elevación**: `shadow-sm` para tarjetas y bloques; `shadow-lg` solo para overlays (popovers, diálogos, menús) y para la hoja
  principal del visor, que «flota» sobre la mesa. Nunca superficies planas y cuadradas.
- **Radios**: `rounded-box` (bloques, tarjetas, hoja principal), `rounded-field` (filas y celdas clicables), `rounded-sm` (miniaturas).

## 3. Barra de herramientas (cabecera de panel)

```html
<div class="border-base-300 flex flex-wrap items-center gap-3 border-b px-3.5 py-2.5">
  <!-- Lo que estás viendo. Es lo único que se encoge. -->
  <span class="badge badge-lg badge-ghost min-w-0 gap-2">
    <span class="min-w-0 truncate">contrato.pdf · 12 páginas</span>
  </span>

  <!-- Estado de guardado en línea (opcional) -->
  <span class="text-base-content/70 flex items-center gap-1.5 text-sm" role="status" aria-live="polite">…</span>

  <!-- Acciones: un solo clúster que baja de línea entero -->
  <div class="ml-auto flex shrink-0 items-center gap-3">
    <div class="join">                       <!-- anterior · posición · siguiente -->
      <button class="btn btn-sm btn-square join-item" aria-label="Página anterior">…</button>
      <label class="input input-sm join-item w-32 font-mono tabular-nums">…</label>
      <button class="btn btn-sm btn-square join-item" aria-label="Página siguiente">…</button>
    </div>
    <div class="join" role="group" aria-label="Zoom">…</div>
    <div class="join" role="group" aria-label="Modo de vista">…</div>
  </div>
</div>
```

- El badge de la izquierda nombra el objeto (`badge-ghost`); pasa a `badge-secondary` cuando hay un contexto activo
  (filtro, modo edición) y puede llevar un botón `btn-xs btn-circle btn-ghost` para salir de él.
- Controles relacionados van en `join`: paginador, zoom (− · valor · +), modo de vista.
- Todos los números (posición, total, zoom, contadores): `font-mono tabular-nums`.
- Si el clúster no cabe, **baja de línea completo** (`flex-wrap` en el padre, `shrink-0` en el clúster). Nunca se cortan controles.

## 4. Botones

| Caso | Clase |
|---|---|
| Por defecto | `btn btn-sm` |
| Solo icono | `btn btn-sm btn-square` (o `btn-circle` en controles flotantes sobre un divisor) |
| Dentro de tarjetas y filas densas | `btn btn-xs` |
| Secundario | `btn` a secas (con su tamaño) |
| Terciario / cancelar / desplegar | `btn btn-ghost btn-sm` |
| Acción principal o toggle pulsado | `btn btn-primary` — **uno solo por superficie** |

- Un toggle en grupo (`join`) marca el elegido con `btn-primary` **y** `aria-pressed="true"`; los demás quedan `btn` con `aria-pressed="false"`.
- **Nunca** `btn-outline`, `btn-soft`, `btn-dash` ni variantes tenues de marca.
- Iconos Lucide de 14–16 px (12 px dentro de `btn-xs`) con `aria-hidden="true"`. Si el botón no tiene texto visible, lleva
  `aria-label` (y `title` como tooltip).

## 5. Páginas y miniaturas

| Pieza | Clases |
|---|---|
| Miniatura | `bg-base-100 rounded-sm ring-1 ring-base-content/45 overflow-hidden`, `aspect-ratio: 1 / 1.294` mientras no hay medida real |
| Hoja principal | `rounded-box ring-1 ring-base-content/45 shadow-lg overflow-hidden` + fondo de papel (ver excepción) |
| Cargando | `bg-base-200 animate-pulse` del tamaño de la página, `aria-hidden` |
| Falló | `—` centrado en `text-base-content/70 text-xs`, `aria-hidden` (el error se anuncia aparte) |
| Página actual | `ring-2 ring-neutral` (en tiras densas `ring-4`) + número en `badge badge-primary badge-sm font-mono` |
| Página seleccionada (multi) | `ring-2 ring-base-content` |
| Número de página no actual | `text-base-content/70 font-mono text-xs tabular-nums` |
| Pie de hoja | `text-base-content/70 font-mono text-xs uppercase tracking-wide`, alineado a la derecha |

**Excepción del papel.** El *contenido* de un documento (página PDF rasterizada, DOCX, HTML, correo, RTF) asume papel blanco
y texto negro. En un tema oscuro una hoja `bg-base-100` deja ese contenido ilegible, así que la hoja que contiene contenido de
documento es `bg-white` (y, en iframes `srcdoc`, `color-scheme: light`). Es el único color fuera de tokens permitido, y solo
dentro de la hoja: el marco, la mesa y todo el chrome siguen la regla de tokens.

La página actual **nunca** se marca con el color de marca en el borde; el anillo es `neutral`.
Los resaltados sobre la página (búsqueda, selección de texto) usan `fill-neutral/25 stroke-neutral` con trazo de 2 px:
el papel es blanco en todos los temas y `neutral` siempre es oscuro.

## 6. Estados

| Estado | Patrón |
|---|---|
| Guardando / guardado | En línea en la barra: `loading loading-spinner loading-xs` + texto, o icono `check` + texto. `role="status" aria-live="polite"` |
| Error que bloquea | `alert alert-error` centrado, `max-w-md`, con `role="alert"` |
| Bloqueo informativo | `alert` neutro centrado, `max-w-md`, `role="status"` |
| Vacío | Texto `text-base-content/70 text-sm` centrado; si necesita título, tarjeta `bg-base-100 rounded-box ring-1 ring-base-content/45 p-8 max-w-md` |
| Cargando un panel | `loading loading-dots loading-sm text-base-content/70` centrado |
| Ocupado | `opacity-60` en lo afectado + `aria-busy="true"` en su contenedor; controles `disabled` |

## 7. Overlays

- Menús y desplegables: `bg-base-100 rounded-box border border-base-300 shadow-lg`. Hoy con `details.dropdown`, que funciona
  igual en daisyUI 4 y 5. La **Popover API** se adopta cuando el posicionamiento por anclaje (`anchor-name`) esté disponible
  en todos los navegadores objetivo; sin él, un popover se abre centrado en pantalla, lejos de su botón.
  Los paneles que ya usan CDK Overlay (p. ej. `hk-select`) se mantienen.
- Lo que se pinta **encima de la página** (insignias, sellos, controles flotantes) usa `neutral`.
- En contenedores estrechos los paneles laterales **se pliegan** en `details.collapse.collapse-arrow` (o `<details>` nativo)
  dentro de la columna principal; no se ocultan controles. Los cortes se miden sobre el **ancho del componente**
  (ResizeObserver), no del viewport, porque el componente puede vivir en una columna.
- Paneles laterales ocultables: botón `btn btn-circle btn-xs shadow-sm` sobre el divisor, con `aria-expanded` y `aria-controls`;
  el panel oculto queda `inert` y estrecho, y el estado se recuerda por navegador (con `try/catch` sobre `localStorage`).

## 8. Accesibilidad

- Teclado completo. Listas y cuadrículas (miniaturas, páginas, documentos) con **foco roving**: un solo `tabindex="0"`,
  flechas para moverse, `Home`/`End`, `Enter`/`Espacio` para activar.
- Foco siempre visible: `focus-visible:outline-2 focus-visible:outline-base-content` (con `-outline-offset-2` en regiones con scroll).
- Un **enlace de salto** al panel de páginas cuando hay barra de filtros o cabecera larga.
- Anuncios en una región `sr-only aria-live="polite"` por componente (cambio de página, de documento, guardado, acciones).
- Equivalentes de un solo puntero para todo gesto de arrastre (WCAG 2.5.7): mover, rotar, borrar con botones.
- Sin overflow horizontal a 320 px de ancho del componente.
- `aria-current="page"` en el elemento actual; `aria-pressed` en toggles; `aria-label` en todo botón de solo icono.

## 9. Compatibilidad daisyUI 4 / Tailwind 3

La librería también se renderiza con daisyUI 4 + Tailwind 3 (`themes/daisyui-v4.css`). Las piezas de esta guía funcionan en
ambas versiones salvo:

| Clase | v5 / TW4 | v4 / TW3 | Cómo resolverlo |
|---|---|---|---|
| `rounded-field` | Sí | No (`rounded-btn`) | Mapear en `HK_THEME.classes` |
| `label.input` con `<input>` dentro | Sí | Necesita `input-bordered flex items-center gap-2` | Añadir esas clases (inocuas en v5) |
| `bg-current/20`, `wrap-anywhere` | Sí | No | No usar en la librería |
| `shadow-xs` | Sí | No (`shadow-sm` de TW3 ≈ `shadow-xs` de TW4) | Usar `shadow-sm`; la diferencia de escala es aceptable |
| Variantes `@container` | Sí | Requiere plugin | Medir con ResizeObserver |

Las diferencias de clases se resuelven con el mapa de `theme/theme.config.ts` (`HK_THEME`), no con CSS propio.
