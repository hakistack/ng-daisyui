import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-timepicker` is a field for a time of day. The user can type it directly ("2:30 pm", "1430", "9a") or open a panel and set hours, minutes and, optionally, seconds — either with small up/down fields or, with `clockFace`, by dragging a hand around a round clock like on a phone.',
      es: '`hk-timepicker` es un campo para una hora del día. La persona puede escribirla directamente ("2:30 pm", "1430", "9a") o abrir un panel y ajustar horas, minutos y, opcionalmente, segundos, ya sea con pequeños campos de subir/bajar o, con `clockFace`, arrastrando una manecilla en un reloj redondo como en el celular.',
    },
    {
      en: 'Whatever the display format, your code always gets the same thing: a 24-hour string like `"14:30"` (or `"14:30:00"` with `showSeconds`). That makes it easy to store, compare and send to an API.',
      es: 'Sin importar el formato en pantalla, tu código siempre recibe lo mismo: una cadena de 24 horas como `"14:30"` (o `"14:30:00"` con `showSeconds`). Así es fácil guardarlo, compararlo y enviarlo a una API.',
    },
  ],
  whenToUse: [
    {
      en: 'Opening hours, reminder times, shift start and end — any value that is a time without a date.',
      es: 'Horarios de apertura, horas de recordatorio, inicio y fin de turno: cualquier valor que sea una hora sin fecha.',
    },
    {
      en: 'Forms where fast typists should be able to type the time and mouse or touch users can pick it.',
      es: 'Formularios donde quien escribe rápido pueda teclear la hora y quien usa ratón o pantalla táctil pueda elegirla.',
    },
    {
      en: 'Times restricted to a window (`minTime` / `maxTime`) or to fixed steps (`minuteStep`, for example every 15 minutes).',
      es: 'Horas limitadas a una ventana (`minTime` / `maxTime`) o a intervalos fijos (`minuteStep`, por ejemplo cada 15 minutos).',
    },
  ],
  whenNotToUse: [
    {
      en: 'A date plus a time in one value: use [Datepicker](/datepicker) with `showTime`.',
      es: 'Fecha y hora en un solo valor: usa [Datepicker](/datepicker) con `showTime`.',
    },
    {
      en: 'Durations ("2 hours 15 minutes") that are not a time of day: use a number field in a [Dynamic Form](/forms) or an [Input](/input).',
      es: 'Duraciones ("2 horas y 15 minutos") que no son una hora del día: usa un campo numérico en un [Formulario dinámico](/forms) o un [Input](/input).',
    },
    {
      en: 'A small fixed set of slots (9:00, 10:00, 11:00): a [Select](/select) is clearer.',
      es: 'Un conjunto pequeño y fijo de horarios (9:00, 10:00, 11:00): un [Select](/select) es más claro.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TimepickerComponent, type TimepickerEvent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-timepicker-quick-start',
  imports: [TimepickerComponent],
  template: \`
    <hk-timepicker
      placeholder="Meeting time"
      minTime="08:00"
      maxTime="18:00"
      [use24Hour]="false"
      [minuteStep]="15"
      (timeChange)="onTime($event)"
    />
    <p>Stored value: {{ value() ?? 'none' }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimepickerQuickStartComponent {
  readonly value = signal<string | null>(null);

  onTime(event: TimepickerEvent): void {
    this.value.set(event.value);
  }
}`,
    note: {
      en: 'With Angular forms, bind `[formControl]` to a control holding a `"HH:mm"` string. The component also acts as a validator and reports `required`, `minTime` and `maxTime` errors.',
      es: 'Con formularios de Angular, enlaza `[formControl]` a un control con una cadena `"HH:mm"`. El componente también actúa como validador y reporta los errores `required`, `minTime` y `maxTime`.',
    },
  },
  technical: [
    {
      id: 'value-model',
      heading: { en: 'One value, many displays', es: 'Un valor, muchas formas de verlo' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Internally the picker stores hour (0–23), minute, second and AM/PM in signals. `currentValue` is a `computed()` that always produces the 24-hour string written to the form and emitted in `timeChange`; `displayValue` formats the same signals for the field, in 24-hour (the default, `use24Hour` is `true`) or 12-hour style.',
            es: 'Por dentro, el selector guarda hora (0–23), minuto, segundo y AM/PM en signals. `currentValue` es un `computed()` que siempre produce la cadena de 24 horas que se escribe en el formulario y se emite en `timeChange`; `displayValue` formatea los mismos signals para el campo, en estilo de 24 horas (por defecto, `use24Hour` es `true`) o de 12 horas.',
          },
        },
        {
          kind: 'p',
          text: {
            en: '`minTime` and `maxTime` are `"HH:mm"` strings. The panel enforces them: hours, minutes and seconds outside the window are disabled and cannot be picked. A value that still falls outside (typed, or written by the form) is reported by the validator, and the field shows the `minTimeError` / `maxTimeError` message once touched. Because the values are zero-padded 24-hour strings, they compare correctly as text.',
            es: '`minTime` y `maxTime` son cadenas `"HH:mm"`. El panel los respeta: las horas, minutos y segundos fuera de esa ventana aparecen deshabilitados y no se pueden elegir. Si aun así llega un valor fuera de la ventana (escrito a mano o asignado desde el formulario), el validador lo reporta y el campo muestra el mensaje `minTimeError` / `maxTimeError` una vez tocado. Como son cadenas de 24 horas con ceros a la izquierda, se comparan correctamente como texto.',
          },
        },
      ],
    },
    {
      id: 'typed-input',
      heading: { en: 'Typing a time', es: 'Escribir una hora' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Unlike the datepicker, the field is editable. While the user types, a hint below the field previews how the text will be read; on Enter or blur the text is parsed and snapped to `minuteStep` / `secondStep`. Text that cannot be read is discarded and the previous value is shown again.',
            es: 'A diferencia del datepicker, el campo es editable. Mientras la persona escribe, una indicación debajo del campo muestra cómo se va a interpretar el texto; al presionar Enter o salir del campo, el texto se interpreta y se ajusta a `minuteStep` / `secondStep`. El texto que no se puede interpretar se descarta y se vuelve a mostrar el valor anterior.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Typed', es: 'Escrito' },
            { en: 'Read as', es: 'Se interpreta como' },
          ],
          rows: [
            [
              { en: '`14:30`, `2.30 pm`, `2:30p.m.`', es: '`14:30`, `2.30 pm`, `2:30p.m.`' },
              { en: '14:30', es: '14:30' },
            ],
            [
              { en: '`2p`, `230p`', es: '`2p`, `230p`' },
              { en: '14:00, 14:30', es: '14:00, 14:30' },
            ],
            [
              { en: '`9`, `13`', es: '`9`, `13`' },
              { en: '09:00, 13:00', es: '09:00, 13:00' },
            ],
            [
              { en: '`130`, `0930`, `1300`', es: '`130`, `0930`, `1300`' },
              { en: '01:30, 09:30, 13:00', es: '01:30, 09:30, 13:00' },
            ],
          ],
        },
      ],
    },
    {
      id: 'panel-modes',
      heading: { en: 'Segments or clock face', es: 'Segmentos o esfera de reloj' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: '**Segments** (default): one small input per unit with increment/decrement buttons. Typing two digits jumps to the next segment; arrow keys and the mouse wheel step the focused segment.',
              es: '**Segmentos** (por defecto): un pequeño input por unidad con botones de subir y bajar. Al escribir dos dígitos salta al siguiente segmento; las flechas y la rueda del ratón cambian el segmento que tiene el foco.',
            },
            {
              en: '**Clock face** (`clockFace`): a dial drawn with absolutely positioned numbers and an SVG hand. Pointer events with pointer capture let the user drag continuously; on release the view advances from hours to minutes (and to seconds with `showSeconds`). In 24-hour mode the dial has an inner ring for 00 and 13–23.',
              es: '**Esfera de reloj** (`clockFace`): un dial con números en posición absoluta y una manecilla SVG. Los eventos de puntero con captura permiten arrastrar de forma continua; al soltar, la vista pasa de horas a minutos (y a segundos con `showSeconds`). En modo de 24 horas el dial tiene un anillo interior para 00 y 13–23.',
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The panel is a CDK connected overlay positioned by `dropdownPosition`, following the field on scroll. All visible strings (`hourLabel`, `minuteLabel`, `secondLabel`, `nowLabel`, `clearLabel`, `closeLabel`, `requiredError`, `minTimeError`, `maxTimeError`) are separate inputs you can translate.',
            es: 'El panel es un overlay conectado de CDK que se posiciona con `dropdownPosition` y sigue al campo cuando la página se desplaza. Todos los textos visibles (`hourLabel`, `minuteLabel`, `secondLabel`, `nowLabel`, `clearLabel`, `closeLabel`, `requiredError`, `minTimeError`, `maxTimeError`) son inputs separados que puedes traducir.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      { keys: 'ArrowDown', action: { en: 'On the field: open the panel.', es: 'En el campo: abre el panel.' } },
      { keys: 'Enter', action: { en: 'On the field: apply the typed time.', es: 'En el campo: aplica la hora escrita.' } },
      {
        keys: 'Escape',
        action: { en: 'Restore the previous text and close the panel.', es: 'Restaura el texto anterior y cierra el panel.' },
      },
      {
        keys: 'ArrowUp / ArrowDown',
        action: { en: 'In a segment: increase / decrease that unit.', es: 'En un segmento: sube / baja esa unidad.' },
      },
      {
        keys: 'Enter',
        action: {
          en: 'In a segment: confirm, and close if `closeOnSelect` is on.',
          es: 'En un segmento: confirma y cierra si `closeOnSelect` está activo.',
        },
      },
      { keys: 'Enter / Space', action: { en: 'On the clock dial: pick the value.', es: 'En el dial del reloj: elige el valor.' } },
    ],
    notes: [
      {
        en: 'The field has `aria-haspopup="dialog"`, `aria-expanded`, and `aria-invalid` / `aria-describedby` pointing at the error message once touched. The panel is `role="dialog"` with `aria-modal="true"`.',
        es: 'El campo tiene `aria-haspopup="dialog"`, `aria-expanded`, y `aria-invalid` / `aria-describedby` apuntando al mensaje de error una vez tocado. El panel es `role="dialog"` con `aria-modal="true"`.',
      },
      {
        en: 'AM/PM is a `role="radiogroup"` with `aria-checked` on each option; the hour/minute/second view switches use `aria-pressed`. The typing hint is announced through `aria-live="polite"`.',
        es: 'AM/PM es un `role="radiogroup"` con `aria-checked` en cada opción; los botones para cambiar entre hora/minuto/segundo usan `aria-pressed`. La indicación que aparece al escribir se anuncia con `aria-live="polite"`.',
      },
      {
        en: 'Set `controlId` when a visible `<label for="...">` names the field: the inner input takes that id and the label becomes the accessible name. Without `controlId`, the `aria-label` comes from `placeholder`; use a descriptive one ("Meeting time"). Some built-in aria-labels ("Increment hour", "AM or PM", "Open time picker") are fixed English strings today.',
        es: 'Usa `controlId` cuando un `<label for="...">` visible da nombre al campo: el input interno toma ese id y la etiqueta pasa a ser el nombre accesible. Sin `controlId`, el `aria-label` sale del `placeholder`; usa uno descriptivo ("Hora de la reunión"). Algunos aria-labels integrados ("Increment hour", "AM or PM", "Open time picker") son textos fijos en inglés por ahora.',
      },
      {
        en: 'Unlike the datepicker, Tab is not trapped inside the open panel; focus moves to the hour segment on open in segment mode.',
        es: 'A diferencia del datepicker, Tab no queda atrapado dentro del panel abierto; en modo segmentos el foco pasa al segmento de hora al abrir.',
      },
    ],
  },
  performance: [
    {
      en: 'Hour, minute and second options and clock positions are `computed()` from `use24Hour`, `minuteStep` and `secondStep`, so they are recalculated only when those inputs change.',
      es: 'Las opciones de hora, minuto y segundo y las posiciones del reloj son `computed()` de `use24Hour`, `minuteStep` y `secondStep`, así que solo se recalculan cuando cambian esos inputs.',
    },
    {
      en: 'The panel is rendered only while open. Document listeners (keydown while open, pointermove during a dial drag) are added on demand and removed afterwards.',
      es: 'El panel solo se renderiza mientras está abierto. Los listeners en `document` (keydown mientras está abierto, pointermove durante un arrastre del dial) se añaden cuando hacen falta y se quitan después.',
    },
  ],
  related: [
    {
      id: 'datepicker',
      note: { en: 'Calendar date, date range, or date with time.', es: 'Fecha de calendario, rango de fechas o fecha con hora.' },
    },
    {
      id: 'forms',
      note: {
        en: 'The `time` field type renders a time control inside a form config.',
        es: 'El tipo de campo `time` renderiza un control de hora dentro de la configuración del formulario.',
      },
    },
    {
      id: 'input',
      note: { en: 'Masked free typing when no picker is needed.', es: 'Escritura libre con máscara cuando no hace falta un selector.' },
    },
  ],
};

export default content;
