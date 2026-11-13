import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-input` is a text box that knows a few common formats. Set `variant` to `currency`, `phone`, `percentage` or `password` and the field formats what the user types, blocks characters that do not belong, and hands your code a clean value: a number for currency and percentage, an international phone string for phone.',
      es: '`hk-input` es una caja de texto que conoce varios formatos comunes. Pon `variant` en `currency`, `phone`, `percentage` o `password` y el campo formatea lo que escribe la persona, bloquea caracteres que no corresponden y le entrega a tu código un valor limpio: un número para moneda y porcentaje, y un teléfono en formato internacional para teléfono.',
    },
    {
      en: 'For fixed patterns that are not one of those variants (dates typed by hand, ID numbers, postal codes), add the `hkInputMask` directive to any `<input>` — or to `hk-input` itself — and describe the pattern with `9` for digits, `a` for letters and `*` for either.',
      es: 'Para patrones fijos que no son una de esas variantes (fechas escritas a mano, números de identificación, códigos postales), añade la directiva `hkInputMask` a cualquier `<input>` —o al propio `hk-input`— y describe el patrón con `9` para dígitos, `a` para letras y `*` para cualquiera de los dos.',
    },
  ],
  whenToUse: [
    {
      en: 'Single-line text where the stored value should differ from what is shown, like `1234.5` stored and `$1,234.50` displayed.',
      es: 'Texto de una línea donde el valor guardado debe ser distinto a lo que se muestra, como guardar `1234.5` y mostrar `$1,234.50`.',
    },
    {
      en: 'Phone numbers that should format as the user types and be stored in E.164 form (for example `+17875551234`).',
      es: 'Teléfonos que deben formatearse mientras se escriben y guardarse en formato E.164 (por ejemplo `+17875551234`).',
    },
    {
      en: 'Password fields that need a show/hide button with accessible labels.',
      es: 'Campos de contraseña que necesitan un botón para mostrar u ocultar, con etiquetas accesibles.',
    },
    {
      en: 'Fixed-shape codes (`99/99/9999`, `a9a 9a9`) with `hkInputMask`.',
      es: 'Códigos de forma fija (`99/99/9999`, `a9a 9a9`) con `hkInputMask`.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Picking from a known list of values: use [Select](/select).',
      es: 'Elegir de una lista conocida de valores: usa [Select](/select).',
    },
    {
      en: 'Dates and times the user should pick from a calendar or clock: use [Datepicker](/datepicker) or [Timepicker](/timepicker).',
      es: 'Fechas y horas que la persona debe elegir en un calendario o reloj: usa [Datepicker](/datepicker) o [Timepicker](/timepicker).',
    },
    {
      en: 'Multi-line or formatted text: use the [Rich Text Editor](/editor), or a `textarea` field in a [Dynamic Form](/forms).',
      es: 'Texto de varias líneas o con formato: usa el [Editor de texto enriquecido](/editor), o un campo `textarea` en un [Formulario dinámico](/forms).',
    },
    {
      en: 'A whole form built from configuration: [Dynamic Form](/forms) already renders its own inputs.',
      es: 'Un formulario completo construido desde configuración: el [Formulario dinámico](/forms) ya dibuja sus propios inputs.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InputComponent, InputMaskDirective } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-input-quick-start',
  imports: [InputComponent, InputMaskDirective],
  template: \`
    <hk-input
      variant="currency"
      ariaLabel="Amount"
      placeholder="0.00"
      [currencyConfig]="{ locale: 'en-US', currency: 'USD' }"
      (valueChange)="amount.set($event)"
    />
    <p>Stored value: {{ amount() }}</p>

    <input class="input" aria-label="Date of birth" hkInputMask="99/99/9999" (maskValueChange)="birth.set($event)" />
    <p>Masked value: {{ birth() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputQuickStartComponent {
  readonly amount = signal<string | number | null>(null);
  readonly birth = signal('');
}`,
    note: {
      en: '`hk-input` also implements `ControlValueAccessor`, so `[formControl]` and `formControlName` work once you import `ReactiveFormsModule`.',
      es: '`hk-input` también implementa `ControlValueAccessor`, así que `[formControl]` y `formControlName` funcionan una vez importas `ReactiveFormsModule`.',
    },
  },
  technical: [
    {
      id: 'variant-strategies',
      heading: { en: 'One strategy per variant', es: 'Una estrategia por variante' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each variant is a small strategy object (`InputVariantStrategy`) with `format`, `parse`, `getInputType`, `getInputMode` and an optional `shouldAllowKey`. The component picks one with a `computed()` over `variant()`, so switching the variant re-derives the native `type`, the mobile `inputmode` and the keyboard filter.',
            es: 'Cada variante es un pequeño objeto estrategia (`InputVariantStrategy`) con `format`, `parse`, `getInputType`, `getInputMode` y un `shouldAllowKey` opcional. El componente elige una con un `computed()` sobre `variant()`, así que al cambiar la variante se recalculan el `type` nativo, el `inputmode` móvil y el filtro de teclas.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Variant', es: 'Variante' },
            { en: 'Value emitted', es: 'Valor emitido' },
            { en: 'Notes', es: 'Notas' },
          ],
          rows: [
            [
              { en: '`text`', es: '`text`' },
              { en: 'The string as typed', es: 'El texto tal como se escribe' },
              { en: 'No filtering.', es: 'Sin filtro.' },
            ],
            [
              { en: '`currency`', es: '`currency`' },
              { en: '`number` or `null`', es: '`number` o `null`' },
              {
                en: 'Formatted with `Intl.NumberFormat` (`locale` default `en-US`, `currency` default `USD`, 2 decimals). Negative values only with `allowNegative`.',
                es: 'Se formatea con `Intl.NumberFormat` (`locale` por defecto `en-US`, `currency` por defecto `USD`, 2 decimales). Valores negativos solo con `allowNegative`.',
              },
            ],
            [
              { en: '`phone`', es: '`phone`' },
              { en: 'E.164 string when parseable, digits otherwise', es: 'Texto E.164 cuando se puede interpretar; si no, solo dígitos' },
              {
                en: 'Uses `libphonenumber-js` (`country` default `US`, `format` `national` or `international`). Stops accepting digits at the example length for the country.',
                es: 'Usa `libphonenumber-js` (`country` por defecto `US`, `format` `national` o `international`). Deja de aceptar dígitos al llegar al largo de ejemplo del país.',
              },
            ],
            [
              { en: '`percentage`', es: '`percentage`' },
              { en: '`number` clamped to `min`/`max`', es: '`number` limitado a `min`/`max`' },
              {
                en: 'Defaults: `min` 0, `max` 100, 0 decimals, `%` suffix.',
                es: 'Por defecto: `min` 0, `max` 100, 0 decimales, sufijo `%`.',
              },
            ],
            [
              { en: '`password`', es: '`password`' },
              { en: 'The string as typed', es: 'El texto tal como se escribe' },
              {
                en: 'Show/hide toggle unless `passwordConfig.showToggle` is `false`.',
                es: 'Botón mostrar/ocultar salvo que `passwordConfig.showToggle` sea `false`.',
              },
            ],
          ],
        },
      ],
    },
    {
      id: 'value-flow',
      heading: { en: 'How a value flows', es: 'Cómo fluye un valor' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'writeValue', es: 'writeValue' },
              detail: {
                en: 'The form (or nobody) sets a model value; the strategy formats it into `displayValue`.',
                es: 'El formulario (o nadie) fija un valor; la estrategia lo formatea en `displayValue`.',
              },
            },
            {
              label: { en: 'Focus', es: 'Foco' },
              detail: {
                en: 'For `currency` and `percentage`, formatting is removed so the raw number is easy to edit.',
                es: 'En `currency` y `percentage` se quita el formato para que el número sea fácil de editar.',
              },
            },
            {
              label: { en: 'Input', es: 'Escritura' },
              detail: {
                en: 'Each keystroke is parsed; the parsed value goes to `onChange` and to the `valueChange` output.',
                es: 'Cada tecla se interpreta; el valor resultante va a `onChange` y al output `valueChange`.',
              },
            },
            {
              label: { en: 'Blur', es: 'Salida del campo' },
              detail: {
                en: 'The control is marked touched and the display is formatted again.',
                es: 'El control se marca como tocado y la vista se vuelve a formatear.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Disabled state merges the `disabled` input with `setDisabledState` from Angular forms, so either source disables the field.',
            es: 'El estado deshabilitado combina el input `disabled` con `setDisabledState` de los formularios de Angular, así que cualquiera de los dos deshabilita el campo.',
          },
        },
      ],
    },
    {
      id: 'input-mask',
      heading: { en: 'The hkInputMask directive', es: 'La directiva hkInputMask' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The mask is parsed into slots: `9`, `a` and `*` are editable, every other character is a literal inserted for the user, and a `?` marks where the optional part begins (for example `(999) 999-9999? x99999`). Typing, Backspace, Delete and paste are handled by the directive so the cursor always lands on the next editable slot.',
            es: 'La máscara se divide en espacios: `9`, `a` y `*` son editables, cualquier otro carácter es un literal que se inserta solo, y un `?` marca dónde empieza la parte opcional (por ejemplo `(999) 999-9999? x99999`). Escribir, Backspace, Delete y pegar los maneja la directiva para que el cursor caiga siempre en el próximo espacio editable.',
          },
        },
        {
          kind: 'list',
          items: [
            {
              en: '`slotChar` (default `_`) is shown in empty slots while focused.',
              es: '`slotChar` (por defecto `_`) se muestra en los espacios vacíos mientras el campo tiene el foco.',
            },
            {
              en: '`autoClear` (default `true`) empties the field on blur when the mask is incomplete.',
              es: '`autoClear` (por defecto `true`) vacía el campo al salir si la máscara está incompleta.',
            },
            {
              en: '`unmask` makes `maskValueChange` emit only the typed characters; `maskComplete` fires when every required slot is filled.',
              es: '`unmask` hace que `maskValueChange` emita solo los caracteres escritos; `maskComplete` se dispara cuando todos los espacios requeridos están llenos.',
            },
            {
              en: 'It works on a bare `<input>` or on a component that contains one, and does nothing during server rendering.',
              es: 'Funciona sobre un `<input>` directo o sobre un componente que contenga uno, y no hace nada durante el renderizado en servidor.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Backspace / Delete',
        action: {
          en: 'With `hkInputMask`: remove the character before / after the cursor, skipping literals.',
          es: 'Con `hkInputMask`: borra el carácter antes / después del cursor, saltando los literales.',
        },
      },
      {
        keys: 'Ctrl/Cmd + key',
        action: {
          en: 'Always allowed (copy, paste, select all) in every variant.',
          es: 'Siempre permitido (copiar, pegar, seleccionar todo) en todas las variantes.',
        },
      },
    ],
    notes: [
      {
        en: '`aria-label` comes from `ariaLabel`, falling back to `placeholder`. A placeholder is not a real label, so set `ariaLabel` (or a visible label wired through your own markup) on every field.',
        es: '`aria-label` sale de `ariaLabel` y, si falta, de `placeholder`. Un placeholder no es una etiqueta real, así que pon `ariaLabel` (o una etiqueta visible conectada con tu propio markup) en cada campo.',
      },
      {
        en: 'Use `ariaInvalid` and `ariaDescribedBy` to connect validation messages; they map to `aria-invalid` and `aria-describedby` on the inner `<input>`.',
        es: 'Usa `ariaInvalid` y `ariaDescribedBy` para conectar los mensajes de validación; se reflejan como `aria-invalid` y `aria-describedby` en el `<input>` interno.',
      },
      {
        en: 'The password toggle is a real `<button type="button">` labelled by `showPasswordAriaLabel` / `hidePasswordAriaLabel`; translate them for non-English apps. After toggling, focus returns to the input.',
        es: 'El botón de contraseña es un `<button type="button">` real con etiqueta de `showPasswordAriaLabel` / `hidePasswordAriaLabel`; tradúcelas si tu app no está en inglés. Al alternar, el foco vuelve al input.',
      },
      {
        en: 'Phone and numeric variants set `inputmode` so mobile devices open the right keyboard.',
        es: 'Las variantes de teléfono y numéricas ponen `inputmode` para que el móvil abra el teclado correcto.',
      },
    ],
  },
  performance: [
    {
      en: '`OnPush` with signals: only the inner `<input>` and its prefix/suffix re-render when their own signals change.',
      es: '`OnPush` con signals: solo el `<input>` interno y su prefijo/sufijo se vuelven a dibujar cuando cambian sus signals.',
    },
    {
      en: 'The strategy objects are shared singletons; a page with many inputs does not create one strategy per field.',
      es: 'Los objetos estrategia son únicos y compartidos; una página con muchos inputs no crea una estrategia por campo.',
    },
    {
      en: '`libphonenumber-js` and its example-number metadata are imported statically by the variant strategies, so any page that imports `InputComponent` carries them, even without `variant="phone"`. Keep heavy form pages in lazy routes when bundle size matters.',
      es: '`libphonenumber-js` y sus metadatos de números de ejemplo se importan de forma estática en las estrategias de variante, así que toda página que importe `InputComponent` los carga, aunque no use `variant="phone"`. Mantén las páginas de formularios pesadas en rutas diferidas si el tamaño del bundle importa.',
    },
  ],
  related: [
    {
      id: 'forms',
      note: {
        en: 'Renders inputs for you from a field list; use `hk-input` when you lay out the form yourself.',
        es: 'Dibuja los inputs por ti desde una lista de campos; usa `hk-input` cuando armas el formulario a mano.',
      },
    },
    {
      id: 'select',
      note: {
        en: 'For choosing from options instead of typing free text.',
        es: 'Para elegir entre opciones en vez de escribir texto libre.',
      },
    },
    {
      id: 'directives',
      note: {
        en: 'Where `hkInputMask` lives alongside the other utility directives.',
        es: 'Donde vive `hkInputMask` junto a las otras directivas utilitarias.',
      },
    },
    {
      id: 'datepicker',
      note: {
        en: 'A calendar picker instead of a masked date field.',
        es: 'Un selector de calendario en vez de un campo de fecha con máscara.',
      },
    },
  ],
};

export default content;
