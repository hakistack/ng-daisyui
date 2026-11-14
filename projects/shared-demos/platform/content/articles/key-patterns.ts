import type { ArticleContent } from '../../catalog/catalog.types';

const content: ArticleContent = {
  intro: [
    {
      en: 'Goal: know the handful of ideas that every component in the library shares, so a new component feels familiar the first time you open its page. You describe complex components in TypeScript, drive them through a controller, feed them signals, configure them app-wide with provider functions, and customize what they draw with templates.',
      es: 'Objetivo: conocer las pocas ideas que comparten todos los componentes de la librería, para que un componente nuevo se sienta conocido desde la primera vez que abras su página. Describes los componentes complejos en TypeScript, los manejas con un controlador, les pasas signals, los configuras para toda la app con funciones proveedoras y personalizas lo que dibujan con plantillas.',
    },
  ],
  sections: [
    {
      id: 'builders-controllers',
      heading: { en: 'Builders return controllers', es: 'Los builders devuelven controladores' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'A **builder** is a `create*()` function that takes a typed configuration object. Most return a **controller**: a `config` you bind in the template and methods you call from your class. The component draws; your code decides when to submit, reset, expand or open. No `@ViewChild`.',
            es: 'Un **builder** es una función `create*()` que recibe un objeto de configuración tipado. La mayoría devuelve un **controlador**: un `config` que enlazas en la plantilla y métodos que llamas desde tu clase. El componente dibuja; tu código decide cuándo enviar, restablecer, expandir o abrir. Sin `@ViewChild`.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'profile-form.component.ts',
          code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { createForm, DynamicFormComponent, field } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-profile-form',
  imports: [DynamicFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-dynamic-form [config]="form.config()" />
    <div class="mt-4 flex justify-end gap-2">
      <button type="button" class="btn btn-ghost" (click)="form.reset()">Reset</button>
      <button type="button" class="btn btn-primary" (click)="form.submit()">Save</button>
    </div>
  \`,
})
export class ProfileFormComponent {
  readonly form = createForm({
    fields: [
      field.text('name', 'Name', { required: true, minLength: 2 }),
      field.email('email', 'Email'),
      field.select('role', 'Role', { choices: ['Admin', 'User'] }),
    ],
    onSubmit: ({ valid, values }) => {
      if (valid) {
        console.log(values);
      }
    },
  });
}`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'The same shape repeats: [createTable](/api/createTable), [createDataGrid](/api/createDataGrid), [createTree](/api/createTree), [createMenu](/api/createMenu), [createCommandPalette](/api/createCommandPalette), [createPdfViewer](/api/createPdfViewer), [createDocumentEditor](/api/createDocumentEditor).',
              es: 'La misma forma se repite: [createTable](/api/createTable), [createDataGrid](/api/createDataGrid), [createTree](/api/createTree), [createMenu](/api/createMenu), [createCommandPalette](/api/createCommandPalette), [createPdfViewer](/api/createPdfViewer), [createDocumentEditor](/api/createDocumentEditor).',
            },
            {
              en: '**Create once**, in a field initializer or the constructor. Calling a builder inside a template method or a `computed()` creates a new controller every time.',
              es: '**Crea una sola vez**, en un inicializador de campo o en el constructor. Llamar un builder dentro de un método de plantilla o de un `computed()` crea un controlador nuevo cada vez.',
            },
            {
              en: '`createTable()` calls `inject()` internally, so it needs an injection context. A field initializer is one; `computed()` and `effect()` are not.',
              es: '`createTable()` llama `inject()` internamente, así que necesita un contexto de inyección. Un inicializador de campo lo es; `computed()` y `effect()` no.',
            },
            {
              en: 'Not every builder binds the same way (`config()`, the object itself, or the whole controller). [Builders and controllers](/systems/builders) has the full table.',
              es: 'No todos los builders se enlazan igual (`config()`, el objeto tal cual o el controlador completo). [Builders y controladores](/systems/builders) tiene la tabla completa.',
            },
          ],
        },
      ],
    },
    {
      id: 'signals-onpush',
      heading: { en: 'Signals in, OnPush everywhere', es: 'Signals de entrada, OnPush en todas partes' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Every component uses `OnPush` change detection and signal inputs. It redraws when an input receives a **new value or a new reference**. Keep your data in signals, derive views with `computed()`, and replace arrays instead of mutating them.',
            es: 'Todos los componentes usan detección de cambios `OnPush` e inputs basados en signals. Se vuelven a dibujar cuando un input recibe un **valor nuevo o una referencia nueva**. Guarda tus datos en signals, deriva vistas con `computed()` y reemplaza los arreglos en lugar de mutarlos.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'task-list.component.ts',
          code: `import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { createTable, TableComponent } from '@hakistack/ng-daisyui';

interface Task {
  id: number;
  title: string;
  done: boolean;
}

@Component({
  selector: 'app-task-list',
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <label class="label cursor-pointer gap-2">
      <input type="checkbox" class="toggle" [checked]="hideDone()" (change)="hideDone.set(!hideDone())" />
      Hide finished tasks
    </label>
    <hk-table [data]="visibleTasks()" [config]="table" />
    <button type="button" class="btn btn-sm mt-2" (click)="add()">Add task</button>
  \`,
})
export class TaskListComponent {
  readonly tasks = signal<Task[]>([{ id: 1, title: 'Write docs', done: false }]);
  readonly hideDone = signal(false);

  // Derived state: recomputed only when tasks or hideDone change.
  readonly visibleTasks = computed(() => (this.hideDone() ? this.tasks().filter((t) => !t.done) : this.tasks()));

  readonly table = createTable<Task>({
    columns: {
      title: { header: 'Task' },
      done: { header: 'Done', format: (value) => (value ? 'Yes' : 'No') },
    },
  });

  add(): void {
    const id = this.tasks().length + 1;
    // A new array reference, so the table sees the change.
    this.tasks.update((rows) => [...rows, { id, title: \`Task \${id}\`, done: false }]);
  }
}`,
        },
        {
          kind: 'note',
          tone: 'warning',
          text: {
            en: 'Do not bind a template method that builds a new object, array or `Date` on every call (for example `[config]="buildConfig()"`). Each check sees a new reference and Angular can end in `NG0103`. Move it to a `computed()` or a field.',
            es: 'No enlaces un método de plantilla que cree un objeto, arreglo o `Date` nuevo en cada llamada (por ejemplo `[config]="buildConfig()"`). Cada verificación ve una referencia nueva y Angular puede terminar en `NG0103`. Pásalo a un `computed()` o a un campo.',
          },
        },
      ],
    },
    {
      id: 'providers',
      heading: { en: 'App-wide configuration with provider functions', es: 'Configuración global con funciones proveedoras' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'There are no `NgModule`s and no `forRoot()`. App-wide defaults go in `app.config.ts` through `provide*()` functions, and only for the features you use. Built-in text is replaced the same way, with `provide*Labels()`. Every labels object is partial: keys you leave out keep their English default.',
            es: 'No hay `NgModule`s ni `forRoot()`. Los valores globales van en `app.config.ts` mediante funciones `provide*()`, y solo para las funciones que uses. Los textos integrados se reemplazan igual, con `provide*Labels()`. Todo objeto de labels es parcial: las claves que omitas conservan su valor por defecto en inglés.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'src/app/app.config.ts',
          code: `import { ApplicationConfig } from '@angular/core';
import { provideDynamicFormLabels, provideNotification, providePipes, provideToast } from '@hakistack/ng-daisyui';

export const appConfig: ApplicationConfig = {
  providers: [
    providePipes(),
    provideToast({ position: 'bottom-end', maxToasts: 3 }),
    provideNotification({ position: 'top-right', maxStack: 5 }),
    provideDynamicFormLabels({
      previousButton: 'Anterior',
      nextButton: 'Siguiente',
      completeButton: 'Enviar',
    }),
  ],
};`,
        },
        {
          kind: 'p',
          text: {
            en: 'Which providers are required and which are optional is listed in [Installation](/installation). Every label provider is in [Internationalization](/foundations/i18n).',
            es: 'Qué proveedores son obligatorios y cuáles opcionales está en [Instalación](/installation). Todos los proveedores de labels están en [Internacionalización](/foundations/i18n).',
          },
        },
      ],
    },
    {
      id: 'plain-objects',
      heading: { en: 'Plain objects for simple configuration', es: 'Objetos simples para configuraciones sencillas' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'Small, static configuration is written as plain object literals. Menu items are the clearest case: `{ label, routerLink, icon }` is all an entry needs. Helper factories such as [item](/api/item) exist, but they are optional shorthand, not the default.',
            es: 'Las configuraciones pequeñas y estáticas se escriben como objetos literales simples. Los ítems de menú son el caso más claro: `{ label, routerLink, icon }` es todo lo que necesita una entrada. Existen helpers como [item](/api/item), pero son un atajo opcional, no la forma por defecto.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'sidebar.component.ts',
          code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MenuComponent, MenuItem } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-sidebar',
  imports: [MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<hk-menu [items]="items" />\`,
})
export class SidebarComponent {
  readonly items: MenuItem[] = [
    { label: 'Dashboard', routerLink: '/dashboard', icon: 'house' },
    { label: 'Reports', routerLink: '/reports', icon: 'file-text' },
    {
      label: 'Settings',
      icon: 'settings',
      children: [{ label: 'Account', routerLink: '/settings/account' }],
    },
  ];
}`,
        },
        {
          kind: 'p',
          text: {
            en: 'Use `createMenu()` only when your code needs to drive the menu (expand a group, collapse to a rail). Icons given by name must be registered with `provideLucideIcons(...)`, and `routerLink` needs `provideRouter(...)`.',
            es: 'Usa `createMenu()` solo cuando tu código necesite manejar el menú (expandir un grupo, plegarlo a un riel). Los iconos que pasas por nombre deben registrarse con `provideLucideIcons(...)`, y `routerLink` necesita `provideRouter(...)`.',
          },
        },
        {
          kind: 'p',
          text: {
            en: 'Forms work the same way. Besides the `field.*()` builders, [createForm](/api/createForm) accepts a `fields` object where each key is the field name and each value is a plain definition. The value types are inferred from it, and `onSubmit` receives the typed values directly, only when the form is valid.',
            es: 'Los formularios funcionan igual. Además de los builders `field.*()`, [createForm](/api/createForm) acepta un objeto `fields` donde cada clave es el nombre del campo y cada valor una definición simple. Los tipos de los valores se infieren de ahí, y `onSubmit` recibe los valores tipados directamente, solo cuando el formulario es válido.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          code: `readonly form = createForm({
  fields: {
    name: { type: 'text', label: 'Name', validation: { required: true } },
    email: { type: 'email', label: 'Email' },
  },
  onSubmit: (values) => console.log(values.name),
});`,
        },
        {
          kind: 'p',
          text: {
            en: 'This object form is also how you build a form from data loaded at runtime. See [Dynamic forms from schemas](/guides/schema-forms).',
            es: 'Esta forma de objeto también es la manera de construir un formulario con datos cargados en tiempo de ejecución. Mira [Formularios dinámicos desde esquemas](/guides/schema-forms).',
          },
        },
      ],
    },
    {
      id: 'content-templates',
      heading: { en: 'Templates for custom content', es: 'Plantillas para contenido propio' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: 'When a value needs more than text (a link, a badge, a button), you do not fork the component. You project an `<ng-template>` marked with the library directive for that slot, and the component renders it in place, passing the row or value as template context.',
            es: 'Cuando un valor necesita más que texto (un enlace, un badge, un botón), no tienes que copiar el componente. Proyectas un `<ng-template>` marcado con la directiva de la librería para ese espacio, y el componente lo dibuja en su lugar, pasando la fila o el valor como contexto de la plantilla.',
          },
        },
        {
          kind: 'code',
          lang: 'ts',
          title: 'users-table.component.ts',
          code: `import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { createTable, HkCellTemplateDirective, TableComponent } from '@hakistack/ng-daisyui';

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-users-table',
  imports: [TableComponent, HkCellTemplateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <hk-table [data]="users()" [config]="table">
      <ng-template hkCellTemplate="email" let-row>
        <a class="link link-primary" [href]="'mailto:' + row.email">{{ row.email }}</a>
      </ng-template>
    </hk-table>
  \`,
})
export class UsersTableComponent {
  readonly users = signal<User[]>([{ id: 1, name: 'Ana Rivera', email: 'ana@example.com' }]);

  readonly table = createTable<User>({
    columns: {
      name: { header: 'Name' },
      email: { header: 'Email' },
    },
  });
}`,
        },
        {
          kind: 'table',
          head: [
            { en: 'Directive', es: 'Directiva' },
            { en: 'Slot', es: 'Espacio' },
          ],
          rows: [
            [
              {
                en: '[HkCellTemplateDirective](/api/HkCellTemplateDirective) (`hkCellTemplate`)',
                es: '[HkCellTemplateDirective](/api/HkCellTemplateDirective) (`hkCellTemplate`)',
              },
              { en: 'A cell of one `hk-table` column', es: 'Una celda de una columna de `hk-table`' },
            ],
            [
              {
                en: '[HkFooterDirective](/api/HkFooterDirective) (`hkFooter`)',
                es: '[HkFooterDirective](/api/HkFooterDirective) (`hkFooter`)',
              },
              { en: 'A custom `hk-table` footer row', es: 'Una fila de pie propia de `hk-table`' },
            ],
            [
              {
                en: '[HkDataGridCellDirective](/api/HkDataGridCellDirective) (`hkDataGridCell`)',
                es: '[HkDataGridCellDirective](/api/HkDataGridCellDirective) (`hkDataGridCell`)',
              },
              { en: 'A cell of one `hk-datagrid` column', es: 'Una celda de una columna de `hk-datagrid`' },
            ],
            [
              {
                en: '[HkPdfToolbarDirective](/api/HkPdfToolbarDirective) (`hkPdfToolbar`)',
                es: '[HkPdfToolbarDirective](/api/HkPdfToolbarDirective) (`hkPdfToolbar`)',
              },
              { en: 'Replaces the `hk-pdf-viewer` toolbar', es: 'Reemplaza la barra de herramientas de `hk-pdf-viewer`' },
            ],
          ],
        },
        {
          kind: 'note',
          tone: 'tip',
          text: {
            en: 'Add the directive to your component’s `imports`, next to the component. Templates are one of several extension points; the rest (renderers, editors, formatters, WASM URLs) are in [Extend components](/guides/extend-components).',
            es: 'Añade la directiva a los `imports` de tu componente, junto al componente. Las plantillas son uno de varios puntos de extensión; los demás (renderizadores, editores, formateadores, URLs de WASM) están en [Extiende los componentes](/guides/extend-components).',
          },
        },
      ],
    },
    {
      id: 'imports',
      heading: { en: 'Standalone imports from the package root', es: 'Imports standalone desde la raíz del paquete' },
      blocks: [
        {
          kind: 'list',
          items: [
            {
              en: 'Every component and directive is standalone. List exactly what a component uses in its `imports` array; nothing is registered globally.',
              es: 'Cada componente y directiva es standalone. Lista exactamente lo que usa un componente en su arreglo `imports`; nada se registra de forma global.',
            },
            {
              en: 'Import from `@hakistack/ng-daisyui` only. Paths inside the package are not public and can change in any release.',
              es: 'Importa solo desde `@hakistack/ng-daisyui`. Las rutas internas del paquete no son públicas y pueden cambiar en cualquier versión.',
            },
            {
              en: 'Heavy features (editor, document formats, WASM engines) load their code on first use, so importing a component does not pull everything into your initial bundle. See [Optimize bundle size](/guides/bundle-size).',
              es: 'Las funciones pesadas (editor, formatos de documento, motores WASM) cargan su código la primera vez que se usan, así que importar un componente no mete todo en tu bundle inicial. Mira [Optimiza el tamaño del bundle](/guides/bundle-size).',
            },
          ],
        },
      ],
    },
  ],
  related: [
    {
      id: 'builders',
      note: { en: 'Every builder, what it returns and how it binds.', es: 'Cada builder, qué devuelve y cómo se enlaza.' },
    },
    {
      id: 'guide-build-a-form',
      note: { en: 'The patterns applied to a full form.', es: 'Los patrones aplicados a un formulario completo.' },
    },
    { id: 'i18n', note: { en: 'All label providers.', es: 'Todos los proveedores de labels.' } },
    { id: 'guide-extend-components', note: { en: 'Every supported extension point.', es: 'Todos los puntos de extensión soportados.' } },
  ],
};

export default content;
