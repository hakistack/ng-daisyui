import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { LucideFileText, LucidePencil } from '@lucide/angular';
import { createForm, field, DynamicFormComponent } from '@hakistack/ng-daisyui';
import { EditorComponent, slash, createSlashCommands } from '../../hakistack/ng-daisyui/src/lib/components';
import { DocSectionComponent } from '../shared/doc-section.component';
import { DemoPageComponent } from '../shared/demo-page.component';
import { ApiDocsForComponent } from '../shared/api-docs-for.component';

type ExampleTab = 'basic' | 'toolbars' | 'forms' | 'dynamic' | 'slash';

@Component({
  selector: 'app-editor-demo',
  imports: [EditorComponent, DynamicFormComponent, ReactiveFormsModule, DocSectionComponent, DemoPageComponent, ApiDocsForComponent],
  template: `
    <app-demo-page
      title="Editor"
      description="Rich text editor powered by TipTap (ProseMirror) with native DaisyUI theming"
      icon="file-text"
      category="Inputs"
      importName="EditorComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="grid gap-6">
            <app-doc-section
              title="Default Editor"
              description="Basic editor with the default 'basic' toolbar preset"
              [codeExample]="basicCode"
            >
              <hk-editor placeholder="Start writing..." (textChange)="onTextChange($event)" />
              @if (lastHtml()) {
                <div class="mt-3">
                  <div class="text-xs font-semibold text-base-content/50 mb-1">HTML Output:</div>
                  <pre class="bg-base-200 p-3 rounded-lg text-xs overflow-x-auto">{{ lastHtml() }}</pre>
                </div>
              }
            </app-doc-section>

            <app-doc-section title="With Max Length" description="Character counter with validation" [codeExample]="maxLengthCode">
              <hk-editor placeholder="Limited to 200 characters..." [maxLength]="200" editorHeight="150px" />
            </app-doc-section>

            <app-doc-section title="Read Only" description="Non-editable editor display" [codeExample]="readonlyCode">
              <hk-editor [readonly]="true" [editorHeight]="'120px'" (editorReady)="setReadonlyContent()" />
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'toolbars') {
          <div class="grid gap-6">
            <app-doc-section title="Minimal Toolbar" description="Bold, italic, underline, and link only" [codeExample]="minimalCode">
              <hk-editor toolbar="minimal" placeholder="Minimal formatting..." editorHeight="150px" />
            </app-doc-section>

            <app-doc-section
              title="Full Toolbar"
              description="All formatting options including headers, colors, alignment, code blocks"
              [codeExample]="fullCode"
            >
              <hk-editor toolbar="full" placeholder="Full editor experience..." editorHeight="250px" />
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'forms') {
          <div class="grid gap-6">
            <app-doc-section title="Reactive Form" description="Editor bound to a FormControl" [codeExample]="reactiveCode">
              <hk-editor [formControl]="contentControl" placeholder="Form-bound editor..." />
              <div class="mt-3 flex gap-3">
                <button class="btn btn-sm btn-primary" (click)="contentControl.setValue('<p>Set via <strong>FormControl</strong></p>')">
                  Set Value
                </button>
                <button class="btn btn-sm btn-ghost" (click)="contentControl.reset()">Reset</button>
              </div>
              <div class="mt-3 text-xs">
                <div><strong>Valid:</strong> {{ contentControl.valid }}</div>
                <div><strong>Value:</strong></div>
                <pre class="bg-base-200 p-2 rounded text-xs mt-1 overflow-x-auto">{{ contentControl.value }}</pre>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'dynamic') {
          <div class="grid gap-6">
            <app-doc-section title="Dynamic Form Integration" description="Using field.editor() in createForm" [codeExample]="dynamicCode">
              <hk-dynamic-form [config]="editorForm.config()" />
              <div class="mt-3 flex gap-2">
                <button class="btn btn-sm btn-primary" (click)="editorForm.submit()">Submit</button>
                <button class="btn btn-sm btn-ghost" (click)="editorForm.reset()">Reset</button>
              </div>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'slash') {
          <div class="grid gap-6">
            <app-doc-section
              title="Slash Commands (Built-ins)"
              description="Type '/' on a new line to open the command palette. Built-in set covers headings, lists, blockquote, code block, and divider."
              [codeExample]="slashBuiltinCode"
            >
              <hk-editor placeholder="Type '/' to open the slash menu…" [slashCommands]="true" editorHeight="220px" />
            </app-doc-section>

            <app-doc-section
              title="Slash Commands (Custom Items)"
              description="Pass an array of EditorSlashCommand to replace the built-ins, or { items, append: true } to extend them."
              [codeExample]="slashCustomCode"
            >
              <hk-editor placeholder="Try /signature or /heading…" [slashCommands]="customSlashCommands" editorHeight="220px" />
            </app-doc-section>
          </div>
        }
      </div>
      <div api>
        <app-api-docs-for component="EditorComponent" />
      </div>
    </app-demo-page>
  `,
})
export class EditorDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as ExampleTab);

  lastHtml = signal<string>('');
  contentControl = new FormControl('');

  editorForm = createForm({
    fields: [
      field.text('title', 'Title', { required: true }),
      field.editor('content', 'Content', { toolbar: 'basic', editorHeight: '250px' }),
    ],
    onSubmit: (data) => console.log('Editor form submitted:', data),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onTextChange(event: any): void {
    this.lastHtml.set(event.htmlValue);
  }

  setReadonlyContent(): void {
    // This is a placeholder — in a real app you'd set content via formControl
  }

  basicCode = `<hk-editor
  placeholder="Start writing..."
  (textChange)="onTextChange($event)"
/>`;

  maxLengthCode = `<hk-editor
  placeholder="Limited to 200 characters..."
  [maxLength]="200"
  editorHeight="150px"
/>`;

  readonlyCode = `<hk-editor [readonly]="true" editorHeight="120px" />`;

  minimalCode = `<hk-editor toolbar="minimal" placeholder="Minimal formatting..." />`;

  fullCode = `<hk-editor toolbar="full" placeholder="Full editor experience..." />`;

  reactiveCode = `contentControl = new FormControl('');

<hk-editor [formControl]="contentControl" />`;

  customSlashCommands = createSlashCommands({
    append: true, // keep the built-ins, add ours after
    items: [
      // Inline snippet — string literal
      slash.snippet({
        id: 'signature',
        label: 'Signature',
        description: 'Insert your saved signature block',
        icon: LucidePencil,
        keywords: ['sign', 'sig'],
        group: 'Snippets',
        html: '<p>—<br/><strong>Jose Rios</strong><br/><em>Hakistack</em></p>',
      }),
      // File-loaded snippet — fetched from /snippets/meeting-notes.html on commit
      slash.snippetFromUrl({
        id: 'meeting-notes',
        label: 'Meeting notes template',
        description: 'Load the saved template from a remote .html file',
        icon: LucideFileText,
        keywords: ['meeting', 'notes', 'template'],
        group: 'Snippets',
        url: 'snippets/meeting-notes.html',
      }),
    ],
  });

  slashBuiltinCode = `<hk-editor
  placeholder="Type '/' to open the slash menu…"
  [slashCommands]="true"
/>`;

  slashCustomCode = `import { LucideFileText, LucidePencil } from '@lucide/angular';
import { slash, createSlashCommands } from '@hakistack/ng-daisyui';

customSlashCommands = createSlashCommands({
  append: true,
  items: [
    // 1) Inline string — bundled into your code
    slash.snippet({
      id: 'signature',
      label: 'Signature',
      icon: LucidePencil,
      group: 'Snippets',
      html: '<p>— <strong>Jose</strong></p>',
    }),

    // 2) Loaded from a remote .html file at commit-time
    slash.snippetFromUrl({
      id: 'meeting-notes',
      label: 'Meeting notes template',
      icon: LucideFileText,
      group: 'Snippets',
      url: 'snippets/meeting-notes.html',
    }),

    // 3) Sync function — useful when the HTML depends on runtime state
    slash.snippet({
      id: 'today',
      label: "Today's date",
      html: () => \`<p>\${new Date().toDateString()}</p>\`,
    }),

    // 4) Chain command — use for editor commands like toggleTaskList()
    // slash.command({ id, label, run: (chain) => chain.toggleTaskList() })

    // 5) Full-power escape hatch
    // slash.custom({ id, label, action: ({ editor, range }) => /* ... */ })
  ],
});

<hk-editor [slashCommands]="customSlashCommands" />`;

  dynamicCode = `editorForm = createForm({
  fields: [
    field.text('title', 'Title', { required: true }),
    field.editor('content', 'Content', {
      toolbar: 'basic',
      editorHeight: '250px',
    }),
  ],
  onSubmit: (data) => console.log(data),
});

<hk-dynamic-form [config]="editorForm.config()" />`;
}
