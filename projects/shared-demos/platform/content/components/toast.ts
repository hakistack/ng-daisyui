import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'A toast is a short message that pops up in a corner ("Saved", "Upload failed") and goes away on its own after a few seconds. It does not block the page; the user can keep working.',
      es: 'Un toast es un mensaje corto que aparece en una esquina ("Guardado", "Falló la subida") y desaparece solo después de unos segundos. No bloquea la página; el usuario puede seguir trabajando.',
    },
    {
      en: 'You do not place any component in your templates. Inject `ToastService` and call `success()`, `error()`, `info()` or `warning()`. The first call creates the toast container and attaches it to the page for you.',
      es: 'No colocas ningún componente en tus plantillas. Inyecta `ToastService` y llama a `success()`, `error()`, `info()` o `warning()`. La primera llamada crea el contenedor de toasts y lo agrega a la página por ti.',
    },
  ],
  whenToUse: [
    {
      en: 'Confirming that something finished in the background: saved, copied, sent.',
      es: 'Confirmar que algo terminó en segundo plano: guardado, copiado, enviado.',
    },
    {
      en: 'Non-blocking errors with an optional quick fix, such as a Retry button (`actions`).',
      es: 'Errores que no bloquean, con una solución rápida opcional, como un botón Reintentar (`actions`).',
    },
    {
      en: "Connectivity changes: `networkStatus('offline')` and `networkStatus('online')`.",
      es: "Cambios de conexión: `networkStatus('offline')` y `networkStatus('online')`.",
    },
  ],
  whenNotToUse: [
    {
      en: 'The user must decide before continuing: use [Alert](/alert), whose `confirm()` returns a promise with the answer.',
      es: 'Si el usuario debe decidir antes de seguir: usa [Alert](/alert), cuyo `confirm()` devuelve una promesa con la respuesta.',
    },
    {
      en: 'Richer events that should stay until dismissed (avatar, several actions, updates in place): use [Notification](/notification).',
      es: 'Eventos más completos que deben quedarse hasta que se cierren (avatar, varias acciones, actualización en el mismo lugar): usa [Notification](/notification).',
    },
    {
      en: 'A form or your own component in a modal: use [Dialog](/dialog).',
      es: 'Un formulario o tu propio componente en un modal: usa [Dialog](/dialog).',
    },
    {
      en: 'Critical information the user must not miss: non-sticky toasts disappear after 5 seconds by default.',
      es: 'Información crítica que el usuario no puede perderse: los toasts no fijos desaparecen a los 5 segundos por defecto.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-save-actions',
  imports: [],
  template: \`
    <button type="button" class="btn btn-primary" (click)="save()">Save</button>
    <button type="button" class="btn btn-ghost" (click)="upload()">Upload</button>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveActionsComponent {
  private readonly toast = inject(ToastService);

  save(): void {
    this.toast.success('Saved', 'Your changes are stored.');
  }

  upload(): void {
    this.toast.error('Upload failed', 'The file is larger than 10 MB.', {
      sticky: true,
      actions: [{ label: 'Retry', style: 'primary', onClick: () => this.upload() }],
    });
  }
}
`,
    note: {
      en: 'No provider is required. Add `provideToast({...})` to your app config only to change the defaults (position, limit, duration…).',
      es: 'No hace falta ningún provider. Agrega `provideToast({...})` a la configuración de tu app solo para cambiar los valores por defecto (posición, límite, duración…).',
    },
  },
  technical: [
    {
      id: 'container',
      heading: { en: 'How the container appears', es: 'Cómo aparece el contenedor' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`ToastService` is a root singleton. On the first `show()` in the browser it creates `ToastComponent` with `createComponent()`, attaches its view to `ApplicationRef` and appends it to `document.body`. On the server `show()` does nothing and returns an empty string.',
            es: "`ToastService` es un singleton de raíz (`providedIn: 'root'`). En el primer `show()` dentro del navegador crea `ToastComponent` con `createComponent()`, conecta su vista a `ApplicationRef` y lo agrega a `document.body`. En el servidor `show()` no hace nada y devuelve una cadena vacía.",
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Every call returns the toast id: `dismiss(id)` closes one with its exit animation, `clear()` removes all at once. The list is exposed as the `toasts` signal (plus `hasToasts`).',
            es: 'Cada llamada devuelve el id del toast: `dismiss(id)` cierra uno con su animación de salida y `clear()` los quita todos de una vez. La lista se expone como el signal `toasts` (además de `hasToasts`).',
          },
        },
      ],
    },
    {
      id: 'stacking',
      heading: { en: 'Stacking, duplicates and timers', es: 'Apilado, duplicados y temporizadores' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Global option', es: 'Opción global' },
            { en: 'Default', es: 'Por defecto' },
            { en: 'Behavior', es: 'Comportamiento' },
          ],
          rows: [
            [
              { en: '`position`', es: '`position`' },
              { en: "`'bottom-end'`", es: "`'bottom-end'`" },
              { en: 'Applies to all toasts; there is no per-toast position.', es: 'Aplica a todos los toasts; no hay posición por toast.' },
            ],
            [
              { en: '`maxToasts`', es: '`maxToasts`' },
              { en: '`5`', es: '`5`' },
              {
                en: 'With `autoDismiss: true` the oldest is removed; with `false` the new toast is discarded. `0` means no limit.',
                es: 'Con `autoDismiss: true` se quita el más antiguo; con `false` se descarta el nuevo. `0` significa sin límite.',
              },
            ],
            [
              { en: '`preventDuplicates`', es: '`preventDuplicates`' },
              { en: '`true`', es: '`true`' },
              {
                en: 'If a visible toast has the same severity and summary, its id is returned instead of showing a second one.',
                es: 'Si ya hay un toast visible con la misma severidad y el mismo resumen, se devuelve su id en vez de mostrar un segundo.',
              },
            ],
            [
              { en: '`defaultLife`', es: '`defaultLife`' },
              { en: '`5000` ms', es: '`5000` ms' },
              {
                en: 'Overridden per toast with `life`; `sticky: true` never auto-dismisses.',
                es: 'Se cambia por toast con `life`; `sticky: true` nunca se cierra solo.',
              },
            ],
            [
              { en: '`pauseOnHover` / `extendedTimeOut`', es: '`pauseOnHover` / `extendedTimeOut`' },
              { en: '`true` / `1000` ms', es: '`true` / `1000` ms' },
              {
                en: 'Hover pauses the timer; after the pointer leaves, the timer resumes with the time that was left, but never less than `extendedTimeOut` (default 1000 ms). Hovering never shortens a toast.',
                es: 'Al pasar el puntero se pausa el temporizador; cuando el puntero sale, el temporizador sigue con el tiempo que quedaba, pero nunca menos que `extendedTimeOut` (por defecto 1000 ms). Pasar el puntero nunca acorta un toast.',
              },
            ],
            [
              { en: '`progressBar`, `tapToDismiss`, `exitDuration`', es: '`progressBar`, `tapToDismiss`, `exitDuration`' },
              { en: '`true`, `false`, `300` ms', es: '`true`, `false`, `300` ms' },
              {
                en: 'Countdown bar, click-anywhere-to-close, exit animation length.',
                es: 'Barra de cuenta regresiva, cerrar con clic en cualquier parte, duración de la animación de salida.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Action buttons dismiss the toast after their `onClick` unless `dismissOnClick: false`. `onTap` runs when the toast body is clicked. With `prefers-reduced-motion: reduce`, the progress bar is turned off and the exit animation takes 0 ms.',
            es: 'Los botones de acción cierran el toast después de su `onClick`, salvo con `dismissOnClick: false`. `onTap` se ejecuta al hacer clic en el cuerpo del toast. Con `prefers-reduced-motion: reduce`, la barra de progreso se desactiva y la animación de salida dura 0 ms.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `providers: [
  provideToast({
    position: 'top-end',
    maxToasts: 3,
    defaultLife: 4000,
    labels: { onlineMessage: 'Conexión restablecida', offlineMessage: 'Sin conexión' },
  }),
]`,
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab',
        action: { en: 'Reach the dismiss and action buttons of each toast', es: 'Llega a los botones de cerrar y de acción de cada toast' },
      },
      {
        keys: 'Enter',
        action: {
          en: 'On a focused clickable toast (`onTap` or `tapToDismiss`), trigger the tap',
          es: 'En un toast clicable que tiene el foco (`onTap` o `tapToDismiss`), equivale a hacer clic en él',
        },
      },
      { keys: 'Enter / Space', action: { en: 'Activate the focused button', es: 'Activa el botón enfocado' } },
    ],
    notes: [
      {
        en: 'Regular toasts use `role="alert"` with `aria-live="assertive"`; sticky toasts use `role="status"` with `aria-live="polite"`. Both are `aria-atomic`, and the accessible name is the `summary`, so put the essential message there.',
        es: 'Los toasts normales usan `role="alert"` con `aria-live="assertive"`; los fijos usan `role="status"` con `aria-live="polite"`. Ambos son `aria-atomic` y el nombre accesible es el `summary`, así que pon ahí el mensaje esencial.',
      },
      {
        en: 'The timer pauses on mouse hover only, not on keyboard focus. If a toast has actions, make it `sticky` or give it a long `life` so keyboard users have time to reach them.',
        es: 'El temporizador se pausa solo con el mouse, no con el foco del teclado. Si un toast tiene acciones, hazlo `sticky` o dale un `life` largo para que quien usa el teclado tenga tiempo de llegar a ellas.',
      },
      {
        en: 'The dismiss button is labelled "Dismiss notification" in English; there is no label override for it.',
        es: 'El botón de cerrar tiene la etiqueta "Dismiss notification" en inglés; no hay forma de cambiarla.',
      },
    ],
  },
  performance: [
    {
      en: 'One container serves the whole app and renders from a single signal array with OnPush change detection.',
      es: 'Un solo contenedor sirve a toda la app y se renderiza a partir de un único arreglo en un signal, con detección de cambios OnPush.',
    },
    {
      en: '`preventDuplicates` protects against bursts, for example an HTTP interceptor reporting the same error many times.',
      es: '`preventDuplicates` protege contra ráfagas, por ejemplo un interceptor HTTP que reporta el mismo error muchas veces.',
    },
    {
      en: 'Per-toast timers are cleared on dismiss, on `clear()` and when the service is destroyed.',
      es: 'Los temporizadores de cada toast se limpian al cerrarlo, con `clear()` y cuando se destruye el servicio.',
    },
  ],
  related: [
    {
      id: 'notification',
      note: {
        en: 'Persistent by default, with avatars, several actions and in-place updates.',
        es: 'Persistente por defecto, con avatares, varias acciones y actualización en el mismo lugar.',
      },
    },
    {
      id: 'alert',
      note: { en: "Blocking modal that waits for the user's answer.", es: 'Modal que bloquea y espera la respuesta del usuario.' },
    },
    { id: 'dialog', note: { en: 'Your own component in a modal.', es: 'Tu propio componente dentro de un modal.' } },
    {
      id: 'guide-notifications',
      note: { en: 'How to pick between the four feedback tools.', es: 'Cómo elegir entre las cuatro herramientas de aviso.' },
    },
  ],
};

export default content;
