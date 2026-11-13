import type { ComponentDocContent } from '../../catalog/catalog.types';

const content: ComponentDocContent = {
  overview: [
    {
      en: 'A wizard splits a long form into smaller steps — "Account", "Personal info", "Review" — so people see a few questions at a time. A bar at the top shows where they are, and Previous / Next buttons move between steps.',
      es: 'Un asistente divide un formulario largo en pasos más pequeños —"Cuenta", "Datos personales", "Revisión"— para que la persona vea pocas preguntas a la vez. Una barra arriba muestra en qué paso va, y los botones Anterior / Siguiente mueven entre pasos.',
    },
    {
      en: 'The easiest way to build one is the [Dynamic Form](/forms): give `createForm()` a list of `steps` instead of `fields`, using `step.create()` for each step and `step.review()` for a final summary page. By default the wizard is linear: Next stays disabled until every field in the current step is valid. Under the hood it uses `hk-stepper`, which you can also use on its own to page through any content.',
      es: 'La forma más fácil de construirlo es con el [Formulario dinámico](/forms): pásale a `createForm()` una lista de `steps` en vez de `fields`, usando `step.create()` para cada paso y `step.review()` para una página final de resumen. Por defecto el asistente es lineal: Siguiente queda deshabilitado hasta que todos los campos del paso actual sean válidos. Por dentro usa `hk-stepper`, que también puedes usar por separado para paginar cualquier contenido.',
    },
  ],
  whenToUse: [
    {
      en: 'Sign-up, onboarding or checkout flows with more fields than fit comfortably on one screen.',
      es: 'Flujos de registro, bienvenida o pago con más campos de los que caben cómodamente en una pantalla.',
    },
    {
      en: 'Processes where later questions depend on earlier answers and the user should confirm everything on a review step.',
      es: 'Procesos donde las preguntas finales dependen de respuestas anteriores y la persona debe confirmar todo en un paso de revisión.',
    },
    {
      en: 'Non-form sequences (setup guides, tutorials) with `hk-stepper` and your own step content.',
      es: 'Secuencias que no son formularios (guías de configuración, tutoriales) con `hk-stepper` y tu propio contenido en cada paso.',
    },
  ],
  whenNotToUse: [
    {
      en: 'Short forms (a handful of fields): one page with the [Dynamic Form](/forms) is faster to fill.',
      es: 'Formularios cortos (unos pocos campos): una sola página con el [Formulario dinámico](/forms) se llena más rápido.',
    },
    {
      en: 'Sections the user should switch freely between, in any order, without a "finish" action: use [Tabs](/tabs).',
      es: 'Secciones entre las que la persona debe moverse libremente, en cualquier orden y sin una acción de "terminar": usa [Tabs](/tabs).',
    },
    {
      en: 'Showing where a page sits in the site hierarchy: use [Breadcrumbs](/breadcrumbs).',
      es: 'Mostrar dónde está una página dentro de la jerarquía del sitio: usa [Breadcrumbs](/breadcrumbs).',
    },
  ],
  quickStart: {
    ts: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DynamicFormComponent, createForm, field, step } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-wizard-quick-start',
  imports: [DynamicFormComponent],
  template: \`<hk-dynamic-form [config]="wizard.config()" />\`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardQuickStartComponent {
  readonly wizard = createForm({
    steps: [
      step.create('account', 'Account', [
        field.email('email', 'Email', { required: true }),
        field.password('password', 'Password', { required: true, minLength: 8 }),
      ]),
      step.create('profile', 'Profile', [
        field.text('name', 'Full name', { required: true }),
        field.select('plan', 'Plan', { choices: ['Free', 'Pro', 'Team'] }),
      ], { description: 'Tell us a bit about yourself' }),
      step.review('review', 'Review'),
    ],
    stepperConfig: { completeText: 'Create account' },
    onSubmit: ({ values, valid }) => {
      if (valid) console.log(values);
    },
  });
}`,
    note: {
      en: 'In wizard mode the stepper renders its own Previous, Next and complete buttons; the complete button on the last step submits the form. `form.submit()` and `form.reset()` still work from outside.',
      es: 'En modo asistente el stepper dibuja sus propios botones Anterior, Siguiente y de completar; el botón de completar del último paso envía el formulario. `form.submit()` y `form.reset()` siguen funcionando desde afuera.',
    },
  },
  technical: [
    {
      id: 'wizard-config',
      heading: { en: 'Wizard configuration', es: 'Configuración del asistente' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`step.create(name, label, fields, options?)` builds a `FormStep`; `options` takes `description`, `optional`, `nextText` and `previousText`. `step.review(name, label)` is a step with no fields: when `showStepSummary` is on, it lists every previous step with its labels and values (option labels, not raw values, for selects and radios).',
            es: '`step.create(name, label, fields, options?)` construye un `FormStep`; `options` acepta `description`, `optional`, `nextText` y `previousText`. `step.review(name, label)` es un paso sin campos: cuando `showStepSummary` está activo, lista cada paso anterior con sus etiquetas y valores (la etiqueta de la opción, no el valor crudo, en selects y radios).',
          },
        },
        {
          kind: 'table',
          head: [
            { en: '`stepperConfig` option', es: 'Opción de `stepperConfig`' },
            { en: 'Default with `createForm`', es: 'Por defecto con `createForm`' },
            { en: 'Effect', es: 'Efecto' },
          ],
          rows: [
            [
              { en: '`linear`', es: '`linear`' },
              { en: '`true`', es: '`true`' },
              {
                en: 'Next is disabled until the current step is valid; the step bar only allows going back.',
                es: 'Siguiente se deshabilita hasta que el paso actual sea válido; la barra de pasos solo permite volver atrás.',
              },
            ],
            [
              { en: '`showStepSummary`', es: '`showStepSummary`' },
              { en: '`true`', es: '`true`' },
              { en: 'Renders the summary on steps with no fields.', es: 'Muestra el resumen en los pasos sin campos.' },
            ],
            [
              { en: '`showStepIndicator`', es: '`showStepIndicator`' },
              { en: 'shown', es: 'visible' },
              { en: 'Shows the "Step 2 of 3" text between the buttons.', es: 'Muestra el texto "Step 2 of 3" entre los botones.' },
            ],
            [
              { en: '`previousText` / `nextText` / `completeText`', es: '`previousText` / `nextText` / `completeText`' },
              { en: 'From `provideDynamicFormLabels()`, else English', es: 'De `provideDynamicFormLabels()`, si no en inglés' },
              { en: 'Button text for this form.', es: 'Texto de los botones para este formulario.' },
            ],
          ],
        },
        {
          kind: 'p',
          text: {
            en: 'Conditions in wizard mode also receive step context in the values object: `__stepIndex`, `__stepName`, `__isFirstStep`, `__isLastStep` and `__completedSteps`. The form emits `stepChange` with `{ previousStep, currentStep, stepIndex, formValues }`, and `onSubmit` receives `completedSteps` and `currentStep`. With auto-save, the current step and completed steps are saved and restored too.',
            es: 'En modo asistente, las condiciones también reciben contexto del paso en el objeto de valores: `__stepIndex`, `__stepName`, `__isFirstStep`, `__isLastStep` y `__completedSteps`. El formulario emite `stepChange` con `{ previousStep, currentStep, stepIndex, formValues }`, y `onSubmit` recibe `completedSteps` y `currentStep`. Con autoguardado, el paso actual y los pasos completados también se guardan y se restauran.',
          },
        },
      ],
    },
    {
      id: 'stepper-component',
      heading: { en: 'hk-stepper on its own', es: 'hk-stepper por separado' },
      blocks: [
        {
          kind: 'p',
          text: {
            en: '`StepperComponent` extends the Angular CDK `CdkStepper` and provides itself as `CdkStepper`, so its children are plain `<cdk-step>` elements (import `CdkStepperModule` from `@angular/cdk/stepper`). It keeps CDK behavior such as `linear`, `stepControl` and `completed` per step, and adds the daisyUI `steps` bar, the navigation buttons and the step transition animation.',
            es: '`StepperComponent` extiende el `CdkStepper` del CDK de Angular y se provee a sí mismo como `CdkStepper`, así que sus hijos son elementos `<cdk-step>` normales (importa `CdkStepperModule` desde `@angular/cdk/stepper`). Conserva el comportamiento del CDK como `linear`, `stepControl` y `completed` por paso, y añade la barra `steps` de daisyUI, los botones de navegación y la animación entre pasos.',
          },
        },
        {
          kind: 'code',
          lang: 'html',
          title: 'Standalone stepper',
          code: `<hk-stepper [linear]="true" completeButtonText="Finish" (completed)="finish()">
  <cdk-step label="Install" [completed]="installed()">
    <p>Run the installer, then continue.</p>
  </cdk-step>
  <cdk-step label="Configure" [optional]="true">
    <p>Optional settings.</p>
  </cdk-step>
  <cdk-step label="Done">
    <p>All set.</p>
  </cdk-step>
</hk-stepper>`,
        },
        {
          kind: 'list',
          items: [
            {
              en: 'Inputs: `showStepIndicator`, `showCard` (wrap in a daisyUI card, default `true`), `animateContent`, `previousButtonText`, `nextButtonText`, `completeButtonText`, `optionalLabel`.',
              es: 'Inputs: `showStepIndicator`, `showCard` (envolver en una card de daisyUI, por defecto `true`), `animateContent`, `previousButtonText`, `nextButtonText`, `completeButtonText`, `optionalLabel`.',
            },
            {
              en: 'Outputs: `stepChange` with `{ previousIndex, currentIndex }` and `completed` when the last button is pressed.',
              es: 'Outputs: `stepChange` con `{ previousIndex, currentIndex }` y `completed` cuando se presiona el último botón.',
            },
            {
              en: 'Only the selected step content is rendered; the others stay as templates until visited.',
              es: 'Solo se dibuja el contenido del paso seleccionado; los demás se quedan como plantillas hasta visitarlos.',
            },
          ],
        },
      ],
    },
  ],
  accessibility: {
    keyboard: [
      {
        keys: 'Enter / Space',
        action: {
          en: 'On a step in the bar: go to that step, if navigation to it is allowed.',
          es: 'En un paso de la barra: ir a ese paso, si se permite navegar a él.',
        },
      },
      {
        keys: 'Tab',
        action: {
          en: 'Reachable steps in the bar are focusable; locked steps are skipped.',
          es: 'Los pasos alcanzables de la barra reciben foco; los bloqueados se saltan.',
        },
      },
    ],
    notes: [
      {
        en: 'The step bar is a `role="tablist"` with `role="tab"` items; the active step has `aria-selected` and `aria-current="step"`. Steps the user cannot reach yet get `tabindex="-1"`.',
        es: 'La barra de pasos es un `role="tablist"` con elementos `role="tab"`; el paso activo tiene `aria-selected` y `aria-current="step"`. Los pasos que todavía no se pueden alcanzar llevan `tabindex="-1"`.',
      },
      {
        en: 'Previous, Next and complete are real `<button type="button">` elements and are disabled (not hidden) when they cannot act, so screen readers still announce them.',
        es: 'Anterior, Siguiente y completar son elementos `<button type="button">` reales y se deshabilitan (no se ocultan) cuando no pueden actuar, así que los lectores de pantalla los siguen anunciando.',
      },
      {
        en: 'Focus is not moved to the new step content automatically. If your steps are long, consider giving each step a clear heading via `description`.',
        es: 'El foco no se mueve solo al contenido del nuevo paso. Si tus pasos son largos, considera darle a cada uno un encabezado claro con `description`.',
      },
      {
        en: 'The "Step X of Y" indicator text is in English; hide it with `showStepIndicator: false` if your app uses another language.',
        es: 'El texto indicador "Step X of Y" está en inglés; ocúltalo con `showStepIndicator: false` si tu app usa otro idioma.',
      },
    ],
  },
  performance: [
    {
      en: 'Only the active step is rendered, so a wizard with many steps costs about the same as its largest step.',
      es: 'Solo se dibuja el paso activo, así que un asistente con muchos pasos cuesta más o menos lo mismo que su paso más grande.',
    },
    {
      en: 'All steps share one `FormGroup`, so values typed in earlier steps are kept when the user goes back and forth.',
      es: 'Todos los pasos comparten un solo `FormGroup`, así que los valores escritos en pasos anteriores se conservan al ir y volver.',
    },
    {
      en: 'Both the stepper and the form use `OnPush`; step validity and the review summary are derived from the form state rather than stored separately.',
      es: 'Tanto el stepper como el formulario usan `OnPush`; la validez de cada paso y el resumen de revisión se derivan del estado del formulario en vez de guardarse por separado.',
    },
  ],
  related: [
    {
      id: 'forms',
      note: {
        en: 'The same builders on a single page, with all field types and layouts.',
        es: 'Los mismos builders en una sola página, con todos los tipos de campo y layouts.',
      },
    },
    {
      id: 'form-state',
      note: {
        en: 'Save wizard progress, including the current step, and restore it later.',
        es: 'Guarda el progreso del asistente, incluido el paso actual, y restáuralo después.',
      },
    },
    {
      id: 'tabs',
      note: {
        en: 'Free navigation between sections, with no order or completion.',
        es: 'Navegación libre entre secciones, sin orden ni finalización.',
      },
    },
  ],
};

export default content;
