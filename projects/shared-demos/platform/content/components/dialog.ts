import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: '`DialogService` opens one of your own Angular components inside a modal window. You pass the component and some data; when the user finishes, your component closes the dialog with a result, and the code that opened it receives that result.',
      es: '`DialogService` abre uno de tus propios componentes de Angular dentro de una ventana modal. Le pasas el componente y algunos datos; cuando el usuario termina, tu componente cierra el diálogo con un resultado, y el código que lo abrió recibe ese resultado.',
    },
    {
      en: 'It is a thin layer over the Angular CDK `Dialog`, so the backdrop, focus trap, Escape key and focus return work the CDK way. Inside your component, `inject(DIALOG_DATA)` reads the data and `inject(DialogRef)` gives you `close(result)`. Both come from `@angular/cdk/dialog`.',
      es: 'Es una capa delgada sobre el `Dialog` del CDK de Angular, así que el fondo, la trampa de foco, la tecla Escape y el regreso del foco funcionan como en el CDK. Dentro de tu componente, `inject(DIALOG_DATA)` lee los datos e `inject(DialogRef)` te da `close(result)`. Ambos vienen de `@angular/cdk/dialog`.',
    },
  ],
  whenToUse: [
    {
      en: 'Create or edit forms that should not take the user to another page.',
      es: 'Formularios de crear o editar que no deben llevar al usuario a otra página.',
    },
    {
      en: 'Pickers and detail views that hand a value back to the caller.',
      es: 'Selectores y vistas de detalle que le devuelven un valor a quien los abrió.',
    },
    {
      en: 'Any custom content where the fixed layout of an alert is not enough.',
      es: 'Cualquier contenido propio donde el diseño fijo de una alerta no alcanza.',
    },
  ],
  whenNotToUse: [
    {
      en: 'A plain confirmation or yes/no question: use [Alert](/alert) — one awaitable call, no extra component.',
      es: 'Una confirmación simple o una pregunta de sí/no: usa [Alert](/alert), una sola llamada con `await` y sin componente extra.',
    },
    {
      en: 'Feedback that should not block: use [Toast](/toast) or [Notification](/notification).',
      es: 'Avisos que no deben bloquear: usa [Toast](/toast) o [Notification](/notification).',
    },
    {
      en: 'Content that should survive navigation: dialogs opened with `open()` close on every router navigation.',
      es: 'Contenido que debe sobrevivir a la navegación: los diálogos abiertos con `open()` se cierran en cada navegación del router.',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DialogService } from '@hakistack/ng-daisyui';

interface RenameData {
  name: string;
}

@Component({
  selector: 'app-rename-dialog',
  imports: [],
  template: \`
    <div class="card bg-base-100 w-full">
      <div class="card-body">
        <h2 class="card-title">Rename project</h2>
        <input #nameInput class="input w-full" aria-label="New name" [value]="data.name" />
        <div class="card-actions justify-end">
          <button type="button" class="btn btn-ghost" (click)="ref.close()">Cancel</button>
          <button type="button" class="btn btn-primary" (click)="ref.close(nameInput.value)">Save</button>
        </div>
      </div>
    </div>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameDialogComponent {
  protected readonly data = inject<RenameData>(DIALOG_DATA);
  protected readonly ref = inject(DialogRef<string>);
}

@Component({
  selector: 'app-project-title',
  imports: [],
  template: \`
    <h1 class="text-xl">{{ name() }}</h1>
    <button type="button" class="btn btn-sm" (click)="rename()">Rename</button>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectTitleComponent {
  private readonly dialogs = inject(DialogService);
  readonly name = signal('Website redesign');

  rename(): void {
    const ref = this.dialogs.open<RenameDialogComponent, RenameData>(RenameDialogComponent, {
      data: { name: this.name() },
      ariaLabel: 'Rename project',
    });
    ref.closed.subscribe((value) => {
      // \`closed\` is typed with the wrapper component; cast to what your dialog passes to close().
      const result = value as unknown as string | undefined;
      if (result) this.name.set(result);
    });
  }
}
`,
    note: {
      en: "`DialogService` injects the Angular `Router`, so the app needs `provideRouter(...)`. The CDK overlay styles must be present; the library's stylesheet ships them.",
      es: '`DialogService` inyecta el `Router` de Angular, así que la app necesita `provideRouter(...)`. Deben estar los estilos de overlay del CDK; la hoja de estilos de la librería ya los incluye.',
    },
  },
  technical: [
    {
      id: 'open-vs-raw',
      heading: { en: 'open() vs openRaw()', es: 'open() vs openRaw()' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Method', es: 'Método' },
            { en: 'What it does', es: 'Qué hace' },
          ],
          rows: [
            [
              { en: '`open(component, options)`', es: '`open(component, options)`' },
              {
                en: "Opens `DialogWrapperComponent`, which attaches your component through a CDK portal with a child injector whose `DIALOG_DATA` is your `data`. Defaults: `width: '95vw'`, `maxWidth: '32rem'`, `minWidth: '24rem'`. Closed automatically on `NavigationStart`.",
                es: "Abre `DialogWrapperComponent`, que monta tu componente con un portal del CDK y un injector hijo cuyo `DIALOG_DATA` es tu `data`. Por defecto: `width: '95vw'`, `maxWidth: '32rem'`, `minWidth: '24rem'`. Se cierra solo en `NavigationStart`.",
              },
            ],
            [
              { en: '`openRaw(component, options)`', es: '`openRaw(component, options)`' },
              {
                en: 'Plain CDK `Dialog.open()` with `DIALOG_DATA` provided; no wrapper, no default sizes, not closed by the service on navigation. Returns `DialogRef` typed with your component.',
                es: '`Dialog.open()` del CDK tal cual, con `DIALOG_DATA` provisto; sin wrapper, sin tamaños por defecto y el servicio no lo cierra al navegar. Devuelve un `DialogRef` tipado con tu componente.',
              },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: "Both accept every CDK `DialogConfig` field except `providers`: `disableClose`, `ariaLabel`, `ariaLabelledBy`, `panelClass`, `hasBackdrop`, `autoFocus`, `restoreFocus`, sizes and more. CDK defaults apply: backdrop on, `disableClose: false`, `autoFocus: 'first-tabbable'`, `restoreFocus: true`.",
            es: "Ambos aceptan cualquier campo de `DialogConfig` del CDK menos `providers`: `disableClose`, `ariaLabel`, `ariaLabelledBy`, `panelClass`, `hasBackdrop`, `autoFocus`, `restoreFocus`, tamaños y más. Aplican los valores por defecto del CDK: fondo activo, `disableClose: false`, `autoFocus: 'first-tabbable'`, `restoreFocus: true`.",
          },
        },
      ],
    },
    {
      id: 'inner-component',
      heading: { en: 'Writing the inner component', es: 'Cómo escribir el componente interno' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Read data with `inject(DIALOG_DATA)`; it is `null` when you pass no `data`.',
              es: 'Lee los datos con `inject(DIALOG_DATA)`; es `null` si no pasas `data`.',
            },
            {
              en: "Close with `inject(DialogRef).close(result)`. Inside `open()` this is the wrapper's dialog ref, so the caller's `ref.closed` emits your result (or `undefined` on Escape or backdrop).",
              es: 'Cierra con `inject(DialogRef).close(result)`. Dentro de `open()` ese es el ref del wrapper, así que el `ref.closed` de quien abrió emite tu resultado (o `undefined` con Escape o clic en el fondo).',
            },
            {
              en: 'The wrapper adds no background or padding (only a container capped at `90vh`); render your own surface, for example a DaisyUI `card bg-base-100`.',
              es: 'El wrapper no añade fondo ni relleno (solo un contenedor limitado a `90vh`); dibuja tu propia superficie, por ejemplo una `card bg-base-100` de DaisyUI.',
            },
          ],
        },
        {
          kind: 'note',
          tone: 'info',
          text: {
            en: '`open()` returns `DialogRef<DialogWrapperComponent, unknown>`, so TypeScript types `closed` as the wrapper component. Cast the emitted value to the type your component passes to `close()`.',
            es: '`open()` devuelve `DialogRef<DialogWrapperComponent, unknown>`, así que TypeScript tipa `closed` como el componente wrapper. Convierte (cast) el valor emitido al tipo que tu componente pasa a `close()`.',
          },
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Escape',
        action: {
          en: 'Close the dialog with no result (unless `disableClose: true`)',
          es: 'Cierra el diálogo sin resultado (salvo con `disableClose: true`)',
        },
      },
      {
        keys: 'Tab / Shift+Tab',
        action: { en: 'Cycle focus inside the dialog (CDK focus trap)', es: 'Recorre el foco dentro del diálogo (trampa de foco del CDK)' },
      },
    ],
    notes: [
      {
        en: 'The CDK container gets `role="dialog"`, traps focus, moves focus to the first tabbable element on open and restores it on close. Content outside the dialog is hidden from assistive technology while it is open.',
        es: 'El contenedor del CDK recibe `role="dialog"`, atrapa el foco, lo mueve al primer elemento enfocable al abrir y lo devuelve al cerrar. El contenido fuera del diálogo queda oculto para las tecnologías de asistencia mientras está abierto.',
      },
      {
        en: 'Give every dialog a name: pass `ariaLabel`, or `ariaLabelledBy` with the id of your heading.',
        es: 'Ponle nombre a cada diálogo: pasa `ariaLabel`, o `ariaLabelledBy` con el id de tu título.',
      },
      {
        en: 'With `disableClose: true` the user can only leave through your buttons; always provide a visible Cancel button.',
        es: 'Con `disableClose: true` el usuario solo puede salir con tus botones; incluye siempre un botón visible de Cancelar.',
      },
      {
        en: "For destructive confirmations use `role: 'alertdialog'` in the config, or use [Alert](/alert).",
        es: "Para confirmaciones destructivas usa `role: 'alertdialog'` en el config, o usa [Alert](/alert).",
      },
    ],
  },
  performance: [
    {
      en: "Your component is only created while the dialog is open and destroyed when it closes; the portal is detached in the wrapper's `ngOnDestroy`.",
      es: 'Tu componente solo existe mientras el diálogo está abierto y se destruye al cerrarse; el portal se desconecta en el `ngOnDestroy` del wrapper.',
    },
    {
      en: 'The service tracks dialogs opened with `open()` and closes them all on `NavigationStart`, so stale dialogs do not pile up across routes.',
      es: 'El servicio lleva cuenta de los diálogos abiertos con `open()` y los cierra todos en `NavigationStart`, así no se acumulan diálogos viejos entre rutas.',
    },
  ],
  related: [
    {
      id: 'alert',
      note: {
        en: 'Ready-made confirm, question and loading modals with one awaitable call.',
        es: 'Modales listos de confirmación, pregunta y carga con una llamada que puedes esperar.',
      },
    },
    {
      id: 'forms',
      note: { en: 'Build the form you show inside the dialog.', es: 'Construye el formulario que muestras dentro del diálogo.' },
    },
    {
      id: 'toast',
      note: { en: 'Confirm the result after the dialog closes.', es: 'Confirma el resultado después de que el diálogo se cierre.' },
    },
    {
      id: 'guide-notifications',
      note: { en: 'How to pick between the four feedback tools.', es: 'Cómo elegir entre las cuatro herramientas de aviso.' },
    },
  ],
};

export default content;
