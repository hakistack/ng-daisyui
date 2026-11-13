import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Alert dialogs are small modals that stop the user for a moment: to confirm a deletion, answer yes or no, read an important message or wait while something loads. They work in the style of SweetAlert.',
      es: 'Los diálogos de alerta son modales pequeños que detienen al usuario un momento: para confirmar un borrado, responder sí o no, leer un mensaje importante o esperar mientras algo carga. Funcionan al estilo de SweetAlert.',
    },
    {
      en: 'Inject `AlertService` and call one method; it returns a promise you can `await`. The result tells you what the user did, for example `isConfirmed`. No component goes in your templates: the service creates its container the first time you use it.',
      es: 'Inyecta `AlertService` y llama un método; devuelve una promesa que puedes esperar con `await`. El resultado te dice qué hizo el usuario, por ejemplo `isConfirmed`. No va ningún componente en tus templates: el servicio crea su contenedor la primera vez que lo usas.',
    },
  ],
  whenToUse: [
    {
      en: 'Confirming a destructive action: `confirmDelete()` uses a red button and puts focus on Cancel.',
      es: 'Confirmar una acción destructiva: `confirmDelete()` usa un botón rojo y pone el foco en Cancelar.',
    },
    {
      en: 'A simple yes/no question with `question()`, or a confirmation with custom texts with `confirm()`.',
      es: 'Una pregunta simple de sí/no con `question()`, o una confirmación con textos propios con `confirm()`.',
    },
    {
      en: 'Blocking the screen during a short operation: `showLoading()`, `updateLoading()`, `hideLoading()`.',
      es: 'Bloquear la pantalla durante una operación corta: `showLoading()`, `updateLoading()`, `hideLoading()`.',
    },
    {
      en: 'Timed warnings such as session expiry, with a live counter: `countdown()`.',
      es: 'Avisos con tiempo como el vencimiento de la sesión, con contador en vivo: `countdown()`.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Feedback that should not interrupt: use [Toast](/toast).',
      es: 'Avisos que no deben interrumpir: usa [Toast](/toast).',
    },
    {
      en: 'Your own form or component inside the modal: use [Dialog](/dialog).',
      es: 'Tu propio formulario o componente dentro del modal: usa [Dialog](/dialog).',
    },
    {
      en: 'Persistent events with several actions: use [Notification](/notification).',
      es: 'Eventos persistentes con varias acciones: usa [Notification](/notification).',
    },
    {
      en: 'Showing HTML written by users: `html` and `htmlUrl` content is not sanitized.',
      es: 'Mostrar HTML escrito por usuarios: el contenido de `html` y `htmlUrl` no se sanitiza.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertService } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-delete-project',
  imports: [],
  template: \`<button type="button" class="btn btn-error" (click)="remove()">Delete project</button>\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteProjectComponent {
  private readonly alert = inject(AlertService);

  async remove(): Promise<void> {
    const answer = await this.alert.confirmDelete({ itemName: 'Website redesign' });
    if (!answer.isConfirmed) return;

    this.alert.showLoading({ title: 'Deleting…' });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.alert.hideLoading();

    await this.alert.success('Deleted', 'The project was removed.');
  }
}
`,
    note: {
      en: 'No provider is required. Use `provideAlert({ labels })` or `provideAlert({ translate, langChange$ })` in your app config to translate the button texts.',
      es: 'No hace falta provider. Usa `provideAlert({ labels })` o `provideAlert({ translate, langChange$ })` en la configuración de tu app para traducir los textos de los botones.',
    },
  },
  technical: [
    {
      id: 'promise-model',
      heading: { en: 'One call, one promise', es: 'Una llamada, una promesa' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every method except the loading helpers resolves to an `AlertResult` with `isConfirmed`, `isDismissed`, `isCancelled` and, when dismissed, a `dismissReason` (`cancel`, `backdrop`, `close`, `esc` or `timer`). The promise resolves after a 150 ms exit animation.',
            es: 'Todos los métodos, salvo los de carga, resuelven con un `AlertResult` con `isConfirmed`, `isDismissed`, `isCancelled` y, si se descartó, un `dismissReason` (`cancel`, `backdrop`, `close`, `esc` o `timer`). La promesa se resuelve después de una animación de salida de 150 ms.',
          },
        },
        {
          kind: 'table',
          head: [
            { en: 'Method', es: 'Método' },
            { en: 'Built-in behavior', es: 'Comportamiento integrado' },
          ],
          rows: [
            [
              { en: '`show(options)`', es: '`show(options)`' },
              {
                en: 'OK button, backdrop click closes; optional cancel button, `timer`, `footer`, `size` (`sm`…`full`) or custom width/height.',
                es: 'Botón OK, clic en el fondo cierra; botón cancelar, `timer`, `footer`, `size` (`sm`…`full`) o ancho/alto propios opcionales.',
              },
            ],
            [
              { en: '`success` / `info` / `warning` / `error`', es: '`success` / `info` / `warning` / `error`' },
              {
                en: '`show()` with the matching icon; `error()` does not close on backdrop click.',
                es: '`show()` con el icono correspondiente; `error()` no se cierra con clic en el fondo.',
              },
            ],
            [
              { en: '`confirm(options)`', es: '`confirm(options)`' },
              {
                en: 'Warning icon, Confirm + Cancel, `confirmStyle` default `success`, backdrop click disabled.',
                es: 'Icono de advertencia, Confirmar + Cancelar, `confirmStyle` por defecto `success`, clic en el fondo desactivado.',
              },
            ],
            [
              { en: '`question(title, text?)`', es: '`question(title, text?)`' },
              { en: 'Yes / No with a question icon.', es: 'Sí / No con icono de pregunta.' },
            ],
            [
              { en: '`confirmDelete(options)`', es: '`confirmDelete(options)`' },
              {
                en: 'Error-styled Delete button, focus on Cancel, message built from `itemName`.',
                es: 'Botón Borrar en rojo, foco en Cancelar, mensaje armado con `itemName`.',
              },
            ],
            [
              { en: '`countdown(options)`', es: '`countdown(options)`' },
              {
                en: 'Required `timer`; `{seconds}` in `html` is replaced and the element matching `countdownSelector` (default `.countdown, kbd`) updates every second.',
                es: '`timer` obligatorio; `{seconds}` en `html` se reemplaza y el elemento que coincide con `countdownSelector` (por defecto `.countdown, kbd`) se actualiza cada segundo.',
              },
            ],
            [
              { en: '`showLoading` / `updateLoading` / `hideLoading`', es: '`showLoading` / `updateLoading` / `hideLoading`' },
              {
                en: 'Spinner without buttons; Escape and backdrop are disabled unless `allowClose: true`.',
                es: 'Spinner sin botones; Escape y el fondo están desactivados salvo con `allowClose: true`.',
              },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Only one alert is shown at a time. Opening a new one removes the current alert, and the promise of the removed alert never resolves. Always `await` an alert before opening the next. The loading overlay is tracked separately and must be closed with `hideLoading()`.',
            es: 'Solo se muestra una alerta a la vez. Abrir una nueva quita la actual, y la promesa de la que se quitó nunca se resuelve. Espera siempre (`await`) una alerta antes de abrir la siguiente. El overlay de carga se maneja aparte y hay que cerrarlo con `hideLoading()`.',
          },
        },
      ],
    },
    {
      id: 'html-content',
      heading: { en: 'HTML content and security', es: 'Contenido HTML y seguridad' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "`html` (and `countdown`'s `html`) is passed through `bypassSecurityTrustHtml`, so Angular does not sanitize it. `htmlUrl` is fetched with `fetch()` before the modal opens, with no caching, and goes through the same path; if the request fails the dialog shows the `contentLoadError` text. `footer` is bound with `[innerHTML]` and is sanitized by Angular.",
            es: '`html` (y el `html` de `countdown`) pasa por `bypassSecurityTrustHtml`, así que Angular no lo sanitiza. `htmlUrl` se descarga con `fetch()` antes de abrir el modal, sin caché, y sigue el mismo camino; si la petición falla, el diálogo muestra el texto de `contentLoadError`. `footer` se enlaza con `[innerHTML]` y Angular sí lo sanitiza.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Never put user-provided text into `html` or point `htmlUrl` at content you do not control: it would allow script injection. Use `text` for anything dynamic.',
            es: 'Nunca pongas texto que venga del usuario en `html` ni apuntes `htmlUrl` a contenido que no controlas: permitiría inyectar scripts. Usa `text` para todo lo dinámico.',
          },
        },
      ],
    },
    {
      id: 'i18n',
      heading: { en: 'Labels and translation', es: 'Etiquetas y traducción' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`provideAlert({ labels })` overrides the default English strings (`confirm`, `cancel`, `ok`, `yes`, `no`, `delete`, `deleteConfirmTitle`, `deleteConfirmText`, `deleteConfirmTextWithItem`, `loadingTitle`, `contentLoadError`). With a `translate(key, fallback, params)` function, keys such as `common.buttons.confirm` go through your i18n library first, and `labels` become the fallback. Button texts are cached; pass `langChange$` so the cache is cleared when the language changes. See [i18n](/foundations/i18n).',
            es: '`provideAlert({ labels })` reemplaza los textos en inglés (`confirm`, `cancel`, `ok`, `yes`, `no`, `delete`, `deleteConfirmTitle`, `deleteConfirmText`, `deleteConfirmTextWithItem`, `loadingTitle`, `contentLoadError`). Con una función `translate(key, fallback, params)`, claves como `common.buttons.confirm` pasan primero por tu librería de i18n y `labels` queda como respaldo. Los textos de los botones se guardan en caché; pasa `langChange$` para limpiarla cuando cambie el idioma. Ver [i18n](/foundations/i18n).',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `providers: [
  provideAlert({
    labels: {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      deleteConfirmTextWithItem: (name) => '¿Seguro que quieres eliminar "' + name + '"?',
    },
  }),
]`,
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Escape',
        action: {
          en: 'Dismiss with reason `esc` (not while loading unless `allowClose`)',
          es: 'Descarta con motivo `esc` (no durante la carga, salvo con `allowClose`)',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        action: { en: 'Cycle focus inside the modal (focus is trapped)', es: 'Recorre el foco dentro del modal (el foco queda atrapado)' },
      },
      { keys: 'Enter / Space', action: { en: 'Activate the focused button', es: 'Activa el botón enfocado' } },
    ],
    notes: [
      {
        en: 'The modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title and `aria-describedby` pointing to the body; it sets `aria-busy` while loading, and the spinner is a `status` labelled "Loading".',
        es: 'El modal tiene `role="dialog"`, `aria-modal="true"`, `aria-labelledby` que apunta al título y `aria-describedby` que apunta al cuerpo; usa `aria-busy` durante la carga, y el spinner es un `status` con la etiqueta "Loading".',
      },
      {
        en: 'Focus moves into the modal through `cdkTrapFocus` with auto-capture, goes to Cancel when `focusCancel` is set (default in `confirmDelete`), and returns to the previously focused element after closing.',
        es: 'El foco entra al modal mediante `cdkTrapFocus` con captura automática, va a Cancelar cuando `focusCancel` está activo (por defecto en `confirmDelete`) y regresa al elemento que tenía el foco al cerrar.',
      },
      {
        en: 'The close (X) and backdrop buttons are labelled "Close" in English. Icons are decorative colour cues, so state the meaning in the title.',
        es: 'Los botones de cerrar (X) y del fondo tienen la etiqueta "Close" en inglés. Los iconos son señales de color decorativas, así que di el significado en el título.',
      },
    ],
  },
  performance: [
    {
      en: 'The container is created once, on first use, and renders the open overlays from one signal.',
      es: 'El contenedor se crea una sola vez, en el primer uso, y dibuja los overlays abiertos desde una señal.',
    },
    {
      en: '`htmlUrl` triggers a network request on every call; cache the HTML yourself and pass it as `html` if you show the same content often.',
      es: '`htmlUrl` hace una petición de red en cada llamada; guarda tú el HTML y pásalo como `html` si muestras el mismo contenido seguido.',
    },
  ],
  related: [
    {
      id: 'dialog',
      note: {
        en: 'Host your own component in a modal and get a result back.',
        es: 'Muestra tu propio componente en un modal y recibe un resultado.',
      },
    },
    { id: 'toast', note: { en: 'Non-blocking, self-closing messages.', es: 'Mensajes que no bloquean y se cierran solos.' } },
    {
      id: 'notification',
      note: {
        en: 'Persistent panels with actions that do not block the page.',
        es: 'Paneles persistentes con acciones que no bloquean la página.',
      },
    },
    {
      id: 'guide-notifications',
      note: { en: 'How to pick between the four feedback tools.', es: 'Cómo elegir entre las cuatro herramientas de aviso.' },
    },
  ],
};

export default content;
