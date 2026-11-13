import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`hk-datepicker` is a date field that opens a calendar. The user clicks (or presses Enter) on the field, picks a day, and the field shows the date formatted for their language. Your code gets a real JavaScript `Date`, not a string you have to parse.',
      es: '`hk-datepicker` es un campo de fecha que abre un calendario. La persona hace clic (o presiona Enter) en el campo, elige un día y el campo muestra la fecha con el formato de su idioma. Tu código recibe un `Date` real de JavaScript, no un texto que tengas que interpretar.',
    },
    {
      en: 'The same component covers three cases: one date, a date range (`range`) where the user picks a start and an end, and a date with time (`showTime`). It can block dates you do not allow — before `minDate`, after `maxDate`, specific holidays, or whole weekdays — and it reports `required`, `min` and `max` errors to Angular forms by itself.',
      es: 'El mismo componente cubre tres casos: una fecha, un rango de fechas (`range`) donde la persona elige inicio y fin, y fecha con hora (`showTime`). Puede bloquear fechas que no permites —antes de `minDate`, después de `maxDate`, feriados específicos o días de la semana completos— y reporta por sí mismo los errores `required`, `min` y `max` a los formularios de Angular.',
    },
  ],
  whenToUse: [
    {
      en: 'Birthdays, due dates, appointment days — any field whose value is a calendar date.',
      es: 'Fechas de nacimiento, fechas de vencimiento, días de cita: cualquier campo cuyo valor sea una fecha de calendario.',
    },
    {
      en: 'Reporting filters or bookings that need a start and end date (`range`).',
      es: 'Filtros de reportes o reservas que necesitan fecha de inicio y fin (`range`).',
    },
    {
      en: 'A single field for date plus time, with 12 or 24-hour display and a minute step.',
      es: 'Un solo campo para fecha y hora, con formato de 12 o 24 horas y un intervalo de minutos.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Only a time of day, with no date: use [Timepicker](/timepicker).',
      es: 'Solo una hora del día, sin fecha: usa [Timepicker](/timepicker).',
    },
    {
      en: 'Fast typing of a known date (for example data entry from paper forms): an [Input](/input) with `hkInputMask="99/99/9999"` is quicker than navigating a calendar.',
      es: 'Escritura rápida de una fecha conocida (por ejemplo, digitar formularios en papel): un [Input](/input) con `hkInputMask="99/99/9999"` es más rápido que navegar un calendario.',
    },
    {
      en: 'Date fields inside a form you build from configuration: use the `date` or `datetime` field of the [Dynamic Form](/forms).',
      es: 'Campos de fecha dentro de un formulario construido desde configuración: usa el campo `date` o `datetime` del [Formulario dinámico](/forms).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatepickerComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-datepicker-quick-start',
  imports: [DatepickerComponent],
  template: \`
    <hk-datepicker
      placeholder="Appointment date"
      locale="es-PR"
      [minDate]="today"
      [disabledDaysOfWeek]="[0, 6]"
      [showTodayButton]="true"
      (dateSelected)="picked.set($event)"
    />
    <p>Picked: {{ pickedLabel() }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerQuickStartComponent {
  readonly today = new Date();
  readonly picked = signal<Date | null>(null);
  readonly pickedLabel = computed(() => this.picked()?.toDateString() ?? 'nothing yet');
}`,
    note: {
      en: 'For Angular forms, bind `[formControl]`: the value is a `Date`, or `{ start, end }` in range mode. The component also registers itself as a validator, so `required`, `minDate` and `maxDate` show up in the control errors.',
      es: 'Con formularios de Angular, usa `[formControl]`: el valor es un `Date`, o `{ start, end }` en modo rango. El componente además se registra como validador, así que `required`, `minDate` y `maxDate` aparecen en los errores del control.',
    },
  },
  technical: [
    {
      id: 'state',
      heading: { en: 'Signals and the calendar grid', es: 'Signals y la cuadrícula del calendario' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'The picker keeps its state in signals: `currentMonth`, `currentView` (`days`, `months` or `years`), `selectedDate`, `rangeStart` / `rangeEnd`, `focusedDate` for the keyboard cursor, and hour, minute and period for time. The visible weeks, weekday headers, month and year grids, the display text and the validation errors are all `computed()` from them, so OnPush change detection only redraws what changed.',
            es: 'El selector guarda su estado en signals: `currentMonth`, `currentView` (`days`, `months` o `years`), `selectedDate`, `rangeStart` / `rangeEnd`, `focusedDate` para el cursor de teclado, y hora, minuto y periodo para el tiempo. Las semanas visibles, los encabezados de días, las cuadrículas de meses y años, el texto mostrado y los errores de validación son `computed()` de esas signals, así que OnPush solo redibuja lo que cambió.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Month and weekday names come from `Intl.DateTimeFormat` with the `locale` input; `firstDayOfWeek` (0 = Sunday, 1 = Monday) shifts the columns. Use `customDateFormatter` or `customRangeFormatter` to control the text shown in the field.',
            es: 'Los nombres de meses y días salen de `Intl.DateTimeFormat` con el input `locale`; `firstDayOfWeek` (0 = domingo, 1 = lunes) mueve las columnas. Usa `customDateFormatter` o `customRangeFormatter` para controlar el texto que se muestra en el campo.',
          },
        },
      ],
    },
    {
      id: 'selection-flow',
      heading: { en: 'Selection and form integration', es: 'Selección e integración con formularios' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Open', es: 'Abrir' },
              detail: {
                en: 'The calendar opens on the selected date (or today) and moves focus into the day grid.',
                es: 'El calendario se abre en la fecha elegida (o en hoy) y mueve el foco a la cuadrícula de días.',
              },
            },
            {
              label: { en: 'Pick', es: 'Elegir' },
              detail: {
                en: 'Single mode emits `dateSelected` and `selectionChange`. Range mode takes two clicks, swaps them if the second is earlier, then emits `rangeSelected`.',
                es: 'En modo simple emite `dateSelected` y `selectionChange`. En modo rango toma dos clics, los invierte si el segundo es anterior y luego emite `rangeSelected`.',
              },
            },
            {
              label: { en: 'Write to the form', es: 'Escribir al formulario' },
              detail: {
                en: 'The `ControlValueAccessor` receives a `Date` (with hours and minutes when `showTime` is on) or `{ start, end }`.',
                es: 'El `ControlValueAccessor` recibe un `Date` (con horas y minutos cuando `showTime` está activo) o `{ start, end }`.',
              },
            },
            {
              label: { en: 'Close', es: 'Cerrar' },
              detail: {
                en: 'With `closeOnSelect` (default `true`) the panel closes and focus returns to the field. With `showTime` it stays open so the user can set the time.',
                es: 'Con `closeOnSelect` (por defecto `true`) el panel se cierra y el foco vuelve al campo. Con `showTime` se queda abierto para que la persona ajuste la hora.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Because the component is also an `NG_VALIDATORS` provider, a touched invalid field shows its own message below the input (`requiredError`, `minError`, `maxError`) and sets `aria-invalid`.',
            es: 'Como el componente también es un proveedor `NG_VALIDATORS`, un campo tocado e inválido muestra su propio mensaje debajo del input (`requiredError`, `minError`, `maxError`) y pone `aria-invalid`.',
          },
        },
      ],
    },
    {
      id: 'labels-and-overlay',
      heading: { en: 'Labels and positioning', es: 'Textos y posición' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every visible string and aria-label can be replaced with the `labels` input (`DatepickerLabels`); anything you leave out falls back to English. The calendar is a CDK connected overlay: `dropdownPosition` sets the preferred corner and it flips automatically when there is no room, and it follows the field as the page scrolls.',
            es: 'Cada texto visible y cada aria-label se puede reemplazar con el input `labels` (`DatepickerLabels`); lo que no pongas vuelve al inglés. El calendario es un overlay conectado de CDK: `dropdownPosition` define la esquina preferida, se voltea solo cuando no hay espacio y sigue al campo al hacer scroll.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'Spanish labels',
          code: `<hk-datepicker
  locale="es-PR"
  placeholder="Fecha de entrega"
  [firstDayOfWeek]="1"
  [labels]="{ todayLabel: 'Hoy', clearLabel: 'Borrar', closeLabel: 'Cerrar', requiredError: 'Este campo es obligatorio.' }"
/>`,
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Enter / Space',
        action: { en: 'On the field: open or close the calendar.', es: 'En el campo: abre o cierra el calendario.' },
      },
      { keys: 'ArrowDown', action: { en: 'On the field: open the calendar.', es: 'En el campo: abre el calendario.' } },
      { keys: 'ArrowLeft / ArrowRight', action: { en: 'Previous / next day.', es: 'Día anterior / siguiente.' } },
      {
        keys: 'ArrowUp / ArrowDown',
        action: { en: 'Same weekday in the previous / next week.', es: 'El mismo día de la semana anterior / siguiente.' },
      },
      { keys: 'Home / End', action: { en: 'First / last day of the week.', es: 'Primer / último día de la semana.' } },
      { keys: 'PageUp / PageDown', action: { en: 'Previous / next month.', es: 'Mes anterior / siguiente.' } },
      { keys: 'Shift + PageUp / PageDown', action: { en: 'Previous / next year.', es: 'Año anterior / siguiente.' } },
      { keys: 'Enter / Space', action: { en: 'In the grid: select the focused day.', es: 'En la cuadrícula: elige el día enfocado.' } },
      {
        keys: 'Tab / Shift + Tab',
        action: { en: 'Cycle through the controls inside the open calendar.', es: 'Recorre los controles dentro del calendario abierto.' },
      },
      {
        keys: 'Escape',
        action: { en: 'Close the calendar and return focus to the field.', es: 'Cierra el calendario y devuelve el foco al campo.' },
      },
    ],
    notes: [
      {
        en: 'The field is a read-only input with `aria-haspopup="dialog"` and `aria-expanded`. The calendar is `role="dialog"` with `aria-modal="true"`, and focus is trapped inside it while open.',
        es: 'El campo es un input de solo lectura con `aria-haspopup="dialog"` y `aria-expanded`. El calendario es `role="dialog"` con `aria-modal="true"`, y el foco queda atrapado dentro mientras está abierto.',
      },
      {
        en: 'The day grid is `role="grid"` with a roving tabindex: only the focused day is tabbable. Each day has a full-date `aria-label`, today has `aria-current="date"`, and selected days get `aria-selected`.',
        es: 'La cuadrícula de días es `role="grid"` con tabindex itinerante: solo el día enfocado es tabulable. Cada día tiene un `aria-label` con la fecha completa, hoy lleva `aria-current="date"` y los días elegidos llevan `aria-selected`.',
      },
      {
        en: 'The field `aria-label` is the `placeholder`, so write a meaningful one ("Appointment date"). Validation messages are linked with `aria-describedby` and announced with `role="alert"`.',
        es: 'El `aria-label` del campo es el `placeholder`, así que escribe uno con sentido ("Fecha de la cita"). Los mensajes de validación se enlazan con `aria-describedby` y se anuncian con `role="alert"`.',
      },
      {
        en: 'Translate the navigation aria-labels (`previousMonthAriaLabel`, `nextMonthAriaLabel` and the rest) through `labels` when your app is not in English.',
        es: 'Traduce los aria-labels de navegación (`previousMonthAriaLabel`, `nextMonthAriaLabel` y los demás) con `labels` cuando tu app no esté en inglés.',
      },
    ],
  },
  performance: [
    {
      en: 'The calendar panel is only rendered while open; a closed picker renders just the field and its icons.',
      es: 'El panel del calendario solo se dibuja mientras está abierto; un selector cerrado dibuja solo el campo y sus iconos.',
    },
    {
      en: 'Day cell ids are cached per month and the cache is cleared when the month changes, so ids stay stable while you navigate within a month.',
      es: 'Los ids de las celdas se guardan en caché por mes y la caché se limpia al cambiar de mes, así que los ids son estables mientras navegas dentro de un mes.',
    },
    {
      en: 'The keyboard listener on `document` is attached only while the calendar is open and removed on close and on destroy.',
      es: 'El listener de teclado en `document` solo se añade mientras el calendario está abierto y se quita al cerrar y al destruir el componente.',
    },
  ],
  related: [
    {
      id: 'timepicker',
      note: { en: 'Time of day only, with a list or clock face.', es: 'Solo la hora del día, con lista o esfera de reloj.' },
    },
    {
      id: 'forms',
      note: {
        en: '`date` and `datetime` fields render a date control for you inside a form config.',
        es: 'Los campos `date` y `datetime` dibujan un control de fecha por ti dentro de la configuración del formulario.',
      },
    },
    {
      id: 'input',
      note: {
        en: 'Masked text entry when typing is faster than picking.',
        es: 'Entrada de texto con máscara cuando escribir es más rápido que elegir.',
      },
    },
    {
      id: 'i18n',
      note: {
        en: 'How to translate built-in strings across components.',
        es: 'Cómo traducir los textos integrados en todos los componentes.',
      },
    },
  ],
};

export default content;
