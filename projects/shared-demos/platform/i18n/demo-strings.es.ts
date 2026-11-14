/**
 * Spanish text for live-demo section titles/descriptions, keyed by the exact English string used in
 * `<app-doc-section title="…" description="…">`. Checked for completeness by scripts/check-docs-coverage.mjs.
 * Keys are listed by `node projects/shared-demos/platform/i18n/extract-demo-strings.mjs`.
 */
export const DEMO_STRINGS_ES: Readonly<Record<string, string>> = {
  '100 roots x 10 children x 5 grandchildren = 6,600 rows. Performance test with hierarchy-aware sorting.':
    '100 raíces x 10 hijos x 5 nietos = 6,600 filas. Prueba de rendimiento con ordenamiento que respeta la jerarquía.',
  '100,000 rows × 32 columns': '100,000 filas × 32 columnas',
  '12h Format (AM/PM)': 'Formato 12h (AM/PM)',
  '15-Minute Step': 'Intervalo de 15 minutos',
  '15-Minute Steps': 'Intervalos de 15 minutos',
  '24-Hour Format': 'Formato de 24 horas',
  '24-hour clock with inner/outer ring for all 24 hours': 'Reloj de 24 horas con anillo interior/exterior para las 24 horas',
  '24h Format': 'Formato 24h',
  '5-Minute Step': 'Intervalo de 5 minutos',
  'A single object: fields as a map, per-field validation, cross-field validate, and a fully-typed onSubmit — only createForm is imported.':
    'Un solo objeto: campos como mapa, validación por campo, validate entre campos y un onSubmit completamente tipado — solo se importa createForm.',
  "A workspace is for several documents: the rail lists them (and the open one's pages, outline and attachments), the document is in the middle, and the selection, its properties, signatures and comments are on the right. Same [config] controller and outputs as hk-pdf-viewer; [documents] + [(active)] choose what opens. Switching away from unsaved edits asks first. Side panels hide behind their divider and fold away on narrow containers; the Grid view organizes pages in place.":
    'Un workspace es para varios documentos: el riel los lista (y las páginas, el esquema y los adjuntos del que está abierto), el documento va en el centro, y la selección, sus propiedades, firmas y comentarios a la derecha. Mismo controlador [config] y outputs que hk-pdf-viewer; [documents] + [(active)] eligen qué se abre. Si cambias de documento con ediciones sin guardar, primero pregunta. Los paneles laterales se ocultan tras su divisor y se pliegan en contenedores estrechos; la vista Grid organiza las páginas en su lugar.',
  'Actions at End (Default)': 'Acciones al final (por defecto)',
  'Actions at Start': 'Acciones al inicio',
  'Actions at Start + Selection + Sticky': 'Acciones al inicio + selección + columnas fijas',
  'Actions render as a button row below the message. Useful for Undo / Dismiss-style pairs.':
    'Las acciones se muestran como una fila de botones debajo del mensaje. Útil para pares tipo Deshacer / Descartar.',
  'Add icons or text adornments': 'Agrega iconos o adornos de texto',
  'Adjust line thickness': 'Ajusta el grosor de la línea',
  'Alert that closes automatically': 'Alerta que se cierra automáticamente',
  'All Field Types': 'Todos los tipos de campo',
  'All Filter Types': 'Todos los tipos de filtro',
  'All formatting options including headers, colors, alignment, code blocks':
    'Todas las opciones de formato, incluidos encabezados, colores, alineación y bloques de código',
  'Alpha (a), alphanumeric (*), and digit (9) mask characters': 'Caracteres de máscara alfabético (a), alfanumérico (*) y dígito (9)',
  'Animate on Load': 'Animar al cargar',
  'Animation Presets': 'Animaciones predefinidas',
  'App Shell': 'App Shell',
  'Ask AI': 'Preguntar a la IA',
  'Ask user for confirmation before actions': 'Pide confirmación al usuario antes de realizar acciones',
  'Auto-Save to LocalStorage': 'Autoguardado en LocalStorage',
  'Auto-close Timer': 'Temporizador de cierre automático',
  'Auto-dismiss with pause-on-hover': 'Se descarta automáticamente y se pausa al pasar el cursor',
  'Auto-inferred when actions.length === 0. The simplest layout.':
    'Se infiere automáticamente cuando actions.length === 0. El diseño más simple.',
  'Auto-inferred when actions.length === 1. Vertical divider + full-height button. Good for Reply-style flows.':
    'Se infiere automáticamente cuando actions.length === 1. Divisor vertical + botón de altura completa. Ideal para flujos tipo Responder.',
  "Auto-inferred when actions.length >= 2 (override with layout: 'default' if you prefer inline). Good for Reply / Don't allow pairs.":
    "Se infiere automáticamente cuando actions.length >= 2 (cámbialo con layout: 'default' si prefieres acciones en línea). Ideal para pares Responder / No permitir.",
  'Automatic (from the Router)': 'Automático (desde el Router)',
  'Avatar — user message': 'Avatar — mensaje de usuario',
  Basic: 'Básico',
  'Basic Datepicker': 'Datepicker básico',
  'Basic Dialog': 'Diálogo básico',
  'Basic Hover Effects': 'Efectos básicos al pasar el cursor',
  'Basic Multiselect': 'Selección múltiple básica',
  'Basic Select': 'Select básico',
  'Basic Table': 'Tabla básica',
  'Basic Tabs': 'Pestañas básicas',
  'Basic Tree with Lines': 'Árbol básico con líneas',
  'Basic Usage': 'Uso básico',
  'Basic Vertical Menu': 'Menú vertical básico',
  "Basic editor with the default 'basic' toolbar preset": "Editor básico con el preset de barra de herramientas 'basic' por defecto",
  'Basic palette': 'Paleta básica',
  'Basic time picker in 24-hour format': 'Selector de hora básico en formato de 24 horas',
  'Basic usage': 'Uso básico',
  "Bind [(formValues)] to the viewer and PDF form widgets sync both ways: pre-fill values flow into the doc's annotationStorage, and user edits stream back through the binding. controller.saveAndDownload() bakes the current values into a fresh PDF.":
    'Vincula [(formValues)] al visor y los widgets de formulario del PDF se sincronizan en ambos sentidos: los valores precargados fluyen al annotationStorage del documento y las ediciones del usuario regresan por el binding. controller.saveAndDownload() incorpora los valores actuales en un PDF nuevo.',
  'Bold, italic, underline, and link only': 'Solo negrita, cursiva, subrayado y enlace',
  'Browse commonly used icons': 'Explora los iconos más usados',
  'Built-in convenience methods for the four severity tiers. Each renders the matching daisyUI semantic icon color.':
    'Métodos de conveniencia integrados para los cuatro niveles de severidad. Cada uno usa el color de icono semántico de daisyUI correspondiente.',
  'Built-in named animations (click to trigger)': 'Animaciones con nombre integradas (haz clic para activarlas)',
  'Built-in online/offline notifications': 'Notificaciones integradas de en línea/sin conexión',
  'Bulk Operations': 'Operaciones masivas',
  'By default, the actions column renders as the last column.': 'Por defecto, la columna de acciones se muestra como la última columna.',
  "Cap at any N. Below the limit, behaves as a normal multi-select. At the limit, unchecked rows become disabled until a slot is freed. The 'select all' header caps additions at remaining capacity — partial fill instead of overshoot.":
    "Limita a cualquier N. Por debajo del límite, funciona como una selección múltiple normal. Al llegar al límite, las filas sin marcar se deshabilitan hasta que se libere un espacio. El 'seleccionar todo' del encabezado limita lo que agrega a la capacidad restante — llena parcialmente en vez de pasarse.",
  "Cap checkbox selection at one row. Once a row is checked, every other row's checkbox renders as [disabled] with a 'Maximum of 1 selected' tooltip. Equivalent to a radio column — uncheck the current pick to re-enable the others. Header 'select all' is auto-disabled because it would try to add.":
    "Limita la selección por checkbox a una fila. Cuando se marca una fila, el checkbox de todas las demás se muestra como [disabled] con un tooltip 'Maximum of 1 selected'. Equivale a una columna de radio — desmarca la selección actual para reactivar las demás. El 'seleccionar todo' del encabezado se deshabilita automáticamente porque intentaría agregar.",
  'Capped Multi-Pick (selectionLimit: 3)': 'Selección múltiple limitada (selectionLimit: 3)',
  'Cascade Selection': 'Selección en cascada',
  'Character counter with validation': 'Contador de caracteres con validación',
  "Characters after ? are optional — won't clear on blur if missing":
    'Los caracteres después de ? son opcionales — no se borra al perder el foco si faltan',
  'Checkbox Selection Mode': 'Modo de selección con checkbox',
  'Checking a parent auto-checks all children. When all children are checked, parent is auto-checked. Shows indeterminate state when partially selected.':
    'Marcar un padre marca automáticamente a todos sus hijos. Cuando todos los hijos están marcados, el padre se marca automáticamente. Muestra un estado indeterminado cuando la selección es parcial.',
  'Children are loaded on demand when expanding a node. Click the arrow to load children.':
    'Los hijos se cargan bajo demanda al expandir un nodo. Haz clic en la flecha para cargarlos.',
  'Click Animations': 'Animaciones al hacer clic',
  'Click a node to select it. Only one node can be selected at a time.':
    'Haz clic en un nodo para seleccionarlo. Solo se puede seleccionar un nodo a la vez.',
  'Click a row in the master table to display its related detail data in a separate table below. The first row is auto-selected on load.':
    'Haz clic en una fila de la tabla maestra para ver sus datos de detalle en una tabla separada debajo. La primera fila se selecciona automáticamente al cargar.',
  'Click any row to highlight it. Click again to deselect. Useful for visual guidance — the active row gets a primary tint. Supports conditional rowClass for per-row styling.':
    'Haz clic en cualquier fila para resaltarla. Haz clic de nuevo para deseleccionarla. Útil como guía visual — la fila activa recibe un tinte primario. Admite rowClass condicional para estilos por fila.',
  'Click anywhere on toast to close': 'Haz clic en cualquier parte del toast para cerrarlo',
  'Click multiple rows to highlight them. Click a highlighted row to deselect it. Great for batch visual guidance without checkbox columns.':
    'Haz clic en varias filas para resaltarlas. Haz clic en una fila resaltada para deseleccionarla. Ideal como guía visual por lotes sin columnas de checkbox.',
  'Click the chevron to expand a row and reveal additional detail content.':
    'Haz clic en el chevron para expandir una fila y mostrar contenido de detalle adicional.',
  'Client-side, virtualized in both directions. Sort: click a header (Shift+click adds a level). Column menu: ⋮ or Alt+↓ (sort, filter, hide, columns). Resize: drag the header edge, double-click to fit, or Alt+←/→. Select rows with the checkboxes or Space. Cell ranges: drag or Shift+arrows, Ctrl+A for all, Ctrl+C copies to Excel.':
    'Del lado del cliente, virtualizado en ambas direcciones. Ordenar: haz clic en un encabezado (Shift+clic agrega un nivel). Menú de columna: ⋮ o Alt+↓ (ordenar, filtrar, ocultar, columnas). Redimensionar: arrastra el borde del encabezado, doble clic para ajustar, o Alt+←/→. Selecciona filas con los checkboxes o Espacio. Rangos de celdas: arrastra o Shift+flechas, Ctrl+A para todo, Ctrl+C copia a Excel.',
  'Clock Face (12h)': 'Esfera de reloj (12h)',
  'Clock Face (24h)': 'Esfera de reloj (24h)',
  'Clock Face with Seconds': 'Esfera de reloj con segundos',
  'Clock face with seconds support': 'Esfera de reloj con soporte para segundos',
  'Collapsed Icon Rail': 'Riel de iconos colapsado',
  'Collapsible groups via native <details>. Use the controller to expand/collapse programmatically.':
    'Grupos plegables con <details> nativo. Usa el controlador para expandir/colapsar desde código.',
  Colors: 'Colores',
  'Colspan Footer Rows': 'Filas de pie con colspan',
  'Column-header filter dropdowns for every supported FilterType. Click the filter icon next to any header to try text, number, date, select, multi-select, boolean, date range, and number range filters.':
    'Filtros desplegables en el encabezado de columna para cada FilterType soportado. Haz clic en el icono de filtro junto a cualquier encabezado para probar los filtros de texto, número, fecha, select, multi-select, booleano, rango de fechas y rango de números.',
  Combined: 'Combinado',
  'Combined Hover Effects': 'Efectos combinados al pasar el cursor',
  'Combines with selection and sticky columns — the action column auto-sticks to the start.':
    'Se combina con selección y columnas fijas — la columna de acciones se fija automáticamente al inicio.',
  'Common Icons by Category': 'Iconos comunes por categoría',
  'Compose a reactive filter form above the table and drive it through the controller returned by createTable(). No viewChild, no template refs — just call filterGridConfig.applyColumnFilter(...) directly. Column header filter icons are hidden via enableFiltering: false while filter configs remain registered for programmatic use.':
    'Arma un formulario de filtros reactivo encima de la tabla y contrólalo con el controlador que devuelve createTable(). Sin viewChild ni referencias de plantilla — solo llama directamente a filterGridConfig.applyColumnFilter(...). Los iconos de filtro del encabezado se ocultan con enableFiltering: false, mientras las configuraciones de filtro siguen registradas para uso desde código.',
  'Conditional Logic': 'Lógica condicional',
  'Confirmation Dialogs': 'Diálogos de confirmación',
  'Connection invite — Accept / Decline': 'Invitación de conexión — Aceptar / Rechazar',
  'Continuous preview': 'Vista previa continua',
  'Control dialog behavior': 'Controla el comportamiento del diálogo',
  'Control how long the toast is visible': 'Controla cuánto tiempo se muestra el toast',
  'Control icon size with the size input': 'Controla el tamaño del icono con el input size',
  'Control tabs from outside the component': 'Controla las pestañas desde fuera del componente',
  'Control where the calendar appears': 'Controla dónde aparece el calendario',
  'Controller API': 'API del controlador',
  'Countdown with live seconds display (e.g., session timeout)': 'Cuenta regresiva con segundos en vivo (p. ej., expiración de sesión)',
  Currency: 'Moneda',
  'Currency (EUR)': 'Moneda (EUR)',
  'Currency with Euro locale configuration': 'Moneda con configuración regional de euro',
  'Custom Alert (Advanced)': 'Alerta personalizada (avanzado)',
  'Custom Cell Templates (hkCellTemplate)': 'Plantillas de celda personalizadas (hkCellTemplate)',
  'Custom Confirm Styles': 'Estilos de confirmación personalizados',
  'Custom Dimensions': 'Dimensiones personalizadas',
  'Custom Duration': 'Duración personalizada',
  'Custom Footer Template (hkFooter)': 'Plantilla de pie personalizada (hkFooter)',
  'Custom Formatting': 'Formato personalizado',
  'Custom Keyframes': 'Keyframes personalizados',
  'Custom Slot Character': 'Carácter de marcador personalizado',
  'Custom date display format': 'Formato de visualización de fecha personalizado',
  'Custom hotkey': 'Atajo de teclado personalizado',
  'Custom toolbar via slot': 'Barra de herramientas personalizada mediante slot',
  'Customize icon properties': 'Personaliza las propiedades del icono',
  'Date + Time Picker': 'Selector de fecha y hora',
  'Date + time in 24-hour format': 'Fecha y hora en formato de 24 horas',
  'Date + time with 15-minute intervals': 'Fecha y hora con intervalos de 15 minutos',
  'Date Mask': 'Máscara de fecha',
  'Date Range Picker': 'Selector de rango de fechas',
  'Date format with auto-inserted separators': 'Formato de fecha con separadores insertados automáticamente',
  'Declarative schema (recommended)': 'Esquema declarativo (recomendado)',
  'Default Editor': 'Editor por defecto',
  'Default Input': 'Input por defecto',
  'Define your own animation keyframes': 'Define tus propios keyframes de animación',
  'Delete with Item Name': 'Eliminar con el nombre del elemento',
  'Dependent Field Options': 'Opciones de campo dependientes',
  "Describe the view in plain language (any language). Pass your Anthropic key in the grid config and the grid calls Claude itself: it sends the columns, operators and current view, Claude answers with structured output against the grid's schema, and the answer goes through the same setState() validation as any other input. Undo restores the previous view.":
    'Describe la vista en lenguaje natural (en cualquier idioma). Pasa tu clave de Anthropic en la configuración del grid y el grid llama a Claude por sí mismo: envía las columnas, los operadores y la vista actual, Claude responde con salida estructurada según el esquema del grid, y la respuesta pasa por la misma validación de setState() que cualquier otra entrada. Deshacer restaura la vista anterior.',
  'Dialog Options': 'Opciones del diálogo',
  'Dialog with Data': 'Diálogo con datos',
  'Dialog with form inputs and selects (test responsiveness)': 'Diálogo con inputs y selects de formulario (prueba de responsividad)',
  'Dialog with scrollable content': 'Diálogo con contenido desplazable',
  'Different button styles for confirmations': 'Distintos estilos de botón para confirmaciones',
  'Different color variants': 'Distintas variantes de color',
  'Different severity levels for various contexts': 'Distintos niveles de severidad para diferentes contextos',
  'Different size variants': 'Distintas variantes de tamaño',
  'Different size variants matching DaisyUI': 'Distintas variantes de tamaño acordes con DaisyUI',
  'Disable input through the form control API': 'Deshabilita el input mediante la API del form control',
  'Disabled & Readonly': 'Deshabilitado y solo lectura',
  'Disabled Days of Week': 'Días de la semana deshabilitados',
  'Disabled Options': 'Opciones deshabilitadas',
  'Disabled State': 'Estado deshabilitado',
  'Disabled Tab': 'Pestaña deshabilitada',
  'Disabled via FormControl': 'Deshabilitado vía FormControl',
  'Display multiple footer rows with different aggregates per row (totals, averages, min/max).':
    'Muestra varias filas de pie con distintos agregados por fila (totales, promedios, mín./máx.).',
  'Document preview': 'Vista previa de documento',
  'Double-click a cell to edit. Supports text, number, select, and toggle editors.':
    'Haz doble clic en una celda para editarla. Admite editores de texto, número, select y toggle.',
  'Drag & Drop': 'Arrastrar y soltar',
  'Drag column borders to resize. Supports min/max width constraints.':
    'Arrastra los bordes de las columnas para redimensionarlas. Admite límites de ancho mínimo/máximo.',
  'Drag column headers to reorder columns. Drag row handles to reorder rows.':
    'Arrastra los encabezados de columna para reordenar las columnas. Arrastra los controles de fila para reordenar las filas.',
  'Drag nodes to reorder them. Drop on a node to make it a child, or between nodes to reorder.':
    'Arrastra los nodos para reordenarlos. Suéltalo sobre un nodo para convertirlo en hijo, o entre nodos para reordenar.',
  'Drop an <ng-template hkPdfToolbar> inside <hk-pdf-viewer> to replace the built-in toolbar with your own markup. The viewer keeps its rendering, page tracking, zoom, and download/print plumbing — you just own the chrome.':
    'Coloca un <ng-template hkPdfToolbar> dentro de <hk-pdf-viewer> para reemplazar la barra de herramientas integrada con tu propio markup. El visor conserva el renderizado, el seguimiento de páginas, el zoom y la lógica de descarga/impresión — tú solo te encargas del marco.',
  'Drop fuzzy matching for a literal case-insensitive contains check. Useful when consumers expect exact substring behavior.':
    'Omite la coincidencia difusa y usa una comprobación literal de "contiene" sin distinguir mayúsculas. Útil cuando se espera un comportamiento exacto de subcadena.',
  'Dropdown Positions': 'Posiciones del desplegable',
  'Dynamic Form Integration': 'Integración con formularios dinámicos',
  'Each crumb can carry a leading Lucide icon.': 'Cada miga puede llevar un icono de Lucide al inicio.',
  'Each item supports a Lucide icon, a trailing badge, and a keyboard-shortcut hint.':
    'Cada elemento admite un icono de Lucide, una insignia al final y una pista de atajo de teclado.',
  'Edit mode (Phase 0 — Text slice)': 'Modo edición (Fase 0 — segmento de texto)',
  'Editor bound to a FormControl': 'Editor vinculado a un FormControl',
  'Efficient rendering for large lists (1000+ items)': 'Renderizado eficiente para listas grandes (1000+ elementos)',
  'Efficiently render large datasets with CDK virtual scroll. Pagination is disabled.':
    'Renderiza grandes conjuntos de datos de forma eficiente con el virtual scroll de CDK. La paginación está deshabilitada.',
  'Elements animate in sequence with delays': 'Los elementos se animan en secuencia con retrasos',
  'Elements animate when they appear': 'Los elementos se animan al aparecer',
  'Expandable Row Detail': 'Detalle de fila expandible',
  'Expanding a parent row reveals a fully-featured nested child table with its own sorting and pagination. Multi-level nesting is supported.':
    'Al expandir una fila padre se muestra una tabla hija anidada completa, con su propio ordenamiento y paginación. Admite anidación de varios niveles.',
  'Fields that show/hide/require based on other values': 'Campos que se muestran, ocultan o vuelven obligatorios según otros valores',
  'File Explorer (Custom Children)': 'Explorador de archivos (hijos personalizados)',
  'Fillable forms + save': 'Formularios rellenables + guardar',
  'Filter options by typing': 'Filtra las opciones al escribir',
  'Filterable Tree': 'Árbol filtrable',
  'Flat item list with a fuzzy filter. Default Mod+K hotkey opens the palette anywhere on the page.':
    'Lista plana de elementos con filtro difuso. El atajo Mod+K por defecto abre la paleta desde cualquier parte de la página.',
  'Footer cells that span multiple columns. Use the cells array instead of columns to freely control layout.':
    'Celdas de pie que abarcan varias columnas. Usa el arreglo cells en lugar de columns para controlar libremente el diseño.',
  'Form Dialog': 'Diálogo con formulario',
  'Form data is automatically saved as you type and restored on page reload. Try filling in some fields, then refresh the page.':
    'Los datos del formulario se guardan automáticamente mientras escribes y se restauran al recargar la página. Llena algunos campos y luego recarga la página.',
  'FormControl Integration': 'Integración con FormControl',
  'Format dispatch': 'Despacho por formato',
  'Formats numbers as currency with thousand separators. Raw number is the form value.':
    'Formatea números como moneda con separadores de miles. El valor del formulario es el número sin formato.',
  'Formats phone numbers with masking. Stores digits only.': 'Formatea números de teléfono con máscara. Guarda solo los dígitos.',
  'Full Featured Table': 'Tabla completa',
  'Full Toolbar': 'Barra de herramientas completa',
  'Full layout freedom inside the footer using an Angular template. The component wraps your content in a full-width row automatically.':
    'Libertad total de diseño dentro del pie usando una plantilla de Angular. El componente envuelve tu contenido en una fila de ancho completo automáticamente.',
  'Full-featured tree table with selection, actions, hierarchy-aware sorting at every level, and global search that keeps ancestors of matching children visible':
    'Tabla de árbol completa con selección, acciones, ordenamiento que respeta la jerarquía en todos los niveles y búsqueda global que mantiene visibles los ancestros de los hijos que coinciden',
  'Grid Layout': 'Diseño en cuadrícula',
  'Grid-Style Filter Bar (Top Panel)': 'Barra de filtros tipo grid (panel superior)',
  'Group headers with multi-select mode': 'Encabezados de grupo con modo de selección múltiple',
  'Group rows by a field with caption aggregates in headers and column-aligned multi-row group footers.':
    'Agrupa filas por un campo con agregados en los encabezados de grupo y pies de grupo de varias filas alineados con las columnas.',
  'Grouped Multiselect': 'Selección múltiple agrupada',
  'Grouped Options': 'Opciones agrupadas',
  'HTML from URL': 'HTML desde URL',
  'Handle user responses (check console)': 'Maneja las respuestas del usuario (revisa la consola)',
  'Hide the chrome with showToolbar / showSidebar for embedded viewers.':
    'Oculta el marco con showToolbar / showSidebar para visores embebidos.',
  'Hierarchy Grid': 'Grid jerárquico',
  'Hierarchy-Aware Filtering': 'Filtrado que respeta la jerarquía',
  'Horizontal Layout': 'Diseño horizontal',
  'Horizontal Menu (navbar)': 'Menú horizontal (navbar)',
  'Horizontal Scrolling': 'Desplazamiento horizontal',
  'Icons, Badges & Shortcuts': 'Iconos, insignias y atajos',
  'Image renderer (TIFF, HEIC, + friends)': 'Renderizador de imágenes (TIFF, HEIC y más)',
  'Include additional context': 'Incluye contexto adicional',
  'Include seconds in time selection': 'Incluye segundos en la selección de hora',
  'Inline Cell Editing': 'Edición de celdas en línea',
  'Interactive hover effects': 'Efectos interactivos al pasar el cursor',
  'Interactive toast with buttons': 'Toast interactivo con botones',
  'Jump to any step without completing previous steps': 'Salta a cualquier paso sin completar los anteriores',
  'Keyboard Navigation': 'Navegación con teclado',
  'Labels alongside inputs': 'Etiquetas junto a los inputs',
  'Lazy Loading': 'Carga diferida',
  'Limit selections to maximum 3 items': 'Limita la selección a un máximo de 3 elementos',
  'Links, a section title, and an action item, built with the item.* factory.':
    'Enlaces, un título de sección y un elemento de acción, creados con la factory item.*.',
  'Live Countdown': 'Cuenta regresiva en vivo',
  'Live formatting as you type with slot characters': 'Formato en vivo mientras escribes, con caracteres de marcador',
  'Load alert body from an external HTML file instead of inline strings':
    'Carga el cuerpo de la alerta desde un archivo HTML externo en lugar de cadenas en línea',
  'Load data on demand as the user scrolls. Pass a sparse array with null for unloaded items.':
    'Carga datos bajo demanda a medida que el usuario se desplaza. Pasa un arreglo disperso con null para los elementos no cargados.',
  'Loading State': 'Estado de carga',
  'Long Content Dialog': 'Diálogo con contenido largo',
  'Lucide icons in tab labels': 'Iconos de Lucide en las etiquetas de las pestañas',
  'Manage multiple toasts': 'Gestiona varios toasts',
  'Master-Detail Grid': 'Grid maestro-detalle',
  'Material Design-style clock selector with AM/PM': 'Selector de reloj estilo Material Design con AM/PM',
  'Max Selection Limit': 'Límite máximo de selección',
  'Max width': 'Ancho máximo',
  'Methods on the controller returned by createPdfViewer() — call them anywhere, no @ViewChild needed.':
    'Métodos del controlador que devuelve createPdfViewer() — llámalos desde cualquier parte, sin necesidad de @ViewChild.',
  'Min/Max Constraints': 'Restricciones mín./máx.',
  'Minimal Toolbar': 'Barra de herramientas mínima',
  'Minimal embedded preview': 'Vista previa embebida mínima',
  'Modal width presets from sm to full-screen': 'Anchos predefinidos del modal, de sm a pantalla completa',
  'Mode prefixes': 'Prefijos de modo',
  'Multi Selectable Rows': 'Varias filas seleccionables',
  'Multi-Row Summary Footer': 'Pie de resumen de varias filas',
  'Multi-select with checkboxes. Selection propagates to children and parent shows partial state.':
    'Selección múltiple con checkboxes. La selección se propaga a los hijos y el padre muestra el estado parcial.',
  'Multiple properties animated together': 'Varias propiedades animadas a la vez',
  'Muted, less prominent styling': 'Estilo atenuado, menos prominente',
  Navbar: 'Navbar',
  'Nested Groups & Accordion': 'Grupos anidados y acordeón',
  'Nested Master-Detail': 'Maestro-detalle anidado',
  'Network Status': 'Estado de la red',
  'No toolbar / no sidebar': 'Sin barra de herramientas / sin panel lateral',
  'Non-editable editor display': 'Visualización del editor no editable',
  'Non-interactive datepicker': 'Datepicker no interactivo',
  'Non-interactive select': 'Select no interactivo',
  'Non-interactive states': 'Estados no interactivos',
  'Non-linear Wizard': 'Asistente no lineal',
  'Off-thread rendering (always on)': 'Renderizado fuera del hilo principal (siempre activo)',
  'Optional Section': 'Sección opcional',
  'Optional header and footer templates outside the scroll viewport':
    'Plantillas opcionales de encabezado y pie fuera del viewport de desplazamiento',
  'Options organized under group headers using the group property':
    'Opciones organizadas bajo encabezados de grupo mediante la propiedad group',
  'Organization Structure (TreeNode)': 'Estructura organizacional (TreeNode)',
  "Override mode: 'continuous' to keep the preview chrome (title + page link + bottom actions) but let the user scroll through every page inside the card. Prev/Next still jump page-to-page; the page link tracks the most-visible page.":
    "Cambia a mode: 'continuous' para conservar el marco de la vista previa (título + enlace de página + acciones inferiores) y dejar que el usuario recorra todas las páginas dentro de la tarjeta. Anterior/Siguiente siguen saltando de página en página; el enlace de página sigue a la página más visible.",
  'Override the default Mod+K with any key combination. Pass false to disable the listener entirely.':
    'Reemplaza el Mod+K por defecto con cualquier combinación de teclas. Pasa false para desactivar el listener por completo.',
  'Pass a URL via [src] and a controller config via [config]. Component takes care of the rest.':
    'Pasa una URL con [src] y una configuración del controlador con [config]. El componente se encarga del resto.',
  'Pass a duration (ms) for transient messages. Hovering the panel pauses the timer; mouseleave resumes.':
    'Pasa una duración (ms) para mensajes transitorios. Pasar el cursor sobre el panel pausa el temporizador; al salir, se reanuda.',
  'Pass an array of EditorSlashCommand to replace the built-ins, or { items, append: true } to extend them.':
    'Pasa un arreglo de EditorSlashCommand para reemplazar los integrados, o { items, append: true } para extenderlos.',
  'Pass an avatar URL to replace the severity icon. Typical for user-generated events.':
    'Pasa una URL de avatar para reemplazar el icono de severidad. Típico para eventos generados por usuarios.',
  'Pass data to dialog component via DIALOG_DATA': 'Pasa datos al componente del diálogo mediante DIALOG_DATA',
  "Pass layout: 'preview' to swap the chrome — title, subtitle, page indicator, page card, then prev/next plus a centered download. Defaults to single-page mode at fit-page zoom.":
    "Pasa layout: 'preview' para cambiar el marco — título, subtítulo, indicador de página, tarjeta de página y luego anterior/siguiente más una descarga centrada. Por defecto usa el modo de una página con zoom ajustado a la página.",
  Password: 'Contraseña',
  'Password input with show/hide toggle': 'Input de contraseña con botón para mostrar/ocultar',
  'Per-Action Placement (Split Columns)': 'Ubicación por acción (columnas separadas)',
  Percentage: 'Porcentaje',
  'Percentage input with % symbol. Clamps value between min and max.':
    'Input de porcentaje con el símbolo %. Limita el valor entre min y max.',
  Phone: 'Teléfono',
  'Phone Mask': 'Máscara de teléfono',
  'Pick a file': 'Elige un archivo',
  'Pin columns to start/end during horizontal scroll. Selection and actions columns auto-stick.':
    'Fija columnas al inicio/final durante el desplazamiento horizontal. Las columnas de selección y acciones se fijan automáticamente.',
  'Plain item objects. The last item is the current page (non-interactive).':
    'Objetos de elemento simples. El último elemento es la página actual (no interactivo).',
  Playground: 'Playground',
  'Pre-filled Value': 'Valor precargado',
  'Preset Sizes': 'Tamaños predefinidos',
  'Preview with full toolbar': 'Vista previa con barra de herramientas completa',
  'Programmatic Control': 'Control desde código',
  'Programmatic Value Setting': 'Asignación de valores desde código',
  'Programmatic update — Saving... → Saved': 'Actualización desde código — Guardando... → Guardado',
  'Progress Bar': 'Barra de progreso',
  'Project Angular templates per column to render rich content with directives, pipes, and event bindings — beyond what string formatters can do. Match by column field name; unmatched columns fall back to the default renderer.':
    'Proyecta plantillas de Angular por columna para renderizar contenido enriquecido con directivas, pipes y event bindings — más allá de lo que permiten los formatters de texto. Se asocian por el nombre del campo de la columna; las columnas sin plantilla usan el renderizador por defecto.',
  'Reactive Form': 'Formulario reactivo',
  'Reactive Forms Integration': 'Integración con Reactive Forms',
  'Reactive state': 'Estado reactivo',
  'Read Only': 'Solo lectura',
  'Read controller.state() — a signal of the runtime view (page, zoom, loaded, search).':
    'Lee controller.state() — un signal con la vista en tiempo de ejecución (página, zoom, cargado, búsqueda).',
  'Read controller.state() — open/closed, query, mode, selection, filtered list — all reactive signals.':
    'Lee controller.state() — abierto/cerrado, consulta, modo, selección, lista filtrada — todo como signals reactivos.',
  "Rendering, text extraction, and form handling all run in a Web Worker via the PDFium (Rust→WASM) engine — glyphs rasterize off the main thread with correct text. There's nothing to toggle; the main thread only blits the resulting bitmaps.":
    'El renderizado, la extracción de texto y el manejo de formularios se ejecutan en un Web Worker con el motor PDFium (Rust→WASM) — los glifos se rasterizan fuera del hilo principal con el texto correcto. No hay nada que activar; el hilo principal solo copia los bitmaps resultantes.',
  'Renders 10,000 items efficiently with fixed item height': 'Renderiza 10,000 elementos de forma eficiente con altura de elemento fija',
  'Reorderable Columns & Rows': 'Columnas y filas reordenables',
  'Resizable Columns': 'Columnas redimensionables',
  'Responsive multi-column grid with colSpan control': 'Grid responsivo de varias columnas con control de colSpan',
  'Restrict selectable date range': 'Restringe el rango de fechas seleccionable',
  'Restrict selectable time range (09:00 - 17:00)': 'Restringe el rango de horas seleccionable (09:00 - 17:00)',
  'Result Handling': 'Manejo del resultado',
  'Row Grouping': 'Agrupación de filas',
  'SSN Mask (unmask)': 'Máscara de SSN (unmask)',
  "Same model with orientation: 'horizontal'. Submenus open as dropdowns; opening one closes its siblings (accordion).":
    "Mismo modelo con orientation: 'horizontal'. Los submenús se abren como desplegables; abrir uno cierra los demás (acordeón).",
  'Scroll items horizontally with fixed width per item': 'Desplaza elementos horizontalmente con ancho fijo por elemento',
  'Searchable Select': 'Select con búsqueda',
  'Select a start and end date': 'Selecciona una fecha de inicio y una de fin',
  'Select both date and time in a single dropdown': 'Selecciona fecha y hora en un solo desplegable',
  "Select fields that load options based on another field's value": 'Campos select que cargan opciones según el valor de otro campo',
  'Select minutes in 15-minute increments': 'Selecciona minutos en incrementos de 15',
  'Select minutes in 5-minute increments': 'Selecciona minutos en incrementos de 5',
  'Select multiple options with chip display': 'Selecciona varias opciones mostradas como chips',
  'Selection, actions, filters, global search, pagination': 'Selección, acciones, filtros, búsqueda global, paginación',
  'Serial Number (mixed)': 'Número de serie (mixto)',
  'Server-side data source': 'Fuente de datos del lado del servidor',
  "Set actionsPosition: 'start' to render the actions column as the first data column (after selection/expand).":
    "Define actionsPosition: 'start' para mostrar la columna de acciones como la primera columna de datos (después de selección/expansión).",
  "Set auto to build the trail from the route tree. Annotate routes with data.breadcrumb; the trail rebuilds on navigation. This live trail is built from the current page's route.":
    'Define auto para construir el rastro desde el árbol de rutas. Anota las rutas con data.breadcrumb; el rastro se reconstruye al navegar. Este rastro en vivo se construye a partir de la ruta de la página actual.',
  'Set collapsed to hide labels and show an icon-only rail with tooltips — ideal for a togglable sidebar.':
    'Define collapsed para ocultar las etiquetas y mostrar un riel solo de iconos con tooltips — ideal para una barra lateral plegable.',
  'Set exact width and max-width via CSS values': 'Define el ancho exacto y el ancho máximo con valores CSS',
  'Set maxWidth (a CSS length); if the trail is wider than the container it scrolls horizontally.':
    'Define maxWidth (una longitud CSS); si el rastro es más ancho que el contenedor, se desplaza horizontalmente.',
  "Set mode: 'single' to render one page at a time instead of continuous scroll.":
    "Define mode: 'single' para mostrar una página a la vez en lugar del desplazamiento continuo.",
  "Set position: 'start' | 'end' on individual actions to render them in two separate columns — one before the data, one after.":
    "Define position: 'start' | 'end' en acciones individuales para mostrarlas en dos columnas separadas — una antes de los datos y otra después.",
  'Set showToolbar: true and the preview layout renders the full reader toolbar above the page card — page input, zoom select, mode toggle, print/download/fullscreen — together with the bottom prev/next/download. Use this when the embedded preview still benefits from power-user controls.':
    'Define showToolbar: true y el diseño de vista previa muestra la barra de herramientas completa del lector sobre la tarjeta de página — input de página, selector de zoom, cambio de modo, imprimir/descargar/pantalla completa — junto con anterior/siguiente/descargar abajo. Úsalo cuando la vista previa embebida aún se beneficia de controles avanzados.',
  'Set values programmatically and see formatted output': 'Asigna valores desde código y mira el resultado formateado',
  'Severity Levels': 'Niveles de severidad',
  'Severity shortcuts': 'Atajos de severidad',
  'Show ISO week numbers': 'Muestra los números de semana ISO',
  'Show a notification, then update its title / message / severity later via the returned NotificationRef.':
    'Muestra una notificación y luego actualiza su título / mensaje / severidad con el NotificationRef devuelto.',
  'Show loading indicator during async operations': 'Muestra un indicador de carga durante operaciones asíncronas',
  'Show remaining time visually': 'Muestra visualmente el tiempo restante',
  'Show the item being deleted': 'Muestra el elemento que se va a eliminar',
  'Showcase of available field types': 'Muestra de los tipos de campo disponibles',
  'Shows comma-separated values with count badge': 'Muestra valores separados por comas con una insignia de conteo',
  Sidebar: 'Barra lateral',
  'Simple dialog with confirm/cancel buttons': 'Diálogo simple con botones de confirmar/cancelar',
  'Simple dropdown selection': 'Selección simple en un desplegable',
  'Simple horizontal tabs': 'Pestañas horizontales simples',
  'Simple icon rendering': 'Renderizado simple de iconos',
  'Simple single date selection': 'Selección simple de una fecha',
  'Simple table with sorting': 'Tabla simple con ordenamiento',
  'Simple text input': 'Input de texto simple',
  'Simple tree display with connecting lines and expand/collapse': 'Árbol simple con líneas de conexión y expandir/colapsar',
  'Single Selectable Row': 'Una fila seleccionable',
  'Single Selection Mode': 'Modo de selección única',
  'Single-Pick (selectionLimit: 1)': 'Selección única (selectionLimit: 1)',
  'Single-page mode': 'Modo de una página',
  Sizes: 'Tamaños',
  'Skip title and subtitle for a card-only preview — just the page card and the three buttons. Drop it into a list, modal, or signing flow where the surrounding UI already provides context.':
    'Omite el título y el subtítulo para una vista previa solo con la tarjeta — solo la tarjeta de página y los tres botones. Colócala en una lista, un modal o un flujo de firma donde la interfaz alrededor ya da el contexto.',
  'Slash Commands (Built-ins)': 'Comandos slash (integrados)',
  'Slash Commands (Custom Items)': 'Comandos slash (elementos personalizados)',
  'Soft Style': 'Estilo suave',
  'Some options can be disabled': 'Algunas opciones pueden estar deshabilitadas',
  'Some tabs can be disabled': 'Algunas pestañas pueden estar deshabilitadas',
  'Spreadsheet renderer': 'Renderizador de hojas de cálculo',
  'Stack management': 'Gestión de la pila',
  'Staggered Animation': 'Animación escalonada',
  'Standard stacked form layout': 'Diseño de formulario estándar apilado',
  'State as JSON': 'Estado como JSON',
  'Step-by-step registration with validation': 'Registro paso a paso con validación',
  'Sticky Columns': 'Columnas fijas',
  'Sticky Toast': 'Toast persistente',
  'Stroke Width': 'Grosor del trazo',
  'Substring filter': 'Filtro por subcadena',
  'Switching the source': 'Cambiar la fuente',
  'Tabs oriented vertically': 'Pestañas en orientación vertical',
  'Tabs with Icons': 'Pestañas con iconos',
  'Tap to Dismiss': 'Tocar para descartar',
  'The [src] input accepts a string URL, a Uint8Array, or a Blob.': 'El input [src] acepta una URL como string, un Uint8Array o un Blob.',
  'The aside panel: header/footer slots, an embedded vertical menu, and an optional collapse-to-rail toggle.':
    'El panel lateral: slots de encabezado/pie, un menú vertical embebido y un botón opcional para plegarlo a riel.',
  'The detail table can itself be a master with its own detail below it, enabling multi-level drill-down. Click an employee to see their orders, then click an order to see its line items.':
    'La tabla de detalle puede ser a su vez maestra con su propio detalle debajo, lo que permite profundizar en varios niveles. Haz clic en un empleado para ver sus órdenes y luego en una orden para ver sus partidas.',
  'The full drawer layout: navbar + sidebar + content. Permanent sidebar from lg up, overlay below (toggle the browser width). The hamburger and overlay share one drawerOpen signal.':
    'El diseño completo con drawer: navbar + barra lateral + contenido. Barra lateral fija desde lg, superpuesta en tamaños menores (cambia el ancho del navegador). La hamburguesa y la capa superpuesta comparten un solo signal drawerOpen.',
  'The generic visible predicate hides items (and prunes now-empty groups). The library stays auth-agnostic — wire your own permission check.':
    'El predicado genérico visible oculta elementos (y elimina los grupos que quedan vacíos). La biblioteca no depende de ningún sistema de autenticación — conecta tu propia verificación de permisos.',
  'The grid sends its state (sort, filters, search, page) to the data source; superseded requests are aborted. This demo simulates a 400 ms API.':
    'El grid envía su estado (orden, filtros, búsqueda, página) a la fuente de datos; las solicitudes reemplazadas se cancelan. Este demo simula una API de 400 ms.',
  'The same component renders different formats from CORS-friendly sample URLs. Open DevTools → Network — the calamine WASM bundle is intentionally NOT pulled here (no spreadsheet sample), proving the lazy-load boundary holds.':
    'El mismo componente renderiza distintos formatos desde URLs de ejemplo compatibles con CORS. Abre DevTools → Network — aquí el bundle WASM de calamine intencionalmente NO se descarga (no hay ejemplo de hoja de cálculo), lo que demuestra que el límite de carga diferida se mantiene.',
  'The same facade flips editable with mode="edit" + a createDocumentEditor controller. Edit the text, drive Undo/Redo and Save from the shared shell toolbar, Export downloads the round-tripped bytes, and Done toggles back to the read-only renderer.':
    'La misma fachada pasa a ser editable con mode="edit" + un controlador createDocumentEditor. Edita el texto, usa Deshacer/Rehacer y Guardar desde la barra de herramientas compartida, Exportar descarga los bytes tras el ida y vuelta, y Listo regresa al renderizador de solo lectura.',
  'The whole view is one serializable object. setState() validates any JSON against the columns, applies what is valid and returns issues for the rest — the contract the AI layer will build on.':
    'Toda la vista es un único objeto serializable. setState() valida cualquier JSON contra las columnas, aplica lo que es válido y devuelve los problemas del resto — el contrato sobre el que se construirá la capa de IA.',
  'Time picker with AM/PM toggle': 'Selector de hora con botón AM/PM',
  'Timepicker in disabled state': 'Selector de hora en estado deshabilitado',
  'Timepicker with an initial value set programmatically': 'Selector de hora con un valor inicial asignado desde código',
  'Tree Table with Selection, Sorting & Filtering': 'Tabla de árbol con selección, ordenamiento y filtrado',
  'Triggered by user click': 'Activado por un clic del usuario',
  'Two-action notification with primary + outline variants. Auto-infers stacked-action layout.':
    'Notificación con dos acciones, variantes primary + outline. Infiere automáticamente el diseño stacked-action.',
  'Type # for projects, > for users, ? for help. Each mode scopes the search to its filterGroups (or renders a help layout).':
    'Escribe # para proyectos, > para usuarios, ? para ayuda. Cada modo limita la búsqueda a sus filterGroups (o muestra un diseño de ayuda).',
  "Type '/' on a new line to open the command palette. Built-in set covers headings, lists, blockquote, code block, and divider.":
    "Escribe '/' en una línea nueva para abrir la paleta de comandos. El conjunto integrado incluye encabezados, listas, cita, bloque de código y divisor.",
  'Type in the search box to filter nodes. Matching nodes and their ancestors are shown.':
    'Escribe en el cuadro de búsqueda para filtrar nodos. Se muestran los nodos que coinciden y sus ancestros.',
  'Upload a TIFF / HEIC / BMP / GIF / ICO / PNM / QOI file. The renderer dispatches by format: TIFF and the lesser formats go through the Rust image crate compiled to WASM; HEIC routes to heic2any (libheif WASM under the hood — an optional peer dep).':
    'Sube un archivo TIFF / HEIC / BMP / GIF / ICO / PNM / QOI. El renderizador despacha por formato: TIFF y los formatos menores pasan por el crate image de Rust compilado a WASM; HEIC va a heic2any (libheif WASM por debajo — una peer dependency opcional).',
  'Upload an .xlsx / .xls / .xlsb / .ods file. Parsing runs entirely in-browser via calamine (Rust → WASM), then the rows are handed to <hk-table>. Sheet tabs appear at the top when the workbook has multiple sheets.':
    'Sube un archivo .xlsx / .xls / .xlsb / .ods. El análisis se ejecuta completamente en el navegador con calamine (Rust → WASM) y luego las filas se pasan a <hk-table>. Las pestañas de hojas aparecen arriba cuando el libro tiene varias hojas.',
  'Upload anything — PDF, xlsx, image, text. The viewer detects the format and dispatches to the matching renderer.':
    'Sube lo que sea — PDF, xlsx, imagen, texto. El visor detecta el formato y lo despacha al renderizador correspondiente.',
  'Use a space instead of underscore as the placeholder': 'Usa un espacio en lugar del guion bajo como marcador',
  'Use any CSS color value': 'Usa cualquier valor de color CSS',
  'Use arrow keys to navigate cells. Enter to edit or expand. Space to toggle selection. Escape to clear focus.':
    'Usa las flechas para moverte entre celdas. Enter para editar o expandir. Espacio para alternar la selección. Escape para quitar el foco.',
  'User Registration Wizard': 'Asistente de registro de usuario',
  "Using a custom 'items' property for children instead of the default 'children'":
    "Usa una propiedad personalizada 'items' para los hijos en lugar de la 'children' por defecto",
  'Using field.editor() in createForm': 'Uso de field.editor() en createForm',
  'Using show() with HTML content and footer': 'Uso de show() con contenido HTML y pie',
  "Using the standard TreeNode interface with 'children' property. Toggle is inline in the first data column.":
    "Usa la interfaz estándar TreeNode con la propiedad 'children'. El botón de expandir está en línea en la primera columna de datos.",
  'Variants with sizes and colors': 'Variantes con tamaños y colores',
  'Vertical Layout (Default)': 'Diseño vertical (por defecto)',
  'Vertical Scrolling': 'Desplazamiento vertical',
  'Vertical Tabs': 'Pestañas verticales',
  'Virtual Scrolling': 'Desplazamiento virtual',
  'Virtual grid with configurable columns. Each row is virtualized.':
    'Grid virtual con columnas configurables. Cada fila está virtualizada.',
  'Visibility Gating (RBAC)': 'Control de visibilidad (RBAC)',
  'Week Numbers': 'Números de semana',
  'Weekends disabled': 'Fines de semana deshabilitados',
  "When a child matches a filter/search, its ancestors stay visible. Try searching for 'React' or 'API' to see ancestors preserved.":
    "Cuando un hijo coincide con un filtro/búsqueda, sus ancestros siguen visibles. Busca 'React' o 'API' para ver cómo se conservan los ancestros.",
  'With Actions': 'Con acciones',
  'With Description': 'Con descripción',
  'With Details': 'Con detalles',
  'With Header & Footer': 'Con encabezado y pie',
  'With Max Length': 'Con longitud máxima',
  'With Prefix & Suffix': 'Con prefijo y sufijo',
  'With Seconds': 'Con segundos',
  'With icons': 'Con iconos',
  'With unmask=true, only raw digits are emitted': 'Con unmask=true, solo se emiten los dígitos sin formato',
  'Without Chips': 'Sin chips',
  "Won't auto-dismiss until closed manually": 'No se descarta automáticamente hasta que se cierre manualmente',
  'Works with Angular FormControl': 'Funciona con FormControl de Angular',
  'Works with Angular FormControl (array values)': 'Funciona con FormControl de Angular (valores de arreglo)',
  'Works with Angular Reactive Forms': 'Funciona con Reactive Forms de Angular',
  Workspace: 'Espacio de trabajo',
  'default with inline actions': 'default con acciones en línea',
  'default — title + body + close': 'default — título + cuerpo + cerrar',
  'hk-document-workspace with a [documents] list, like a case file: the rail lists the documents (any format), the open one shows with its own viewer — PDFs keep annotations, forms, signatures and page organizing — and the inspector shows its file and properties. A single document works too, through [src].':
    'hk-document-workspace con una lista [documents], como un expediente: el riel lista los documentos (de cualquier formato), el abierto se muestra con su propio visor — los PDF conservan anotaciones, formularios, firmas y organización de páginas — y el inspector muestra su archivo y propiedades. También funciona con un solo documento, mediante [src].',
  "provideNotification({ maxStack: 5 }) caps the stack — overflow drops the oldest with reason 'overflow'.":
    "provideNotification({ maxStack: 5 }) limita la pila — al desbordarse se descarta la más antigua con reason 'overflow'.",
  'side-action — single action on the right': 'side-action — una sola acción a la derecha',
  'stacked-action — stacked actions on the right': 'stacked-action — acciones apiladas a la derecha',
  'start / center / end projection slots, an optional embedded horizontal menu, and a responsive hamburger that emits (menuToggle).':
    'Slots de proyección start / center / end, un menú horizontal embebido opcional y una hamburguesa responsiva que emite (menuToggle).',
  'Column filters': 'Filtros por columna',
  "Every case here is an in-memory Blob, so it behaves the same on every machine. The viewer takes a source that is already available (URL, bytes or Blob): while your app is still fetching it, show your own placeholder; once it has the source, each renderer shows its own progress line while it parses. A format with no renderer (.pptx, .odt, or no name and no type) gets the unsupported card. A supported format with broken bytes reaches its renderer, which shows the parser's error in an alert instead of throwing.":
    'Cada caso aquí es un Blob en memoria, así que se comporta igual en cualquier máquina. El visor recibe una fuente que ya está disponible (URL, bytes o Blob): mientras tu app todavía la está descargando, muestra tu propio indicador; cuando ya tiene la fuente, cada renderizador muestra su propia línea de progreso mientras la procesa. Un formato sin renderizador (.pptx, .odt, o sin nombre ni tipo) muestra la tarjeta de no soportado. Un formato soportado con bytes dañados llega a su renderizador, que muestra el error del parser en una alerta en lugar de lanzar una excepción.',
  'Fixed layout': 'Diseño fijo',
  'From the UI: open a column menu (the ⋮ button, or Alt+↓ on a header) and pick an operator — the list depends on the column type. Active filters show as removable chips above the grid. From code: setFilter() replaces the filter of one column, setState({ filters }) sets them all, clearFilters() removes them. Filters are combined with AND; invalid ones are dropped and reported, never thrown.':
    'Desde la interfaz: abre el menú de una columna (el botón ⋮, o Alt+↓ sobre un encabezado) y elige un operador; la lista depende del tipo de columna. Los filtros activos aparecen como chips que se pueden quitar encima del grid. Desde código: setFilter() reemplaza el filtro de una columna, setState({ filters }) los define todos y clearFilters() los elimina. Los filtros se combinan con AND; los inválidos se descartan y se informan, nunca lanzan errores.',
  'Loading and errors': 'Carga y errores',
  'Loading, unsupported and broken files': 'Carga, archivos no soportados y archivos dañados',
  "Resize by dragging a header's right edge, double-click the edge to fit the column to its content, or use Alt+←/→ on a focused header. Hide and show columns from any column menu (⋮) or from code. Order is part of the state: setState({ columns }) moves the listed columns first, in that order. There is no drag-to-reorder and no column pinning yet — only the selection checkbox column is pinned.":
    'Cambia el ancho arrastrando el borde derecho de un encabezado, haz doble clic en el borde para ajustar la columna a su contenido, o usa Alt+←/→ sobre un encabezado con foco. Oculta y muestra columnas desde cualquier menú de columna (⋮) o desde código. El orden es parte del estado: setState({ columns }) pone primero las columnas indicadas, en ese orden. Todavía no se pueden reordenar arrastrando ni fijar columnas; solo la columna de casillas de selección está fija.',
  'Row selection': 'Selección de filas',
  'Save and restore the view': 'Guardar y restaurar la vista',
  'The same 500 invoices in both components. hk-table is configured once with createTable() — a field initializer, because it needs an injection context — and gets its rows through [data]. hk-datagrid keeps rows, view state and selection in the controller from createDataGrid(). Pick hk-table for row-level features (editing, grouping, detail rows, actions); pick hk-datagrid for large data, multi-sort, saved views and AI.':
    'Las mismas 500 facturas en ambos componentes. hk-table se configura una vez con createTable() —en un inicializador de campo, porque necesita un contexto de inyección— y recibe sus filas por [data]. hk-datagrid guarda las filas, el estado de la vista y la selección en el controlador que crea createDataGrid(). Elige hk-table para funciones por fila (edición, agrupación, filas de detalle, acciones); elige hk-datagrid para grandes volúmenes de datos, ordenamiento múltiple, vistas guardadas e IA.',
  'Visibility, width and order': 'Visibilidad, ancho y orden',
  "While a document opens, the viewer shows a spinner over the page area (Reload repeats it). When the source can't be used, the page area shows an error panel and (viewerError) / onError receive a PdfViewerError: code, message, recoverable and the original cause. Bytes that aren't a PDF, or a file cut off after its header, are rejected by PDFium (typically invalid_pdf, not recoverable); a URL that can't be fetched gives load_failed (recoverable, so the panel offers Retry). The broken sources are built in memory, so they fail the same way everywhere.":
    'Mientras se abre un documento, el visor muestra un indicador de carga sobre el área de la página (Reload lo repite). Cuando la fuente no se puede usar, el área de la página muestra un panel de error y (viewerError) / onError reciben un PdfViewerError: code, message, recoverable y la causa original. PDFium rechaza los bytes que no son un PDF o un archivo cortado después de su encabezado (normalmente invalid_pdf, no recuperable); una URL que no se puede descargar da load_failed (recuperable, así que el panel ofrece Retry). Las fuentes dañadas se crean en memoria, así que fallan igual en todas partes.',
  'getState() returns the whole view — sort, filters, search, page and columns — as plain JSON, so you can keep it in localStorage, a URL or your backend. On load, pass it back through setState(): parts that no longer match the columns (a renamed field, an operator that changed type) are dropped and reported instead of breaking the page. Sort, filter, resize or hide columns, then Save and Simulate reload; Load an outdated view shows what happens when a saved view no longer matches the columns.':
    'getState() devuelve la vista completa —orden, filtros, búsqueda, página y columnas— como JSON simple, para que la guardes en localStorage, en una URL o en tu backend. Al cargar, pásala de nuevo con setState(): las partes que ya no coinciden con las columnas (un campo renombrado, un operador que cambió de tipo) se descartan y se informan en lugar de romper la página. Ordena, filtra, cambia el ancho u oculta columnas, y luego usa Save y Simulate reload; Load an outdated view muestra qué pasa cuando una vista guardada ya no coincide con las columnas.',
  'hk-table and hk-datagrid side by side': 'hk-table y hk-datagrid lado a lado',
  'resizable: false removes the resize handles (and Alt+←/→); columnMenu: false removes the header menus. Sorting by clicking a header still works; widths, visibility and order can still be set from code.':
    'resizable: false quita los controles para cambiar el ancho (y Alt+←/→); columnMenu: false quita los menús de los encabezados. Ordenar haciendo clic en un encabezado sigue funcionando; el ancho, la visibilidad y el orden se pueden seguir definiendo desde código.',
  "selection: 'single' or 'multi' adds a pinned checkbox column. Click a checkbox, or press Space on a focused row; in multi mode Shift+click selects the run from the last toggled row, and the header checkbox selects every row matching the current filters and search (not just the visible ones). Selection is keyed by rowKey, so it survives sorting, filtering and paging. Read it from selectedRows() / selectedCount() or the onSelectionChange callback.":
    "selection: 'single' o 'multi' añade una columna fija de casillas. Haz clic en una casilla, o presiona Espacio sobre una fila con foco; en modo multi, Shift+clic selecciona el tramo desde la última fila marcada, y la casilla del encabezado selecciona todas las filas que coinciden con los filtros y la búsqueda actuales (no solo las visibles). La selección se identifica por rowKey, así que se mantiene al ordenar, filtrar y paginar. Léela con selectedRows() / selectedCount() o con el callback onSelectionChange.",
};
