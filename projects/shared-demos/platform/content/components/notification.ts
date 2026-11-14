import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'Notifications are richer messages than toasts: a title, an optional message, an avatar or icon, and one or more buttons. By default they stay on screen until the user closes them, which suits events like "Leslie sent you a message" or "Build #2389 finished".',
      es: 'Las notificaciones son mensajes más completos que los toasts: un título, un mensaje opcional, un avatar o icono y uno o más botones. Por defecto se quedan en pantalla hasta que el usuario las cierra, lo que encaja con eventos como "Leslie te envió un mensaje" o "Terminó el build #2389".',
    },
    {
      en: 'Render `<hk-notification-host />` once in a layout that never goes away (usually the app root). Then inject `NotificationService` anywhere and call `show()`, `success()`, `info()`, `warning()` or `error()`. Each call returns a `NotificationRef` you can use to update the text later, close it, or react when it closes.',
      es: 'Coloca `<hk-notification-host />` una sola vez en un layout que nunca desaparezca (normalmente la raíz de la app). Luego inyecta `NotificationService` donde quieras y llama a `show()`, `success()`, `info()`, `warning()` o `error()`. Cada llamada devuelve un `NotificationRef` para actualizar el texto después, cerrarla o reaccionar cuando se cierre.',
    },
  ],
  whenToUse: [
    {
      en: 'Events coming from other people or systems that invite an action (Reply, View logs, Accept).',
      es: 'Eventos que vienen de otras personas o sistemas y que invitan a una acción (Responder, Ver logs, Aceptar).',
    },
    {
      en: 'Long operations whose message changes: show "Uploading…" and later `ref.update()` it to "Uploaded".',
      es: 'Operaciones largas cuyo mensaje cambia: muestra "Subiendo…" y luego cámbialo con `ref.update()` a "Subido".',
    },
    {
      en: 'Messages that must stay until the user acts; set `duration` only when you want them to close on their own.',
      es: 'Mensajes que deben quedarse hasta que el usuario actúe; usa `duration` solo cuando quieras que se cierren solos.',
    },
  ],
  whenNotToUse: [
    {
      en: 'A quick "Saved" confirmation: use [Toast](/toast), which closes by itself and needs no host component.',
      es: 'Una confirmación rápida de "Guardado": usa [Toast](/toast), que se cierra solo y no necesita componente host.',
    },
    {
      en: 'Blocking the flow until the user answers: use [Alert](/alert).',
      es: 'Para bloquear el flujo hasta que el usuario responda: usa [Alert](/alert).',
    },
    {
      en: 'Forms or complex content: use [Dialog](/dialog).',
      es: 'Formularios o contenido complejo: usa [Dialog](/dialog).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationHostComponent, NotificationService } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-root',
  imports: [NotificationHostComponent],
  template: \`
    <button type="button" class="btn" (click)="runBuild()">Run build</button>
    <hk-notification-host />
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly notifications = inject(NotificationService);

  runBuild(): void {
    const ref = this.notifications.info({
      title: 'Build #2389 started',
      message: 'We will let you know when it finishes.',
    });
    ref.onDismiss((reason) => console.log('Notification closed:', reason));

    setTimeout(() => {
      ref.update({
        title: 'Build #2389 finished',
        severity: 'success',
        duration: 5000,
        actions: [{ label: 'View logs', variant: 'primary', onClick: () => 'dismiss' }],
      });
    }, 2000);
  }
}
`,
    note: {
      en: '`<hk-notification-host />` must be rendered once, in a persistent layout; without it nothing appears. `provideNotification({...})` is optional and only changes the defaults (position, stack size, hover pause).',
      es: '`<hk-notification-host />` debe estar una sola vez, en un layout persistente; sin él no aparece nada. `provideNotification({...})` es opcional y solo cambia los valores por defecto (posición, tamaño de la pila, pausa al pasar el puntero).',
    },
  },
  technical: [
    {
      id: 'host-service',
      heading: { en: 'Service and host', es: 'Servicio y host' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`NotificationService` keeps a signal stack with the newest entry first, exposed read-only as `notifications` (plus `count`). The host iterates it and renders one internal item component per entry, inside a fixed full-screen layer that ignores pointer events except on the panels.',
            es: '`NotificationService` guarda la pila en un signal, con la entrada más reciente primero, y la expone en solo lectura como `notifications` (además de `count`). El host la recorre y renderiza un componente interno por entrada, dentro de una capa fija de pantalla completa que ignora los eventos del puntero salvo en los paneles.',
          },
        },
        {
          kind: 'p',
          text: {
            en: "The stack is anchored by the global `position` (default `'top-right'`); for bottom positions the column is reversed so the newest panel sits closest to the edge. The per-notification `position` field currently only changes the slide-in direction, not where the panel is placed.",
            es: "La pila se ancla con la `position` global (por defecto `'top-right'`); en posiciones inferiores la columna se invierte para que el panel más nuevo quede más cerca del borde. El campo `position` de cada notificación por ahora solo cambia la dirección de la animación de entrada, no dónde se coloca el panel.",
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `providers: [
  provideNotification({ position: 'bottom-right', maxStack: 4, pauseOnHover: true }),
  provideHkNotificationLabels({ closeAriaLabel: 'Cerrar notificación', regionAriaLabel: 'Notificaciones' }),
]`,
        },
      ],
    },
    {
      id: 'layouts',
      heading: { en: 'Layouts, visuals and actions', es: 'Diseños, apariencia y acciones' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Actions', es: 'Acciones' },
            { en: 'Inferred layout', es: 'Diseño inferido' },
          ],
          rows: [
            [
              { en: '0', es: '0' },
              { en: '`default` — content and close button', es: '`default` — contenido y botón de cerrar' },
            ],
            [
              { en: '1', es: '1' },
              { en: '`side-action` — divider and one button on the right', es: '`side-action` — divisor y un botón a la derecha' },
            ],
            [
              { en: '2 or more', es: '2 o más' },
              { en: '`stacked-action` — divider and stacked buttons', es: '`stacked-action` — divisor y botones apilados' },
            ],
          ],
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The layout is inferred when the notification is shown; `update()` keeps the current layout unless you pass `layout`.',
              es: 'El diseño se infiere al mostrar la notificación; `update()` conserva el diseño actual salvo que pases `layout`.',
            },
            {
              en: 'An explicit `layout` always wins. `avatar` (URL or `TemplateRef`) replaces the severity icon; `iconTemplate` overrides both.',
              es: 'Un `layout` explícito siempre gana. `avatar` (URL o `TemplateRef`) reemplaza el icono de severidad; `iconTemplate` tiene prioridad sobre ambos.',
            },
            {
              en: 'Severity panels use `alert-soft alert-{severity}` on daisyUI v5 and a neutral panel with a coloured icon on v4; avatar panels are neutral.',
              es: 'Los paneles por severidad usan `alert-soft alert-{severity}` en daisyUI v5 y un panel neutro con icono de color en v4; los paneles con avatar son neutros.',
            },
            {
              en: "An action's `onClick(ref)` does not close the panel by itself: return `'dismiss'` or call `ref.dismiss()`. This is the opposite of toast actions.",
              es: "El `onClick(ref)` de una acción no cierra el panel por sí solo: devuelve `'dismiss'` o llama a `ref.dismiss()`. Es lo contrario de las acciones del toast.",
            },
            {
              en: '`closable: false` hides the close button; `autoFocus: true` moves focus to the first action when the panel appears.',
              es: '`closable: false` oculta el botón de cerrar; `autoFocus: true` mueve el foco a la primera acción cuando aparece el panel.',
            },
          ],
        },
      ],
    },
    {
      id: 'lifecycle',
      heading: { en: 'Timers and dismiss reasons', es: 'Temporizadores y motivos de cierre' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Without `duration` (or with `0`) a notification is persistent. With a positive `duration` it closes itself; hovering pauses the timer and leaving resumes it with the remaining time. `update()` replaces fields and restarts the timer from the new `duration`.',
            es: 'Sin `duration` (o con `0`) una notificación es persistente. Con un `duration` positivo se cierra sola; al pasar el puntero se pausa el temporizador y, cuando el puntero sale, continúa con el tiempo restante. `update()` reemplaza campos y reinicia el temporizador con el nuevo `duration`.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Dismissal has two stages: the entry is flagged as exiting (exit animation, panel becomes `inert`), then removed 240 ms later, and only then do `onDismiss` callbacks run. The reason is one of `manual`, `action`, `auto`, `overflow` (pushed out by `maxStack`, default 5) or `all` (`dismissAll()`).',
            es: 'El cierre tiene dos etapas: la entrada se marca como en salida (animación de salida, el panel queda `inert`) y se quita 240 ms después; solo entonces se ejecutan los callbacks de `onDismiss`. El motivo es `manual`, `action`, `auto`, `overflow` (expulsada por `maxStack`, por defecto 5) o `all` (`dismissAll()`).',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Tab / Shift+Tab',
        action: {
          en: 'Move between the close button and the action buttons',
          es: 'Se mueve entre el botón de cerrar y los botones de acción',
        },
      },
      { keys: 'Enter / Space', action: { en: 'Activate the focused button', es: 'Activa el botón enfocado' } },
    ],
    notes: [
      {
        en: 'The host is a single `region` with `aria-live="polite"`, named by the `regionAriaLabel` label (default "Notifications", translatable with `provideHkNotificationLabels`). Panels have no `role="alert"` of their own and each item is `aria-atomic`, so a new notification is read once, after what the screen reader is currently saying, instead of being announced several times.',
        es: 'El host es una única `region` con `aria-live="polite"`, cuyo nombre viene de la etiqueta `regionAriaLabel` (por defecto "Notifications"; tradúcela con `provideHkNotificationLabels`). Los paneles no tienen `role="alert"` propio y cada elemento es `aria-atomic`, así que una notificación nueva se lee una sola vez, cuando el lector de pantalla termina lo que está diciendo, en lugar de anunciarse varias veces.',
      },
      {
        en: 'Severity is shown with icon and colour only. Make the title carry the meaning ("Upload failed"), not just the colour.',
        es: 'La severidad se muestra solo con icono y color. Haz que el título transmita el significado ("Falló la subida"), no solo el color.',
      },
      {
        en: 'The close button label comes from `closeAriaLabel` (translate it with `provideHkNotificationLabels`); action buttons use their `label` as accessible name.',
        es: 'La etiqueta del botón de cerrar viene de `closeAriaLabel` (tradúcela con `provideHkNotificationLabels`); los botones de acción usan su `label` como nombre accesible.',
      },
      {
        en: 'There is no Escape shortcut, and the timer pauses on mouse hover only. Give actionable notifications no `duration` so keyboard users can reach them. `autoFocus` is off by default to avoid stealing focus.',
        es: 'No hay atajo con Escape, y el temporizador se pausa solo con el mouse. No pongas `duration` a las notificaciones con acciones, para que quien usa el teclado pueda alcanzarlas. `autoFocus` está desactivado por defecto para no robar el foco.',
      },
    ],
  },
  performance: [
    {
      en: 'A single host renders the whole stack from one signal, tracked by id with OnPush change detection.',
      es: 'Un solo host renderiza toda la pila a partir de un signal, con seguimiento por id y detección de cambios OnPush.',
    },
    {
      en: 'Each panel owns its own timer, cleared when it closes or is destroyed. `maxStack` caps how many panels exist at once.',
      es: 'Cada panel tiene su propio temporizador, que se limpia al cerrarse o destruirse. `maxStack` limita cuántos paneles existen a la vez.',
    },
  ],
  related: [
    {
      id: 'toast',
      note: {
        en: 'Short, self-closing status messages with no host component.',
        es: 'Mensajes de estado cortos que se cierran solos, sin componente host.',
      },
    },
    { id: 'alert', note: { en: 'Blocking modal that waits for an answer.', es: 'Modal que bloquea y espera una respuesta.' } },
    { id: 'dialog', note: { en: 'Your own component in a modal.', es: 'Tu propio componente dentro de un modal.' } },
    {
      id: 'guide-notifications',
      note: { en: 'How to pick between the four feedback tools.', es: 'Cómo elegir entre las cuatro herramientas de aviso.' },
    },
  ],
};

export default content;
