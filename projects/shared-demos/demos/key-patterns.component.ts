import { Component } from '@angular/core';
import { LucideIconComponent } from '@hakistack/ng-daisyui';
import { CodeBlockComponent } from '../shared/code-block.component';

@Component({
  selector: 'app-key-patterns',
  imports: [LucideIconComponent, CodeBlockComponent],
  template: `
    <div class="space-y-14 max-w-4xl">
      <!-- Hero -->
      <div class="space-y-2">
        <h1 class="text-3xl lg:text-4xl font-serif tracking-tight">Key Patterns</h1>
        <p class="text-base-content/50 text-sm leading-relaxed max-w-2xl">
          Understand the design decisions behind ng-daisyui -- the why, not just the how. Each pattern exists to solve a real problem.
        </p>
      </div>

      <!-- TOC -->
      <div class="card bg-base-200 card-sm">
        <div class="card-body">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-base-content/40 mb-2">On this page</h3>
          <ul class="space-y-1">
            @for (section of toc; track section.id) {
              <li>
                <a class="link link-hover text-sm flex items-center gap-2 cursor-pointer" (click)="scrollTo(section.id)">
                  <hk-lucide-icon [name]="section.icon" [size]="14" class="text-primary" />
                  {{ section.label }}
                </a>
              </li>
            }
          </ul>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 1. Builder Functions -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="builders" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="Hammer" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Builder Functions</h2>
            <p class="text-sm text-base-content/50 mt-1">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">createForm()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">field.*()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">step()</code>
            </p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm text-error">
              <hk-lucide-icon name="X" [size]="16" />
              The problem
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Most form libraries make you write large config objects by hand. You have to remember property names, nest validators
              correctly, and hope you didn't typo a field type. No autocomplete, no compile-time safety.
            </p>
            <app-code-block [code]="builderProblemCode" />
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm text-success">
              <hk-lucide-icon name="Check" [size]="16" />
              The ng-daisyui way
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Each <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">field.*()</code> function only accepts options relevant to that
              type. TypeScript catches mistakes at compile time. Autocomplete guides you through every option.
            </p>
            <app-code-block [code]="builderSolutionCode" />
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">Why not just use Reactive Forms directly?</div>
          <div class="collapse-content text-sm text-base-content/60 leading-relaxed space-y-2">
            <p>You can. Reactive Forms are powerful, and ng-daisyui doesn't replace them -- it generates them. The builder adds:</p>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li><strong>Declarative layout</strong> -- field order, grid spans, grouping in one config</li>
              <li><strong>Conditional logic</strong> -- showWhen, hideWhen, requiredWhen without manual subscriptions</li>
              <li><strong>Auto UI</strong> -- labels, validation messages, and accessibility attributes</li>
              <li>
                <strong>Wizard support</strong> -- split fields into steps with
                <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">step.create()</code>
              </li>
            </ul>
            <p>Need raw FormGroup access? The controller exposes it. The builder doesn't lock you in.</p>
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">Available field types</div>
          <div class="collapse-content">
            <div class="flex flex-wrap gap-2 pt-1">
              @for (ft of fieldTypes; track ft) {
                <span class="badge badge-soft badge-sm font-mono">field.{{ ft }}()</span>
              }
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 2. FormController -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="form-controller" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="ToggleRight" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">FormController Pattern</h2>
            <p class="text-sm text-base-content/50 mt-1">Forms render fields. You own the buttons.</p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm text-error">
              <hk-lucide-icon name="X" [size]="16" />
              The problem with embedded buttons
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              When a form component owns its submit button, you lose flexibility. What if the button belongs in a dialog footer? A sticky
              toolbar? Two forms sharing one submit? You end up fighting the component with inputs like
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">submitLabel</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">buttonPosition</code> -- a growing API that never covers every layout.
            </p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm text-success">
              <hk-lucide-icon name="Check" [size]="16" />
              The ng-daisyui way
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">createForm()</code> returns a controller with
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">submit()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">reset()</code>, and
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">config()</code>. The form only renders fields. Buttons go wherever
              your layout needs them.
            </p>
            <app-code-block [code]="formControllerCode" />
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="LayoutList" [size]="16" />
              Layouts this enables
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              @for (ex of controllerExamples; track ex.title) {
                <div class="bg-base-200 rounded-box p-4 space-y-2">
                  <div class="flex items-center gap-2">
                    <hk-lucide-icon [name]="ex.icon" [size]="14" class="text-primary" />
                    <span class="text-xs font-semibold">{{ ex.title }}</span>
                  </div>
                  <p class="text-xs text-base-content/45 leading-relaxed">{{ ex.desc }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 3. Table Builder -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="table-builder" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="Table" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Table Builder</h2>
            <p class="text-sm text-base-content/50 mt-1">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">createTable()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">fmt.*()</code>, aggregates, pagination, filtering
            </p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Code" [size]="16" />
              Why a builder instead of a template?
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Template-based tables (ng-template columns, structural directives) become unreadable fast. Every column needs a header
              template, a cell template, and possibly a footer. For a 10-column table, that's 30+ template blocks before you even add
              sorting or filtering.
            </p>
            <p class="text-sm text-base-content/60 leading-relaxed">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">createTable()</code> defines everything in one config -- columns,
              formatters, sorting, actions, footers. The component handles rendering.
            </p>
            <app-code-block [code]="tableBuilderCode" />
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Columns3" [size]="16" />
              Type-safe formatters with fmt.*()
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Instead of referencing pipes by string name and hoping the arguments are right,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">fmt.*()</code> functions give you typed options and IDE autocomplete.
              They compose with the built-in PipeRegistry so you can mix and match.
            </p>
            <app-code-block [code]="fmtCode" />
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">Built-in table features</div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              @for (feat of tableFeatures; track feat) {
                <div class="flex items-center gap-1.5 text-xs text-base-content/60">
                  <hk-lucide-icon name="Check" [size]="12" class="text-success shrink-0" />
                  {{ feat }}
                </div>
              }
            </div>
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">Footer aggregates</div>
          <div class="collapse-content text-sm text-base-content/60 leading-relaxed space-y-2">
            <p>
              Tables support built-in aggregate functions for footers:
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">sum</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">avg</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">min</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">max</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">count</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">count-distinct</code>. Apply with a shorthand or full config.
            </p>
            <app-code-block [code]="aggregateCode" />
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 4. Tree Builder -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="tree-builder" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="GitBranch" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Tree Builder</h2>
            <p class="text-sm text-base-content/50 mt-1">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">createTree()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">node.*()</code>, tree utilities
            </p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <p class="text-sm text-base-content/60 leading-relaxed">
              Building tree structures from scratch means managing parent-child relationships, expand/collapse state, selection propagation,
              and keyboard navigation yourself. The tree builder handles all of this with a declarative API.
            </p>
            <app-code-block [code]="treeBuilderCode" />
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Database" [size]="16" />
              Convert flat data to trees
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Real data is often flat (from a database). Use
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">node.fromData()</code> or
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">buildTree()</code> to convert arrays into tree structures
              automatically.
            </p>
            <app-code-block [code]="treeFlatDataCode" />
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">Tree utility functions</div>
          <div class="collapse-content">
            <div class="grid grid-cols-2 gap-2 pt-1">
              @for (util of treeUtils; track util.name) {
                <div class="text-xs">
                  <code class="font-mono text-primary">{{ util.name }}</code>
                  <span class="text-base-content/45 ml-1">{{ util.desc }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 5. Service Patterns -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="services" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="Bell" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Service Patterns</h2>
            <p class="text-sm text-base-content/50 mt-1">ToastService, AlertService, DialogService -- imperative APIs for feedback.</p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Code" [size]="16" />
              Why services instead of components?
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Toasts, alerts, and dialogs are triggered from logic, not templates. You don't want a
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">&lt;hk-toast&gt;</code> in every component template with two-way
              binding to control visibility. You want to call
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">toast.success('Saved!')</code>
              from anywhere.
            </p>
            <app-code-block [code]="servicesCode" />
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Settings" [size]="16" />
              Provider-based configuration
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              Services are configured once at the app level via provider functions. No need to pass config down through component trees.
            </p>
            <app-code-block [code]="providerCode" />
          </div>
        </div>

        <div tabindex="0" class="collapse collapse-arrow bg-base-100 border-base-300 border">
          <div class="collapse-title font-semibold text-sm">AlertService convenience methods</div>
          <div class="collapse-content">
            <div class="flex flex-wrap gap-2 pt-1">
              @for (m of alertMethods; track m) {
                <span class="badge badge-soft badge-sm font-mono">alert.{{ m }}()</span>
              }
            </div>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 6. Standalone + Signals -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="standalone" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="Unplug" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Standalone & Signals</h2>
            <p class="text-sm text-base-content/50 mt-1">No NgModules. OnPush + signals everywhere. Zero boilerplate.</p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <p class="text-sm text-base-content/60 leading-relaxed">
              Every component is standalone. Import
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">DynamicFormComponent</code>
              and that's all you get -- no shared module pulling in the entire library. Your bundle only includes what you import.
            </p>
            <app-code-block [code]="standaloneCode" />
            <div role="alert" class="alert alert-info alert-soft text-xs">
              <hk-lucide-icon name="Info" [size]="14" />
              <span>
                No <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">NgDaisyuiModule.forRoot()</code>. No shared modules. Just import
                and use.
              </span>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <h3 class="card-title text-sm">
              <hk-lucide-icon name="Zap" [size]="16" />
              Signals & OnPush
            </h3>
            <p class="text-sm text-base-content/60 leading-relaxed">
              All components use <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">input()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">output()</code>, and
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">computed()</code> with OnPush change detection. Angular only
              re-renders when a signal value actually changes -- not on every event. You get this for free without any setup.
            </p>
          </div>
        </div>
      </section>

      <div class="divider"></div>

      <!-- ═══════════════════════════════════════════ -->
      <!-- 7. Icon Registration -->
      <!-- ═══════════════════════════════════════════ -->
      <section id="icons" class="space-y-6 scroll-mt-20">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <hk-lucide-icon name="Smile" [size]="20" />
          </div>
          <div>
            <h2 class="text-2xl font-serif">Icon Registration</h2>
            <p class="text-sm text-base-content/50 mt-1">
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">provideIcons()</code>,
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">hk-lucide-icon</code>
            </p>
          </div>
        </div>

        <div class="card bg-base-100 card-border">
          <div class="card-body gap-4">
            <p class="text-sm text-base-content/60 leading-relaxed">
              The library ships with ~50 internal icons used by its own components (table arrows, tree folders, editor toolbar, etc.). For
              your own usage, register additional Lucide icons with
              <code class="text-xs bg-base-300 px-1.5 py-0.5 rounded">provideIcons()</code>. This keeps the bundle lean -- only the icons
              you reference are included.
            </p>
            <app-code-block [code]="iconCode" />
          </div>
        </div>
      </section>
    </div>
  `,
})
export class KeyPatternsComponent {
  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  }

  toc = [
    { id: 'builders', icon: 'Hammer', label: 'Builder Functions' },
    { id: 'form-controller', icon: 'ToggleRight', label: 'FormController Pattern' },
    { id: 'table-builder', icon: 'Table', label: 'Table Builder' },
    { id: 'tree-builder', icon: 'GitBranch', label: 'Tree Builder' },
    { id: 'services', icon: 'Bell', label: 'Service Patterns' },
    { id: 'standalone', icon: 'Unplug', label: 'Standalone & Signals' },
    { id: 'icons', icon: 'Smile', label: 'Icon Registration' },
  ];

  fieldTypes = [
    'text',
    'email',
    'password',
    'tel',
    'url',
    'textarea',
    'number',
    'range',
    'select',
    'multiSelect',
    'radio',
    'checkbox',
    'toggle',
    'date',
    'time',
    'datetime',
    'color',
    'file',
    'editor',
    'hidden',
  ];

  tableFeatures = [
    'Column sorting',
    'Global search',
    'Column filters',
    'Offset pagination',
    'Cursor pagination',
    'Row selection',
    'Row actions',
    'Bulk actions',
    'Column reordering',
    'Column resizing',
    'Column visibility',
    'Sticky columns',
    'Virtual scrolling',
    'Inline editing',
    'Expandable detail rows',
    'Tree table mode',
    'Row grouping',
    'Footer aggregates',
    'CSV / JSON export',
    'Keyboard navigation',
    'Master-detail',
    'Child grids',
  ];

  treeUtils = [
    { name: 'walkTree()', desc: 'Depth-first traversal' },
    { name: 'findNode()', desc: 'Find first match' },
    { name: 'findNodePath()', desc: 'Get ancestor path' },
    { name: 'mapTree()', desc: 'Transform nodes' },
    { name: 'filterTree()', desc: 'Filter preserving ancestors' },
    { name: 'flattenTree()', desc: 'Flatten to array' },
    { name: 'countNodes()', desc: 'Count all nodes' },
    { name: 'buildTree()', desc: 'Flat list to tree' },
  ];

  alertMethods = ['confirm', 'success', 'error', 'loading', 'countdown', 'deleteConfirm'];

  controllerExamples = [
    { icon: 'PanelBottom', title: 'Dialog footer', desc: 'Form in body, Save/Cancel in dialog actions.' },
    { icon: 'PanelTop', title: 'Toolbar', desc: 'Form below header, submit in a sticky toolbar.' },
    { icon: 'Save', title: 'Auto-save', desc: 'No buttons. Debounce and save on value change.' },
  ];

  builderProblemCode = `// Raw config objects -- no autocomplete, no type safety
const formConfig = {
  fields: [
    {
      type: 'text',       // typo 'textt'? No error until runtime
      key: 'name',
      label: 'Name',
      validators: [
        { type: 'required' },
        { type: 'minLength', value: 2 },
      ],
    },
    {
      type: 'select',
      key: 'role',
      options: ['Admin', 'User'],  // is it 'options'? 'choices'? 'items'?
    },
  ],
};`;

  builderSolutionCode = `import { createForm, field, step } from '@hakistack/ng-daisyui';

const form = createForm({
  fields: [
    // Autocomplete shows exactly what field.text() accepts
    field.text('name', 'Name', { required: true, minLength: 2 }),

    // field.select() requires choices -- TypeScript enforces it
    field.select('role', 'Role', { choices: ['Admin', 'User'] }),

    // Conditional logic is declarative, not imperative
    field.text('company', 'Company', {
      showWhen: { field: 'role', equals: 'Admin' },
    }),
  ],
  onSubmit: (data) => console.log(data),
});

// Wizard? Wrap fields in steps
const wizard = createForm({
  fields: [
    step.create('info', 'Personal Info', [
      field.text('name', 'Name', { required: true }),
      field.email('email', 'Email'),
    ]),
    step.create('prefs', 'Preferences', [
      field.select('theme', 'Theme', { choices: ['Light', 'Dark'] }),
    ]),
    step.review('review', 'Review'),
  ],
  onSubmit: (data) => console.log(data),
});`;

  formControllerCode = `const form = createForm({
  fields: [
    field.text('name', 'Name', { required: true }),
    field.email('email', 'Email'),
  ],
  onSubmit: (data) => saveUser(data),
});

// The form only renders fields -- no buttons
// <hk-dynamic-form [config]="form.config()" />

// Put buttons wherever YOUR layout needs them
// <div class="card-actions">
//   <button (click)="form.reset()">Reset</button>
//   <button (click)="form.submit()">Save</button>
// </div>`;

  tableBuilderCode = `import { createTable, fmt } from '@hakistack/ng-daisyui';

const table = createTable<User>({
  visible: ['name', 'email', 'role', 'salary', 'createdAt'],
  headers: {
    name: 'Full Name',
    createdAt: 'Joined',
  },
  formatters: {
    salary: fmt.currency({ currencyCode: 'USD' }),
    createdAt: fmt.date({ format: 'mediumDate' }),
    role: fmt.titlecase(),
  },
  footers: {
    salary: 'sum',    // built-in aggregate
  },
  selectableRows: 'multi',
  actions: [
    { label: 'Edit', icon: 'Pencil', handler: (row) => edit(row) },
    { label: 'Delete', icon: 'Trash2', handler: (row) => delete(row) },
  ],
});`;

  fmtCode = `import { fmt } from '@hakistack/ng-daisyui';

// Type-safe formatters with autocomplete
fmt.date({ format: 'short' })         // DatePipe
fmt.currency({ currencyCode: 'EUR' }) // CurrencyPipe
fmt.number({ digitsInfo: '1.2-2' })   // DecimalPipe
fmt.percent()                          // PercentPipe
fmt.uppercase()                        // UpperCasePipe
fmt.titlecase()                        // TitleCasePipe

// Use in table columns
formatters: {
  price: fmt.currency(),
  date: fmt.date({ format: 'longDate' }),
  status: fmt.uppercase(),
}`;

  aggregateCode = `// Shorthand -- just the function name
footers: {
  price: 'sum',
  quantity: 'count',
}

// Full config -- with label and custom logic
footerRows: [
  {
    price: { fn: 'sum', label: 'Total' },
    quantity: { fn: 'avg', label: 'Avg Qty' },
  },
  {
    price: { fn: 'sum', custom: (data) => data.reduce((a, r) => a + r.price * r.quantity, 0), label: 'Weighted' },
  },
]`;

  treeBuilderCode = `import { createTree, node } from '@hakistack/ng-daisyui';

const tree = createTree({
  nodes: [
    node.folder('src', [
      node.folder('app', [
        node.file('app.ts', { icon: 'FileCode' }),
        node.file('app.routes.ts', { icon: 'FileCode' }),
      ]),
      node.file('main.ts', { icon: 'FileCode' }),
      node.file('styles.css', { icon: 'FileText' }),
    ]),
    node.lazy('node_modules', {
      // Loaded on expand -- great for large directories
    }),
  ],
  selectionMode: 'multi',
  filterable: true,
  dragDrop: true,
  showLines: true,
  keyboardNavigation: true,
});`;

  treeFlatDataCode = `import { node, buildTree } from '@hakistack/ng-daisyui';

// Convert a flat array with parent IDs into a tree
const departments = [
  { id: 1, name: 'Engineering', parentId: null },
  { id: 2, name: 'Frontend', parentId: 1 },
  { id: 3, name: 'Backend', parentId: 1 },
  { id: 4, name: 'Design', parentId: null },
];

const tree = buildTree(departments, {
  idFn: (d) => d.id,
  parentIdFn: (d) => d.parentId,
  labelFn: (d) => d.name,
});

// Or convert hierarchical data
const nodes = node.fromData(categories, {
  labelFn: (c) => c.name,
  childrenFn: (c) => c.subcategories,
  keyFn: (c) => c.id,
});`;

  servicesCode = `import { inject } from '@angular/core';
import { ToastService, AlertService, DialogService } from '@hakistack/ng-daisyui';

// Toast -- fire and forget
const toast = inject(ToastService);
toast.success('User saved!');
toast.error('Something went wrong', 'Please try again');

// Alert -- returns a promise
const alert = inject(AlertService);
const confirmed = await alert.confirm({
  title: 'Delete user?',
  message: 'This action cannot be undone.',
});
if (confirmed) deleteUser();

// Shorthand for common patterns
await alert.deleteConfirm('John Doe', () => deleteUser());

// Dialog -- open any component as a modal
const dialog = inject(DialogService);
dialog.open(EditUserComponent, { data: { userId: 123 } });`;

  providerCode = `// app.config.ts
import {
  provideToast,
  provideAlert,
  provideFormState,
  provideIcons,
  provideHkTheme,
  providePipes,
} from '@hakistack/ng-daisyui';

export const appConfig = {
  providers: [
    provideHkTheme('daisyui-v5'),    // Theme version
    provideToast(),                    // Toast defaults
    provideAlert(),                    // Alert defaults
    provideFormState({ mode: 'localStorage' }),  // Auto-save
    providePipes(),                    // Pipe registry
    provideIcons({ Home, Settings }), // Your icons
  ],
};`;

  standaloneCode = `import { Component } from '@angular/core';
// Import only what you need
import { DynamicFormComponent, TableComponent } from '@hakistack/ng-daisyui';

@Component({
  selector: 'app-my-page',
  imports: [DynamicFormComponent, TableComponent],
  template: \`...\`,
})
export class MyPageComponent { }`;

  iconCode = `// app.config.ts
import { provideIcons } from '@hakistack/ng-daisyui';
import { Home, Settings, User, Star } from 'lucide-angular';

providers: [
  provideIcons({ Home, Settings, User, Star }),
]

// Then use anywhere
// <hk-lucide-icon name="Home" [size]="20" />

// Library-internal icons (arrows, checks, folders, etc.)
// are always included automatically.`;
}
