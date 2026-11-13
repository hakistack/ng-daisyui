import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: add two small behaviors to plain elements without a wrapper component. [AutoFocusDirective](/api/AutoFocusDirective) moves focus to an element when it appears, and [InputMaskDirective](/api/InputMaskDirective) makes an input accept a fixed pattern such as a phone number or a postal code.',
      es: 'Objetivo: agregar dos comportamientos pequeños a elementos simples sin un componente envoltorio. [AutoFocusDirective](/api/AutoFocusDirective) mueve el foco a un elemento cuando aparece, e [InputMaskDirective](/api/InputMaskDirective) hace que un input acepte un patrón fijo como un teléfono o un código postal.',
    },
    {
      en: 'Both are standalone: import the class in your component `imports` and use the attribute. The motion directives live on the [Motion](/motion) page.',
      es: 'Las dos son standalone: importa la clase en los `imports` de tu componente y usa el atributo. Las directivas de animación están en la página de [Motion](/motion).',
    },
  ],
  sections: [
    {
      id: 'auto-focus',
      heading: { en: 'AutoFocusDirective', es: 'AutoFocusDirective' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Selector: `[appAutoFocus]`. After the view initializes, it calls `focus()` on the host element in a microtask. It runs once per element instance and has no inputs; to focus again, the element must be created again (for example inside an `@if`).',
            es: 'Selector: `[appAutoFocus]`. Después de iniciar la vista, llama `focus()` sobre el elemento en una microtarea. Corre una vez por instancia del elemento y no tiene inputs; para enfocar de nuevo, el elemento debe crearse otra vez (por ejemplo dentro de un `@if`).',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          code: `@if (editing()) {
  <label class="label" for="title-input">Title</label>
  <input id="title-input" class="input" appAutoFocus [value]="title()" />
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Use it when the user just asked for the element: an inline edit, a search box they opened, the first field of a dialog.',
              es: 'Úsala cuando el usuario acaba de pedir el elemento: una edición en línea, un buscador que abrió, el primer campo de un diálogo.',
            },
            {
              en: 'Avoid it on page load: stealing focus skips the content before it for keyboard and screen reader users.',
              es: 'Evítala al cargar la página: robar el foco hace que usuarios de teclado y lectores de pantalla se salten el contenido anterior.',
            },
            {
              en: 'The host must be focusable (an input, a button, or an element with `tabindex`).',
              es: 'El elemento debe ser enfocable (un input, un botón o un elemento con `tabindex`).',
            },
          ],
        },
      ],
    },
    {
      id: 'input-mask',
      heading: { en: 'InputMaskDirective', es: 'InputMaskDirective' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Selector: `[hkInputMask]`. The mask is a string where `9` is a digit, `a` is a letter, `*` is a letter or digit, and every other character is a literal inserted for the user. A `?` marks the rest of the mask as optional. It works on an `<input>` or on a component that contains one (it looks one level down), and does nothing on the server.',
            es: 'Selector: `[hkInputMask]`. La máscara es un texto donde `9` es un dígito, `a` una letra, `*` una letra o dígito, y cualquier otro carácter es un literal que se inserta por el usuario. Un `?` marca el resto de la máscara como opcional. Funciona sobre un `<input>` o sobre un componente que contenga uno (busca un nivel hacia abajo), y no hace nada en el servidor.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Input / output', es: 'Input / output' },
            { en: 'Default', es: 'Por defecto' },
            { en: 'Meaning', es: 'Significado' },
          ],
          rows: [
            [
              { en: '`hkInputMask`', es: '`hkInputMask`' },
              { en: 'required', es: 'requerido' },
              { en: 'The pattern, e.g. `(999) 999-9999`', es: 'El patrón, p. ej. `(999) 999-9999`' },
            ],
            [
              { en: '`slotChar`', es: '`slotChar`' },
              { en: "`'_'`", es: "`'_'`" },
              { en: 'Placeholder shown in empty slots', es: 'Marcador que se ve en las posiciones vacías' },
            ],
            [
              { en: '`autoClear`', es: '`autoClear`' },
              { en: '`true`', es: '`true`' },
              { en: 'Clear the field on blur when the mask is incomplete', es: 'Vaciar el campo al salir si la máscara está incompleta' },
            ],
            [
              { en: '`unmask`', es: '`unmask`' },
              { en: '`false`', es: '`false`' },
              {
                en: 'Emit only typed characters (`5551234567`) instead of the display (`(555) 123-4567`)',
                es: 'Emitir solo los caracteres escritos (`5551234567`) en vez de lo mostrado (`(555) 123-4567`)',
              },
            ],
            [
              { en: '`maskValueChange`', es: '`maskValueChange`' },
              { en: 'output', es: 'output' },
              { en: 'Fires on every change with the value', es: 'Se emite en cada cambio con el valor' },
            ],
            [
              { en: '`maskComplete`', es: '`maskComplete`' },
              { en: 'output', es: 'output' },
              { en: 'Fires when every required slot is filled', es: 'Se emite cuando todas las posiciones requeridas están llenas' },
            ],
          ],
        },
        {
          kind: 'code',
          lang: 'html',
          code: `<label class="label" for="phone">Phone</label>
<input
  id="phone"
  class="input"
  hkInputMask="(999) 999-9999"
  [unmask]="true"
  aria-describedby="phone-hint"
  (maskValueChange)="phone.set($event)"
/>
<p id="phone-hint" class="text-sm">Format: (555) 123-4567</p>`,
        },
        {
          kind: 'p',
          text: {
            en: 'Behavior: typed characters that do not fit the slot are rejected, the cursor skips literals, Backspace and Delete remove one slot (or the selection), paste is filtered through the mask, and on focus the cursor jumps to the first empty slot. Arrow keys, Home, End, Tab, Enter, Escape and Ctrl/Cmd/Alt combinations are left to the browser. Mobile keyboards and IME input are reconciled on the `input` event.',
            es: 'Comportamiento: los caracteres que no encajan en la posición se rechazan, el cursor salta los literales, Backspace y Delete borran una posición (o la selección), lo pegado se filtra por la máscara, y al enfocar el cursor va a la primera posición vacía. Las flechas, Home, End, Tab, Enter, Escape y las combinaciones con Ctrl/Cmd/Alt se dejan al navegador. La entrada de teclados móviles e IME se reconcilia en el evento `input`.',
          },
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: 'The directive writes the masked text to the input and dispatches an `input` event, so a `formControl` on the same input receives the **display** value. Read `maskValueChange` with `unmask` when you need raw digits.',
            es: 'La directiva escribe el texto con máscara en el input y dispara un evento `input`, así que un `formControl` en el mismo input recibe el valor **mostrado**. Lee `maskValueChange` con `unmask` cuando necesites solo los dígitos.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Accessibility: the directive adds no ARIA. Always give the input a visible label and describe the expected format in text linked with `aria-describedby`; slot characters such as `_` may be read aloud. With `autoClear`, an incomplete value disappears on blur, so tell users the field must be complete.',
            es: 'Accesibilidad: la directiva no agrega ARIA. Dale siempre al input una etiqueta visible y describe el formato esperado en un texto enlazado con `aria-describedby`; los marcadores como `_` pueden leerse en voz alta. Con `autoClear`, un valor incompleto desaparece al salir, así que avisa que el campo debe completarse.',
          },
        },
      ],
    },
  ],
  related: [
    { id: 'input', note: { en: 'Inputs that pair well with masks.', es: 'Inputs que combinan bien con máscaras.' } },
    { id: 'motion', note: { en: 'The animation directives.', es: 'Las directivas de animación.' } },
    { id: 'accessibility', note: { en: 'Focus management guidelines.', es: 'Pautas de manejo del foco.' } },
  ],
};

export default content;
