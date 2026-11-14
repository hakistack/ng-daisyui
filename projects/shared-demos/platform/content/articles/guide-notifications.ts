import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: tell users what happened with the right amount of interruption, and configure it once for the whole app. The library has four feedback tools; they differ in how much they demand from the user.',
      es: 'Objetivo: decirle al usuario qué pasó con el nivel de interrupción adecuado, y configurarlo una sola vez para toda la app. La librería tiene cuatro herramientas de aviso; se diferencian en cuánto le exigen al usuario.',
    },
  ],
  sections: [
    {
      id: 'choose',
      heading: { en: '1. Pick the right one', es: '1. Elige la adecuada' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Tool', es: 'Herramienta' },
            { en: 'Use it when', es: 'Úsala cuando' },
            { en: 'Blocks the user?', es: '¿Bloquea al usuario?' },
          ],
          rows: [
            [
              { en: '[ToastService](/api/ToastService)', es: '[ToastService](/api/ToastService)' },
              {
                en: 'A short confirmation of something that already happened: “Saved”, “Copied”.',
                es: 'Una confirmación corta de algo que ya pasó: “Guardado”, “Copiado”.',
              },
              { en: 'No. Disappears by itself.', es: 'No. Desaparece solo.' },
            ],
            [
              { en: '[NotificationService](/api/NotificationService)', es: '[NotificationService](/api/NotificationService)' },
              {
                en: 'An event the user may want to act on later: a shared document, a finished export, an invitation. Supports avatars and action buttons.',
                es: 'Un evento sobre el que el usuario quizás quiera actuar luego: un documento compartido, una exportación terminada, una invitación. Admite avatares y botones de acción.',
              },
              { en: 'No. Stays until dismissed by default.', es: 'No. Por defecto se queda hasta que la cierren.' },
            ],
            [
              { en: '[AlertService](/api/AlertService)', es: '[AlertService](/api/AlertService)' },
              {
                en: 'A decision is needed now: confirm a delete, answer yes or no, or wait for a blocking operation.',
                es: 'Hace falta una decisión en ese momento: confirmar un borrado, responder sí o no, o esperar una operación que bloquea.',
              },
              { en: 'Yes. Modal; returns a `Promise`.', es: 'Sí. Modal; devuelve una promesa (`Promise`).' },
            ],
            [
              { en: '[DialogService](/api/DialogService)', es: '[DialogService](/api/DialogService)' },
              {
                en: 'The user needs a whole UI: a form, a detail view, a picker.',
                es: 'El usuario necesita una interfaz completa: un formulario, una vista de detalle, un selector.',
              },
              { en: 'Yes. Renders your component in a CDK dialog.', es: 'Sí. Renderiza tu componente en un diálogo del CDK.' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'If you would put an “OK” button on a toast, it is an alert. If the message must survive the user looking away, it is a notification.',
            es: 'Si le pondrías un botón “OK” a un toast, lo que necesitas es una alerta. Si el mensaje debe seguir ahí cuando el usuario mire a otro lado, es una notificación.',
          },
        },
      ],
    },
    {
      id: 'configure',
      heading: { en: '2. App-wide defaults', es: '2. Valores globales' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Each service works without configuration. Add a provider only to change its defaults.',
            es: 'Cada servicio funciona sin configuración. Añade un provider solo para cambiar sus valores por defecto.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAlert, provideNotification, provideToast } from '@hakistack/ng-daisyui';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideToast({ position: 'top-end', defaultLife: 4000, maxToasts: 3, preventDuplicates: true }),
    provideNotification({ position: 'top-right', maxStack: 5, pauseOnHover: true }),
    provideAlert({ labels: { confirm: 'Confirm', cancel: 'Cancel' } }),
  ],
};`,
        },
        {
          kind: 'p',
          text: {
            en: 'See [ToastGlobalConfig](/api/ToastGlobalConfig), [NotificationGlobalConfig](/api/NotificationGlobalConfig) and [AlertConfig](/api/AlertConfig) for every option.',
            es: 'Consulta [ToastGlobalConfig](/api/ToastGlobalConfig), [NotificationGlobalConfig](/api/NotificationGlobalConfig) y [AlertConfig](/api/AlertConfig) para ver todas las opciones.',
          },
        },
      ],
    },
    {
      id: 'hosts',
      heading: { en: '3. Mount the notification host once', es: '3. Monta el host de notificaciones una vez' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Toasts and alerts create their own container the first time they are used. Notifications render into [NotificationHostComponent](/api/NotificationHostComponent), which you place once in the app shell.',
            es: 'Los toasts y las alertas crean su propio contenedor la primera vez que se usan. Las notificaciones se renderizan en [NotificationHostComponent](/api/NotificationHostComponent), que colocas una vez en el shell de la app.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'app.html',
          code: `<router-outlet />
<hk-notification-host />`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Do not add `<hk-toast>` or an alert container to your templates; the services mount them, and a second copy duplicates every message.',
            es: 'No añadas `<hk-toast>` ni un contenedor de alertas a tus plantillas; los servicios los montan, y una segunda copia duplica cada mensaje.',
          },
        },
      ],
    },
    {
      id: 'use',
      heading: { en: '4. Use them from a component', es: '4. Úsalos desde un componente' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'documents.component.ts',
          code: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AlertService, DialogService, NotificationService, ToastService } from '@hakistack/ng-daisyui';
import { ShareDialogComponent } from './share-dialog.component';

@Component({
  selector: 'app-documents',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class DocumentsComponent {
  private readonly toast = inject(ToastService);
  private readonly notifications = inject(NotificationService);
  private readonly alert = inject(AlertService);
  private readonly dialog = inject(DialogService);

  save(): void {
    this.toast.success('Saved', 'Your changes are stored.');
  }

  async remove(name: string): Promise<void> {
    const result = await this.alert.confirmDelete({ itemName: name });
    if (!result.isConfirmed) return;
    // delete…
    this.toast.info('Deleted', name);
  }

  exportFinished(url: string): void {
    this.notifications.success({
      title: 'Export ready',
      message: 'Your CSV finished building.',
      actions: [{ label: 'Download', variant: 'primary', onClick: () => { window.open(url); return 'dismiss'; } }],
    });
  }

  share(documentId: string): void {
    this.dialog.open(ShareDialogComponent, { data: { documentId } });
  }
}`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: '`AlertService` methods resolve to an [AlertResult](/api/AlertResult) object, never to a boolean. Check `result.isConfirmed`; `if (!result)` is always false.',
            es: 'Los métodos de `AlertService` se resuelven con un objeto [AlertResult](/api/AlertResult), nunca a un booleano. Revisa `result.isConfirmed`; `if (!result)` siempre es falso.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Inside the dialog component, read the payload with `inject(DIALOG_DATA)` and close with `inject(DialogRef).close()`, both from `@angular/cdk/dialog`. `DialogService` closes every open dialog on navigation when the app has a router (`provideRouter`); the router is optional, and without it dialogs simply stay open.',
            es: 'Dentro del componente del diálogo, lee los datos con `inject(DIALOG_DATA)` y ciérralo con `inject(DialogRef).close()`, ambos de `@angular/cdk/dialog`. `DialogService` cierra todos los diálogos abiertos al navegar cuando la app tiene router (`provideRouter`); el router es opcional y, sin él, los diálogos simplemente siguen abiertos.',
          },
        },
      ],
    },
    {
      id: 'accessibility',
      heading: { en: '5. Accessibility notes', es: '5. Notas de accesibilidad' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Toasts are live regions: auto-dismissing ones are announced with `aria-live="assertive"`, sticky ones with `"polite"`. Keep the `summary` short.',
              es: 'Los toasts son regiones vivas: los que se cierran solos se anuncian con `aria-live="assertive"` y los fijos con `"polite"`. Mantén breve el `summary`.',
            },
            {
              en: 'Do not put the only path to an action in a toast that disappears. Use a notification, which stays until dismissed.',
              es: 'No pongas el único camino a una acción en un toast que desaparece. Usa una notificación, que se queda hasta que la cierren.',
            },
            {
              en: 'Alerts trap focus and restore it to the previous element when closed.',
              es: 'Las alertas atrapan el foco y lo devuelven al elemento anterior al cerrarse.',
            },
          ],
        },
      ],
    },
  ],
  related: [
    { id: 'toast', note: { en: 'Toast options and examples.', es: 'Opciones y ejemplos de toast.' } },
    { id: 'notification', note: { en: 'Layouts, avatars and actions.', es: 'Diseños, avatares y acciones.' } },
    { id: 'alert', note: { en: 'Confirm, question, countdown and loading.', es: 'Confirmar, preguntar, cuenta regresiva y carga.' } },
    { id: 'dialog', note: { en: 'Opening your own components in a dialog.', es: 'Abrir tus propios componentes en un diálogo.' } },
  ],
};

export default content;
