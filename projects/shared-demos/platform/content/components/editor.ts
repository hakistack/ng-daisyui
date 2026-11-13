import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-editor` is a rich text box: like a mini word processor inside your page. Users can make text bold, add headings, lists, links and images, and your code receives the result as an HTML string.',
      es: '`hk-editor` es una caja de texto enriquecido: como un pequeño procesador de palabras dentro de tu página. La persona puede poner texto en negrita, añadir títulos, listas, enlaces e imágenes, y tu código recibe el resultado como un texto HTML.',
    },
    {
      en: 'It is built on TipTap (which itself runs on ProseMirror) and styled with daisyUI. You choose how much toolbar to show (`minimal`, `basic`, `full` or your own list of buttons), can turn on Notion-style slash commands (type `/` to insert a block), and can plug in your own image upload. It works with Angular forms like any other input.',
      es: 'Está construido sobre TipTap (que a su vez corre sobre ProseMirror) y usa estilos de daisyUI. Tú decides cuánta barra de herramientas mostrar (`minimal`, `basic`, `full` o tu propia lista de botones), puedes activar comandos con barra al estilo Notion (escribe `/` para insertar un bloque) y puedes conectar tu propia subida de imágenes. Funciona con los formularios de Angular como cualquier otro input.',
    },
  ],
  whenToUse: [
    {
      en: 'Descriptions, comments, notes or email bodies where users need basic formatting.',
      es: 'Descripciones, comentarios, notas o cuerpos de correo donde la persona necesita formato básico.',
    },
    {
      en: 'Content that will be stored and shown again as HTML (blog posts, product descriptions, knowledge base entries).',
      es: 'Contenido que se guardará y se mostrará de nuevo como HTML (publicaciones, descripciones de productos, artículos de una base de conocimiento).',
    },
    {
      en: 'Authoring flows that benefit from reusable snippets inserted with `/` (signatures, templates).',
      es: 'Flujos de redacción que se benefician de fragmentos reutilizables insertados con `/` (firmas, plantillas).',
    },
  ],
  whenNotToUse: [
    {
      en: 'Plain single-line text: use [Input](/input).',
      es: 'Texto simple de una línea: usa [Input](/input).',
    },
    {
      en: 'Plain multi-line text with no formatting: a `textarea` field in a [Dynamic Form](/forms) is lighter.',
      es: 'Texto de varias líneas sin formato: un campo `textarea` en un [Formulario dinámico](/forms) es más liviano.',
    },
    {
      en: 'Editing whole files (DOCX, Markdown, CSV) with save and export: use the [Document Editor](/document-editor).',
      es: 'Editar archivos completos (DOCX, Markdown, CSV) con guardar y exportar: usa el [Editor de documentos](/document-editor).',
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
      en: 'With Angular forms, bind `[formControl]`: the control value is the HTML string. `minLength` and `maxLength` are checked against the plain text and reported as `minlength` / `maxlength` errors.',
      es: 'Con formularios de Angular, usa `[formControl]`: el valor del control es el texto HTML. `minLength` y `maxLength` se comparan contra el texto plano y se reportan como errores `minlength` / `maxlength`.',
    },
  },
  technical: [
    {
      id: 'lifecycle',
      heading: { en: 'Lazy engine and lifecycle', es: 'Motor diferido y ciclo de vida' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'First render', es: 'Primer render' },
              detail: {
                en: 'The component renders its toolbar and an empty surface. Nothing from TipTap is loaded yet.',
                es: 'El componente dibuja su barra y una superficie vacía. Todavía no se carga nada de TipTap.',
              },
            },
            {
              label: { en: 'afterNextRender (browser only)', es: 'afterNextRender (solo navegador)' },
              detail: {
                en: 'TipTap core, StarterKit, Link, Placeholder, Image and FileHandler are imported with dynamic `import()`. On the server this step is skipped.',
                es: 'TipTap core, StarterKit, Link, Placeholder, Image y FileHandler se importan con `import()` dinámico. En el servidor este paso se omite.',
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
                en: 'The TipTap instance is destroyed with the component.',
                es: 'La instancia de TipTap se destruye junto con el componente.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Every ProseMirror transaction bumps a `tick` signal. The toolbar receives stable `isActive` / `canRun` functions that read `tick`, so button states (pressed, disabled) refresh under OnPush without the editor pushing state into the toolbar. `disabled`, `readonly` and the forms disabled state are merged into one `computed()` that an effect passes to `setEditable`.',
            es: 'Cada transacción de ProseMirror incrementa una signal `tick`. La barra recibe funciones estables `isActive` / `canRun` que leen `tick`, así que el estado de los botones (presionado, deshabilitado) se actualiza con OnPush sin que el editor empuje estado a la barra. `disabled`, `readonly` y el estado deshabilitado del formulario se combinan en un `computed()` que un effect pasa a `setEditable`.',
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
            en: 'Pass an array of `EditorToolbarItem` instead of a preset to pick buttons yourself; `divider` adds a separator. Link and image buttons open a small built-in modal for the URL and alt text. Links get `rel="noopener noreferrer nofollow"` and do not open on click while editing.',
            es: 'Pasa un arreglo de `EditorToolbarItem` en vez de un preset para elegir los botones tú; `divider` añade un separador. Los botones de enlace e imagen abren un pequeño modal integrado para la URL y el texto alternativo. Los enlaces llevan `rel="noopener noreferrer nofollow"` y no se abren al hacer clic mientras se edita.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Images: without `onImageUpload` the image button asks for a URL. With it, the button opens a file picker, calls your function with the `File`, and inserts the URL it returns. The same uploader handles images dropped or pasted into the editor (PNG, JPEG, GIF, WebP, SVG); without an uploader, dropped and pasted files are ignored. Storage is always yours.',
            es: 'Imágenes: sin `onImageUpload`, el botón de imagen pide una URL. Con él, el botón abre un selector de archivos, llama tu función con el `File` e inserta la URL que devuelve. El mismo uploader maneja imágenes arrastradas o pegadas en el editor (PNG, JPEG, GIF, WebP, SVG); sin uploader, los archivos arrastrados o pegados se ignoran. El almacenamiento siempre es tuyo.',
          },
        },
      ],
    },
    {
      id: 'slash-commands',
      heading: { en: 'Slash commands', es: 'Comandos con barra' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`slashCommands` accepts `true` (built-ins: headings 1–3, bullet and ordered list, blockquote, code block, divider), an array that replaces the built-ins, or `{ items, append: true }` to add to them. The popup is built on TipTap Suggestion; its state lives in Angular signals. Build items with the `slash` helpers and wrap the config in `createSlashCommands` for type checking.',
            es: '`slashCommands` acepta `true` (incluidos: títulos 1–3, listas con viñetas y numeradas, cita, bloque de código, separador), un arreglo que reemplaza los incluidos, o `{ items, append: true }` para añadir a ellos. El popup usa TipTap Suggestion; su estado vive en signals de Angular. Crea los elementos con los helpers de `slash` y envuelve la configuración en `createSlashCommands` para que TypeScript la valide.',
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
            en: 'Snippets are inserted as HTML through TipTap, which keeps only the nodes and marks its extensions know. Still, only insert HTML from sources you trust, and sanitize stored HTML before rendering it elsewhere in your app.',
            es: 'Los fragmentos se insertan como HTML a través de TipTap, que conserva solo los nodos y marcas que sus extensiones conocen. Aun así, inserta solo HTML de fuentes confiables y sanitiza el HTML guardado antes de mostrarlo en otra parte de tu app.',
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
          es: 'Popup de comandos: recorre los comandos (da la vuelta).',
        },
      },
      { keys: 'Enter', action: { en: 'Slash popup: run the active command.', es: 'Popup de comandos: ejecuta el comando activo.' } },
      { keys: 'Escape', action: { en: 'Slash popup: close it.', es: 'Popup de comandos: lo cierra.' } },
      {
        keys: 'Enter / Escape',
        action: { en: 'Link or image modal: confirm / cancel.', es: 'Modal de enlace o imagen: confirma / cancela.' },
      },
    ],
    notes: [
      {
        en: 'The toolbar is `role="toolbar"`; each button has an `aria-label` and toggle buttons expose `aria-pressed`. Buttons keep the editor selection because they prevent focus loss on mousedown.',
        es: 'La barra es `role="toolbar"`; cada botón tiene `aria-label` y los botones de alternar exponen `aria-pressed`. Los botones conservan la selección del editor porque evitan la pérdida de foco en mousedown.',
      },
      {
        en: 'Toolbar actions are announced through a visually hidden `aria-live="polite"` region ("Bold on", "Undo"). Formatting shortcuts typed on the keyboard come from TipTap StarterKit and are not announced.',
        es: 'Las acciones de la barra se anuncian en una región oculta `aria-live="polite"` ("Bold on", "Undo"). Los atajos de teclado de formato vienen de TipTap StarterKit y no se anuncian.',
      },
      {
        en: 'Set `ariaLabel`; without it the editing surface is labelled with the `placeholder`, or "Rich text editor" as a last resort. The slash popup is a `role="listbox"` with `aria-selected` on the active option.',
        es: 'Pon `ariaLabel`; sin él, la superficie de edición se etiqueta con el `placeholder` o, como último recurso, "Rich text editor". El popup de comandos es un `role="listbox"` con `aria-selected` en la opción activa.',
      },
      {
        en: 'Button labels, announcements and the modal texts ("Cancel", "Image URL") are English strings in the library today.',
        es: 'Las etiquetas de los botones, los anuncios y los textos del modal ("Cancel", "Image URL") son textos en inglés en la librería por ahora.',
      },
    ],
  },
  performance: [
    {
      en: 'TipTap and its extensions load with dynamic `import()` after the first render, so they do not block the page and end up in a separate chunk. The TipTap Suggestion plugin behind slash commands is imported only when `slashCommands` is enabled.',
      es: 'TipTap y sus extensiones se cargan con `import()` dinámico después del primer render, así que no bloquean la página y quedan en un chunk aparte. El plugin Suggestion de TipTap que usan los comandos con barra solo se importa si `slashCommands` está activo.',
    },
    {
      en: '`writeValue` uses `setContent` without emitting an update, so setting the form value does not echo back as a change. Values written before the engine loads are held and applied once it is ready.',
      es: '`writeValue` usa `setContent` sin emitir una actualización, así que fijar el valor del formulario no regresa como un cambio. Los valores escritos antes de que cargue el motor se guardan y se aplican cuando está listo.',
    },
    {
      en: 'Each keystroke serializes the document to HTML for `onChange` and `textChange`. For very long documents, avoid expensive work in your `textChange` handler.',
      es: 'Cada tecla serializa el documento a HTML para `onChange` y `textChange`. Con documentos muy largos, evita trabajo costoso en tu manejador de `textChange`.',
    },
  ],
  related: [
    {
      id: 'document-editor',
      note: {
        en: 'Edits whole files with save and export, not a single form field.',
        es: 'Edita archivos completos con guardar y exportar, no un solo campo de formulario.',
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
