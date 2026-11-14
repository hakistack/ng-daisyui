import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-editor` is a rich text box: like a mini word processor inside your page. Users can make text bold, add headings, lists, links and images, and your code receives the result as an HTML string.',
      es: '`hk-editor` es un cuadro de texto enriquecido: como un pequeño procesador de textos dentro de tu página. El usuario puede poner texto en negrita y añadir títulos, listas, enlaces e imágenes, y tu código recibe el resultado como una cadena HTML.',
    },
    {
      en: 'It is built on TipTap (which itself runs on ProseMirror) and styled with daisyUI. You choose how much toolbar to show (`minimal`, `basic`, `full` or your own list of buttons), can turn on Notion-style slash commands (type `/` to insert a block), and can plug in your own image upload. It works with Angular forms like any other input. TipTap is an optional peer dependency: install the `@tiptap/*` packages only in apps that use the editor.',
      es: 'Está construido sobre TipTap (que a su vez funciona sobre ProseMirror) y usa los estilos de daisyUI. Tú decides cuánta barra de herramientas mostrar (`minimal`, `basic`, `full` o tu propia lista de botones), puedes activar comandos con barra diagonal al estilo Notion (escribe `/` para insertar un bloque) y puedes conectar tu propia subida de imágenes. Funciona con los formularios de Angular como cualquier otro input. TipTap es una dependencia peer opcional: instala los paquetes `@tiptap/*` solo en las apps que usan el editor.',
    },
  ],
  whenToUse: [
    {
      en: 'Descriptions, comments, notes or email bodies where users need basic formatting.',
      es: 'Descripciones, comentarios, notas o cuerpos de correo donde el usuario necesita formato básico.',
    },
    {
      en: 'Content that will be stored and shown again as HTML (blog posts, product descriptions, knowledge base entries).',
      es: 'Contenido que se guardará y se mostrará de nuevo como HTML (publicaciones, descripciones de productos, artículos de una base de conocimiento).',
    },
    {
      en: 'Authoring flows that benefit from reusable snippets inserted with `/` (signatures, templates).',
      es: 'Flujos de redacción que se benefician de fragmentos reutilizables que se insertan con `/` (firmas, plantillas).',
    },
  ],
  whenNotToUse: [
    {
      en: 'Plain single-line text: use [Input](/input).',
      es: 'Texto simple de una línea: usa [Input](/input).',
    },
    {
      en: 'Plain multi-line text with no formatting: a `textarea` field in a [Dynamic Form](/forms) is lighter.',
      es: 'Texto de varias líneas sin formato: un campo `textarea` en un [formulario dinámico](/forms) es más liviano.',
    },
    {
      en: 'Editing whole files (DOCX, Markdown, CSV) with save and export: use the [Document Editor](/document-editor).',
      es: 'Editar archivos completos (DOCX, Markdown, CSV) con guardado y exportación: usa el [editor de documentos](/document-editor).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { EditorComponent, type EditorTextChangeEvent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-editor-quick-start',
  imports: [EditorComponent],
  template: \`
    <hk-editor
      toolbar="full"
      ariaLabel="Product description"
      placeholder="Describe the product…"
      editorHeight="240px"
      [slashCommands]="true"
      [maxLength]="2000"
      (textChange)="onChange($event)"
    />
    <p>{{ characters() }} characters</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorQuickStartComponent {
  readonly html = signal('');
  readonly characters = signal(0);

  onChange(event: EditorTextChangeEvent): void {
    this.html.set(event.html);
    this.characters.set(event.text.length);
  }
}`,
    note: {
      en: 'Install the optional peer dependencies first: `npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion`. With Angular forms, bind `[formControl]`: the control value is the HTML string. `minLength` and `maxLength` are checked against the trimmed plain text and reported as `minlength` / `maxlength` errors (an empty editor never fails `minLength`).',
      es: 'Primero instala las dependencias peer opcionales: `npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion`. Con formularios de Angular, usa `[formControl]`: el valor del control es la cadena HTML. `minLength` y `maxLength` se comparan con el texto plano (sin espacios al inicio ni al final) y se reportan como errores `minlength` / `maxlength` (un editor vacío nunca falla `minLength`).',
    },
  },
  technical: [
    {
      id: 'install',
      heading: { en: 'Install TipTap', es: 'Instalar TipTap' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The `@tiptap/*` packages are optional peer dependencies of `@hakistack/ng-daisyui`: apps that never render `hk-editor` do not install them. Apps that do must add all of them:',
            es: 'Los paquetes `@tiptap/*` son dependencias peer opcionales de `@hakistack/ng-daisyui`: las apps que nunca renderizan `hk-editor` no los instalan. Las que sí lo usan deben añadirlos todos:',
          },
        },
        {
          kind: 'code',
          lang: 'bash',
          code: 'npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-image @tiptap/extension-file-handler @tiptap/suggestion',
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'If the packages are missing, the editor does not crash the page: it shows an inline error (`role="alert"`) where the editing surface would be and logs this install command to the browser console.',
            es: 'Si faltan los paquetes, el editor no rompe la página: muestra un error en línea (`role="alert"`) donde iría la superficie de edición y escribe este comando de instalación en la consola del navegador.',
          },
        },
      ],
    },
    {
      id: 'lifecycle',
      heading: { en: 'Lazy engine and lifecycle', es: 'Motor diferido y ciclo de vida' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'First render', es: 'Primer renderizado' },
              detail: {
                en: 'The component renders its toolbar and an empty surface. Nothing from TipTap is loaded yet.',
                es: 'El componente renderiza su barra y una superficie vacía. Todavía no se carga nada de TipTap.',
              },
            },
            {
              label: { en: 'afterNextRender (browser only)', es: 'afterNextRender (solo navegador)' },
              detail: {
                en: 'TipTap core, StarterKit, Link, Placeholder, Image and FileHandler are imported with dynamic `import()`. On the server this step is skipped. If the imports fail (packages not installed), the inline error is shown and the editor stays empty.',
                es: 'TipTap core, StarterKit, Link, Placeholder, Image y FileHandler se importan con `import()` dinámico. En el servidor este paso se omite. Si las importaciones fallan (paquetes sin instalar), se muestra el error en línea y el editor queda vacío.',
              },
            },
            {
              label: { en: 'Editor created', es: 'Editor creado' },
              detail: {
                en: 'Any value written before this point is applied, `ready` becomes `true` and `editorReady` fires.',
                es: 'Cualquier valor escrito antes de este punto se aplica, `ready` pasa a `true` y se dispara `editorReady`.',
              },
            },
            {
              label: { en: 'Destroy', es: 'Destrucción' },
              detail: {
                en: 'The TipTap instance is destroyed with the component. If the component is destroyed while the chunks are still loading, no editor is created.',
                es: 'La instancia de TipTap se destruye junto con el componente. Si el componente se destruye mientras los chunks todavía se cargan, no se crea ningún editor.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Every ProseMirror transaction bumps a `tick` signal. The toolbar receives stable `isActive` / `canRun` functions that read `tick`, so button states (pressed, disabled) refresh under OnPush without the editor pushing state into the toolbar. `disabled`, `readonly` and the forms disabled state are combined into one value that is passed to TipTap `setEditable`.',
            es: 'Cada transacción de ProseMirror incrementa un signal `tick`. La barra recibe funciones estables `isActive` / `canRun` que leen `tick`, así que el estado de los botones (presionado, deshabilitado) se actualiza con OnPush sin que el editor tenga que enviarle estado a la barra. `disabled`, `readonly` y el estado deshabilitado del formulario se combinan en un solo valor que se pasa a `setEditable` de TipTap.',
          },
        },
      ],
    },
    {
      id: 'toolbar-and-images',
      heading: { en: 'Toolbar, links and images', es: 'Barra, enlaces e imágenes' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Preset', es: 'Preset' },
            { en: 'Buttons', es: 'Botones' },
          ],
          rows: [
            [
              { en: '`minimal`', es: '`minimal`' },
              { en: 'Bold, italic, underline, link', es: 'Negrita, cursiva, subrayado, enlace' },
            ],
            [
              { en: '`basic` (default)', es: '`basic` (por defecto)' },
              {
                en: 'Adds strikethrough, bullet and ordered lists, undo, redo',
                es: 'Añade tachado, listas con viñetas y numeradas, deshacer, rehacer',
              },
            ],
            [
              { en: '`full`', es: '`full`' },
              {
                en: 'Adds headings 1–3, inline code, blockquote, code block, divider and image',
                es: 'Añade títulos 1–3, código en línea, cita, bloque de código, separador e imagen',
              },
            ],
            [
              { en: '`none`', es: '`none`' },
              { en: 'No toolbar buttons', es: 'Sin botones' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Pass an array of `EditorToolbarItem` instead of a preset to pick buttons yourself; `divider` adds a separator. Link and image buttons open a small built-in modal for the URL and alt text. Links get `rel="noopener noreferrer nofollow"`, typed URLs are auto-linked, and links do not open on click while editing. Submitting an empty URL removes the link.',
            es: 'Pasa un arreglo de `EditorToolbarItem` en lugar de un preset para elegir tú los botones; `divider` añade un separador. Los botones de enlace e imagen abren un pequeño modal integrado para la URL y el texto alternativo. Los enlaces llevan `rel="noopener noreferrer nofollow"`, las URL que se escriben se convierten en enlaces automáticamente y los enlaces no se abren al hacer clic mientras se edita. Confirmar una URL vacía quita el enlace.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Images: without `onImageUpload` the image button asks for a URL. With it, the button opens a file picker, calls your function with the `File`, and inserts the URL it returns. Both toolbar paths then ask for alt text, with a "Skip (decorative)" option. The same uploader handles images dropped or pasted into the editor (PNG, JPEG, GIF, WebP, SVG), using the file name as alt text; without an uploader, dropped and pasted files are ignored. If your upload promise rejects, nothing is inserted. Storage is always yours.',
            es: 'Imágenes: sin `onImageUpload`, el botón de imagen pide una URL. Con él, el botón abre un selector de archivos, llama a tu función con el `File` e inserta la URL que devuelve. En ambos casos, el botón pide después el texto alternativo, con la opción "Skip (decorative)" para imágenes decorativas. La misma función de subida procesa las imágenes que se arrastran o pegan en el editor (PNG, JPEG, GIF, WebP, SVG) y usa el nombre del archivo como texto alternativo; sin ella, los archivos arrastrados o pegados se ignoran. Si tu promesa de subida se rechaza, no se inserta nada. El almacenamiento siempre corre por tu cuenta.',
          },
        },
      ],
    },
    {
      id: 'slash-commands',
      heading: { en: 'Slash commands', es: 'Comandos con barra diagonal' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`slashCommands` accepts `true` (built-ins: headings 1–3, bullet and ordered list, blockquote, code block, divider), an array that replaces the built-ins, or `{ items, append: true }` to add to them. The popup is built on TipTap Suggestion; its state lives in Angular signals. Build items with the `slash` helpers (`snippet`, `snippetFromUrl`, `command`, `custom`) and wrap the config in `createSlashCommands` for type checking.',
            es: '`slashCommands` acepta `true` (comandos incluidos: títulos 1–3, listas con viñetas y numeradas, cita, bloque de código y separador), un arreglo que reemplaza los incluidos o `{ items, append: true }` para añadir comandos a los incluidos. El popup usa TipTap Suggestion y su estado vive en signals de Angular. Crea los elementos con los helpers de `slash` (`snippet`, `snippetFromUrl`, `command`, `custom`) y envuelve la configuración en `createSlashCommands` para que TypeScript la valide.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Custom slash commands',
          code: `import { createSlashCommands, slash } from '@hakistack/ng-daisyui';

readonly commands = createSlashCommands({
  append: true,
  items: [
    slash.snippet({ id: 'signature', label: 'Signature', html: '<p>Best regards,</p>' }),
    slash.snippetFromUrl({ id: 'terms', label: 'Terms', url: '/assets/snippets/terms.html' }),
    slash.command({ id: 'quote', label: 'Quote', run: (chain) => chain.toggleBlockquote() }),
  ],
});`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Snippets are inserted as HTML through TipTap, which keeps only the nodes and marks its extensions know. Still, only insert HTML from sources you trust, and sanitize stored HTML before rendering it elsewhere in your app. `snippetFromUrl` silently ignores network errors and non-OK responses.',
            es: 'Los fragmentos se insertan como HTML a través de TipTap, que conserva solo los nodos y las marcas que sus extensiones conocen. Aun así, inserta solo HTML de fuentes confiables y sanitiza el HTML guardado antes de mostrarlo en otra parte de tu app. `snippetFromUrl` ignora en silencio los errores de red y las respuestas que no son exitosas.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'ArrowDown / ArrowUp',
        action: {
          en: 'Slash popup: move through the commands (wraps around).',
          es: 'Popup de comandos: recorre los comandos (al llegar al final vuelve al inicio).',
        },
      },
      { keys: 'Enter', action: { en: 'Slash popup: run the active command.', es: 'Popup de comandos: ejecuta el comando activo.' } },
      { keys: 'Escape', action: { en: 'Slash popup: close it.', es: 'Popup de comandos: lo cierra.' } },
      {
        keys: 'Enter / Escape',
        action: {
          en: 'Link or image modal (in its text field): confirm / cancel.',
          es: 'Modal de enlace o imagen (en su campo de texto): confirma / cancela.',
        },
      },
    ],
    notes: [
      {
        en: 'The toolbar is `role="toolbar"` labelled "Formatting"; each button has an `aria-label`, and the button of an active format gets `aria-pressed="true"`. Buttons keep the editor selection because they prevent focus loss on mousedown. Every toolbar button is a regular Tab stop (there is no arrow-key navigation inside the toolbar).',
        es: 'La barra es `role="toolbar"` con la etiqueta "Formatting"; cada botón tiene `aria-label`, y el botón de un formato activo recibe `aria-pressed="true"`. Los botones conservan la selección del editor porque evitan la pérdida de foco en mousedown. Cada botón de la barra es una parada normal de Tab (no hay navegación con flechas dentro de la barra).',
      },
      {
        en: 'Toolbar actions are announced through a visually hidden `aria-live="polite"` region ("Bold on", "Divider inserted", "Undid"). Formatting shortcuts typed on the keyboard come from TipTap StarterKit and are not announced.',
        es: 'Las acciones de la barra se anuncian en una región viva oculta `aria-live="polite"` ("Bold on", "Divider inserted", "Undid"). Los atajos de teclado de formato vienen de TipTap StarterKit y no se anuncian.',
      },
      {
        en: 'Set `ariaLabel`; without it the editing area is labelled with the `placeholder` (default "Write something…"), or "Rich text editor" if the placeholder is empty. The slash popup is a `role="listbox"` labelled "Slash commands", with `aria-selected` on the active option. The link and image modal is a `dialog` with `aria-modal="true"`, labelled by its title.',
        es: 'Define `ariaLabel`; sin él, el área de edición se etiqueta con el `placeholder` (por defecto "Write something…") o con "Rich text editor" si el placeholder está vacío. El popup de comandos es un `role="listbox"` con la etiqueta "Slash commands" y `aria-selected` en la opción activa. El modal de enlace e imagen es un `dialog` con `aria-modal="true"`, etiquetado por su título.',
      },
      {
        en: 'Button labels, announcements and the modal texts ("Cancel", "Image URL") are English strings in the library today.',
        es: 'Por ahora, las etiquetas de los botones, los anuncios y los textos del modal ("Cancel", "Image URL") son cadenas en inglés dentro de la librería.',
      },
    ],
  },
  performance: [
    {
      en: 'TipTap and its extensions load with dynamic `import()` after the first render, so they do not block the page and end up in a separate chunk. Because they are optional peer dependencies, apps that do not use the editor do not even install them. The slash-command extension (and the TipTap Suggestion plugin behind it) is imported only when `slashCommands` is enabled.',
      es: 'TipTap y sus extensiones se cargan con `import()` dinámico después del primer renderizado, así que no bloquean la página y quedan en un chunk aparte. Como son dependencias peer opcionales, las apps que no usan el editor ni siquiera las instalan. La extensión de comandos con barra diagonal (y el plugin Suggestion de TipTap que usa) solo se importa si `slashCommands` está activo.',
    },
    {
      en: '`writeValue` uses `setContent` without emitting an update, so setting the form value does not echo back as a change. Values written before the engine loads are held and applied once it is ready.',
      es: '`writeValue` usa `setContent` sin emitir una actualización, así que asignar el valor desde el formulario no vuelve como un cambio. Los valores escritos antes de que cargue el motor se guardan y se aplican cuando está listo.',
    },
    {
      en: 'Every content change serializes the document to HTML (and to plain text for `textChange`) and notifies the form control. For very long documents, avoid expensive work in your `textChange` handler.',
      es: 'Cada cambio de contenido serializa el documento a HTML (y a texto plano para `textChange`) y notifica al control del formulario. Con documentos muy largos, evita trabajo costoso en tu manejador de `textChange`.',
    },
  ],
  related: [
    {
      id: 'document-editor',
      note: {
        en: 'Edits whole files with save and export, not a single form field.',
        es: 'Edita archivos completos, con guardado y exportación, no un solo campo de formulario.',
      },
    },
    {
      id: 'forms',
      note: { en: 'Plain `textarea` fields when no formatting is needed.', es: 'Campos `textarea` simples cuando no hace falta formato.' },
    },
    {
      id: 'input',
      note: {
        en: 'Single-line text with formatting for numbers and phones.',
        es: 'Texto de una línea con formato para números y teléfonos.',
      },
    },
  ],
};

export default content;
