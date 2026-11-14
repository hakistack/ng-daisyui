import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: a user who closes the tab halfway through a long form (or a wizard) comes back and finds their answers where they left them. The library does this with two pieces: [FormStateService](/api/FormStateService), which stores and loads drafts, and the `autoSave` option of [createForm](/api/createForm), which saves while the user types and restores on load.',
      es: 'Objetivo: un usuario que cierra la pestaña a mitad de un formulario largo (o de un asistente) vuelve y encuentra sus respuestas donde las dejó. La librería lo hace con dos piezas: [FormStateService](/api/FormStateService), que guarda y carga borradores, y la opción `autoSave` de [createForm](/api/createForm), que guarda mientras el usuario escribe y restaura al cargar.',
    },
    {
      en: 'Drafts can live in the browser (`localStorage`) or in your backend (`api` mode). Nothing is stored until you call `provideFormState()`.',
      es: 'Los borradores pueden vivir en el navegador (`localStorage`) o en tu backend (modo `api`). No se guarda nada hasta que llamas a `provideFormState()`.',
    },
  ],
  sections: [
    {
      id: 'setup',
      heading: { en: 'Setup', es: 'Configuración' },
      blocks: [
        {
          kind: 'code',
          lang: 'ts',
          title: 'app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideFormState } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [
    // Browser storage. keyPrefix defaults to 'ngd-form-state-'.
    provideFormState({ mode: 'localStorage', keyPrefix: 'myapp-form-' }),

    // Or your backend (needs HttpClient):
    // provideHttpClient(),
    // provideFormState({ mode: 'api', apiUrl: '/api/forms' }),
  ],
};`,
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'Enable auto-save on a form',
          code: `readonly form = createForm({
  fields: [
    field.text('name', 'Full name', { required: true }),
    field.email('email', 'Email', { required: true }),
    field.textarea('notes', 'Notes'),
  ],
  autoSave: {
    enabled: true,
    formId: 'onboarding-v1', // stable and unique per form
    debounceMs: 1000,        // default 1000
    clearOnSubmit: true,     // default: cleared after a valid submit
  },
  onSubmit: (data) => this.api.save(data.values),
});`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: '`autoSave: true` alone does nothing: the form needs a `formId` to know where to store the draft. Use the object form.',
            es: '`autoSave: true` por sí solo no hace nada: el formulario necesita un `formId` para saber dónde guardar el borrador. Usa la forma de objeto.',
          },
        },
      ],
    },
    {
      id: 'lifecycle',
      heading: { en: 'What happens at runtime', es: 'Qué pasa en tiempo de ejecución' },
      blocks: [
        {
          kind: 'flow',
          steps: [
            {
              label: { en: 'Form mounts', es: 'Se monta el formulario' },
              detail: {
                en: '`load(formId)` reads the saved draft (errors become "no draft").',
                es: '`load(formId)` lee el borrador guardado (los errores se tratan como "sin borrador").',
              },
            },
            {
              label: { en: 'Restore', es: 'Restaurar' },
              detail: {
                en: 'Values are patched in; in a wizard, `currentStep` and `completedSteps` from the metadata are restored too. The `formRestored` output fires.',
                es: 'Se aplican los valores; en un asistente también se restauran `currentStep` y `completedSteps` desde los metadatos. Se emite el output `formRestored`.',
              },
            },
            {
              label: { en: 'User types', es: 'El usuario escribe' },
              detail: {
                en: 'After restoration finishes, each change queues a save, debounced by `debounceMs`.',
                es: 'Cuando termina la restauración, cada cambio pone en cola un guardado, con un debounce de `debounceMs`.',
              },
            },
            {
              label: { en: 'Valid submit', es: 'Envío válido' },
              detail: {
                en: 'The draft is cleared unless `clearOnSubmit` is `false`.',
                es: 'El borrador se borra salvo que `clearOnSubmit` sea `false`.',
              },
            },
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Saving waits for restoration to complete, so a freshly mounted empty form never overwrites a stored draft. The draft holds the form value, so disabled fields (including fields hidden by `showWhen` / `hideWhen`) are not saved, and `password` and `file` fields are always left out. Failed saves are swallowed: the form keeps working, but nothing tells the user the draft was not stored.',
            es: 'El guardado espera a que termine la restauración, así que un formulario recién montado y vacío nunca sobrescribe un borrador guardado. El borrador contiene el valor del formulario, así que los campos deshabilitados (incluidos los ocultos por `showWhen` / `hideWhen`) no se guardan, y los campos `password` y `file` siempre se excluyen. Los guardados fallidos se ignoran: el formulario sigue funcionando, pero nada le avisa al usuario que el borrador no se guardó.',
          },
        },
      ],
    },
    {
      id: 'modes',
      heading: { en: 'localStorage vs api', es: 'localStorage vs api' },
      blocks: [
        {
          kind: 'table',
          head: [
            { en: 'Aspect', es: 'Aspecto' },
            { en: 'localStorage', es: 'localStorage' },
            { en: 'api', es: 'api' },
          ],
          rows: [
            [
              { en: 'Where', es: 'Dónde' },
              { en: 'This browser only, key `keyPrefix + formId`', es: 'Solo este navegador, clave `keyPrefix + formId`' },
              { en: 'Your server, across devices', es: 'Tu servidor, entre dispositivos' },
            ],
            [
              { en: 'Requests', es: 'Peticiones' },
              { en: 'None', es: 'Ninguna' },
              {
                en: '`GET {apiUrl}/{formId}`, `PUT {apiUrl}` with the `FormState` body, `DELETE {apiUrl}/{formId}`',
                es: '`GET {apiUrl}/{formId}`, `PUT {apiUrl}` con el cuerpo `FormState`, `DELETE {apiUrl}/{formId}`',
              },
            ],
            [
              { en: 'Requirements', es: 'Requisitos' },
              { en: 'A browser (no-op on the server)', es: 'Un navegador (no hace nada en el servidor)' },
              {
                en: '`provideHttpClient()`; without `HttpClient` operations are skipped',
                es: '`provideHttpClient()`; sin `HttpClient` las operaciones se omiten',
              },
            ],
            [
              { en: 'Failure', es: 'Errores' },
              { en: 'Quota or parse errors are ignored', es: 'Se ignoran los errores de cuota o de análisis del JSON' },
              { en: 'A failed load returns `null`', es: 'Una carga fallida devuelve `null`' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'The saved payload is a [FormState](/api/FormState): `formId`, `values`, optional `metadata` and an ISO `updatedAt`. A form can override the global mode with `autoSave.storage`, but `provideFormState()` must still be present, and `api` mode always uses the global `apiUrl`.',
            es: 'El contenido guardado es un [FormState](/api/FormState): `formId`, `values`, `metadata` opcional y un `updatedAt` ISO. Un formulario puede cambiar el modo global con `autoSave.storage`, pero `provideFormState()` debe seguir presente, y el modo `api` siempre usa el `apiUrl` global.',
          },
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Drafts are stored as plain JSON. `password` and `file` fields are never saved, but every other field is, so do not auto-save forms with card numbers or other secrets in text fields to `localStorage`; use `api` mode with your own server-side protection instead.',
            es: 'Los borradores se guardan como JSON simple. Los campos `password` y `file` nunca se guardan, pero todos los demás sí, así que no autoguardes en `localStorage` formularios con números de tarjeta u otros secretos en campos de texto; usa el modo `api` con tu propia protección en el servidor.',
          },
        },
      ],
    },
    {
      id: 'service',
      heading: { en: 'Using the service directly', es: 'Usar el servicio directamente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: "`FormStateService` is `providedIn: 'root'` and returns observables, so you can manage drafts for your own forms. `isConfigured` and `mode` tell you whether a provider was registered.",
            es: "`FormStateService` es `providedIn: 'root'` y devuelve observables, así que puedes manejar borradores de tus propios formularios. `isConfigured` y `mode` indican si se registró un proveedor.",
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `private readonly drafts = inject(FormStateService);

discardDraft(): void {
  this.drafts.clear('onboarding-v1').subscribe();
}

hasDraft(): Observable<boolean> {
  return this.drafts.load('onboarding-v1').pipe(map((state) => state !== null));
}`,
        },
      ],
    },
  ],
  related: [
    { id: 'forms', note: { en: 'The dynamic form that consumes autoSave.', es: 'El formulario dinámico que usa autoSave.' } },
    {
      id: 'wizard',
      note: { en: 'Multi-step forms; the current step is restored too.', es: 'Formularios por pasos; también se restaura el paso actual.' },
    },
    { id: 'builders', note: { en: 'How createForm returns its controller.', es: 'Cómo createForm devuelve su controlador.' } },
  ],
};

export default content;
