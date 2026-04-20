import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';
import { DemoPageComponent } from '../shared/demo-page.component';

type TabsTab = 'basic' | 'features' | 'vertical';

@Component({
  selector: 'app-tabs-demo',
  imports: [TabGroupComponent, TabPanelComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent, DemoPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-demo-page
      title="Tabs"
      description="Accessible tabbed interface with icons, styles, and lazy loading"
      icon="panel-top"
      category="Navigation"
      importName="TabGroupComponent, TabPanelComponent"
    >
      <div examples class="space-y-6">
        @if (activeTab() === 'basic') {
          <div class="space-y-6">
            <app-doc-section title="Basic Tabs" description="Simple horizontal tabs" [codeExample]="basicCode">
              <hk-tab-group [(selectedTab)]="basicTab">
                <hk-tab-panel value="overview" label="Overview">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Overview</h3>
                      <p class="text-base-content/70">
                        This is the overview tab content. It contains general information about the product or feature.
                      </p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="features" label="Features">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Features</h3>
                      <ul class="list-disc list-inside text-base-content/70 space-y-1">
                        <li>Feature one with description</li>
                        <li>Feature two with description</li>
                        <li>Feature three with description</li>
                      </ul>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="pricing" label="Pricing">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Pricing</h3>
                      <p class="text-base-content/70">Check out our competitive pricing plans.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>
              </hk-tab-group>

              <div class="mt-4 text-sm">
                Selected Tab: <code class="bg-base-200 px-2 py-1 rounded">{{ basicTab() }}</code>
              </div>
            </app-doc-section>

            <app-doc-section title="Tabs with Icons" description="Lucide icons in tab labels" [codeExample]="iconCode">
              <hk-tab-group>
                <hk-tab-panel value="home" label="Home" icon="House">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Welcome Home</h3>
                      <p class="text-base-content/70">This is the home dashboard.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="profile" label="Profile" icon="User">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">User Profile</h3>
                      <p class="text-base-content/70">Manage your profile settings.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="settings" label="Settings" icon="Settings">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Application Settings</h3>
                      <p class="text-base-content/70">Configure application preferences.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="notifications" label="Notifications" icon="Bell">
                  <ng-template>
                    <div class="p-4">
                      <h3 class="text-lg font-semibold mb-2">Notifications</h3>
                      <p class="text-base-content/70">Manage your notification preferences.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>
              </hk-tab-group>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'features') {
          <div class="space-y-6">
            <app-doc-section title="Disabled Tab" description="Some tabs can be disabled" [codeExample]="disabledCode">
              <hk-tab-group>
                <hk-tab-panel value="active" label="Active Tab">
                  <ng-template>
                    <div class="p-4">
                      <p class="text-base-content/70">This tab is active and clickable.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="disabled" label="Disabled Tab" [disabled]="true">
                  <ng-template>
                    <div class="p-4">
                      <p>You won't see this content.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="another" label="Another Tab">
                  <ng-template>
                    <div class="p-4">
                      <p class="text-base-content/70">This tab is also active.</p>
                    </div>
                  </ng-template>
                </hk-tab-panel>
              </hk-tab-group>
            </app-doc-section>

            <app-doc-section
              title="Programmatic Control"
              description="Control tabs from outside the component"
              [codeExample]="programmaticCode"
            >
              <div class="flex gap-2 mb-4">
                <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('first')">Go to First</button>
                <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('second')">Go to Second</button>
                <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('third')">Go to Third</button>
              </div>

              <hk-tab-group [(selectedTab)]="programmaticTab">
                <hk-tab-panel value="first" label="First Tab">
                  <ng-template>
                    <div class="p-4 bg-primary/10 rounded">First tab content</div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="second" label="Second Tab">
                  <ng-template>
                    <div class="p-4 bg-secondary/10 rounded">Second tab content</div>
                  </ng-template>
                </hk-tab-panel>

                <hk-tab-panel value="third" label="Third Tab">
                  <ng-template>
                    <div class="p-4 bg-accent/10 rounded">Third tab content</div>
                  </ng-template>
                </hk-tab-panel>
              </hk-tab-group>
            </app-doc-section>
          </div>
        }

        @if (activeTab() === 'vertical') {
          <app-doc-section title="Vertical Tabs" description="Tabs oriented vertically" [codeExample]="verticalCode">
            <hk-tab-group orientation="vertical">
              <hk-tab-panel value="general" label="General" icon="Settings">
                <ng-template>
                  <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">General Settings</h3>
                    <p class="text-base-content/70">Configure general application settings here.</p>
                  </div>
                </ng-template>
              </hk-tab-panel>

              <hk-tab-panel value="security" label="Security" icon="Shield">
                <ng-template>
                  <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">Security Settings</h3>
                    <p class="text-base-content/70">Manage security and privacy options.</p>
                  </div>
                </ng-template>
              </hk-tab-panel>

              <hk-tab-panel value="billing" label="Billing" icon="CreditCard">
                <ng-template>
                  <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">Billing Information</h3>
                    <p class="text-base-content/70">View and manage billing details.</p>
                  </div>
                </ng-template>
              </hk-tab-panel>

              <hk-tab-panel value="integrations" label="Integrations" icon="Puzzle">
                <ng-template>
                  <div class="p-4">
                    <h3 class="text-lg font-semibold mb-2">Integrations</h3>
                    <p class="text-base-content/70">Connect third-party services.</p>
                  </div>
                </ng-template>
              </hk-tab-panel>
            </hk-tab-group>
          </app-doc-section>
        }
      </div>

      <div api class="space-y-6">
        <!-- API Sub-tabs -->
        <div role="tablist" class="tabs tabs-box tabs-boxed">
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'tab-group'" (click)="apiTab.set('tab-group')">TabGroup</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'tab-panel'" (click)="apiTab.set('tab-panel')">TabPanel</button>
          <button role="tab" class="tab" [class.tab-active]="apiTab() === 'types'" (click)="apiTab.set('types')">Types</button>
        </div>

        <!-- TabGroup sub-tab -->
        @if (apiTab() === 'tab-group') {
          <div class="space-y-6">
            <app-api-table title="TabGroup Inputs" [entries]="groupInputDocs" />
            <app-api-table title="TabGroup Outputs" [entries]="groupOutputDocs" />
            <app-api-table title="TabGroup Methods" [entries]="groupMethodDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Usage</h3>
                <p class="text-sm text-base-content/70">
                  The <code>hk-tab-group</code> component manages a set of <code>hk-tab-panel</code> children. It handles keyboard
                  navigation (arrow keys, Home, End), ARIA roles, and two-way binding of the active tab.
                </p>
                <app-code-block [code]="usageCode" />
              </div>
            </div>
          </div>
        }

        <!-- TabPanel sub-tab -->
        @if (apiTab() === 'tab-panel') {
          <div class="space-y-6">
            <app-api-table title="TabPanel Inputs" [entries]="panelInputDocs" />

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">Lazy Content Loading</h3>
                <p class="text-sm text-base-content/70">
                  Tab panel content is wrapped in an <code>ng-template</code> for lazy rendering. Only the active panel's template is
                  instantiated in the DOM, improving performance for tabs with heavy content.
                </p>
                <app-code-block [code]="lazyContentCode" />
              </div>
            </div>
          </div>
        }

        <!-- Types sub-tab -->
        @if (apiTab() === 'types') {
          <div class="space-y-6">
            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TabSelectionMode</h3>
                <p class="text-sm text-base-content/70">
                  Controls how keyboard navigation interacts with tab selection. In <code>'follow'</code> mode, moving focus with arrow keys
                  immediately selects the tab. In <code>'explicit'</code> mode, the user must press Enter or click to confirm selection.
                </p>
                <app-code-block [code]="typeSelectionMode" />
              </div>
            </div>

            <div class="card card-border card-bordered bg-base-100">
              <div class="card-body gap-3">
                <h3 class="card-title text-lg">TabOrientation</h3>
                <p class="text-sm text-base-content/70">
                  Determines the layout direction of the tab list. Horizontal tabs render in a row; vertical tabs render in a column
                  alongside their content panel.
                </p>
                <app-code-block [code]="typeOrientation" />
              </div>
            </div>
          </div>
        }
      </div>
    </app-demo-page>
  `,
})
export class TabsDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as TabsTab);

  apiTab = signal<'tab-group' | 'tab-panel' | 'types'>('tab-group');
  basicTab = signal('overview');
  programmaticTab = signal('first');

  // --- Code examples ---
  basicCode = `// TypeScript
activeTab = signal('overview');

// Template
<hk-tab-group [(selectedTab)]="activeTab">
  <hk-tab-panel value="overview" label="Overview">
    <ng-template>
      <p>Overview content</p>
    </ng-template>
  </hk-tab-panel>
  <hk-tab-panel value="features" label="Features">
    <ng-template>
      <p>Features content</p>
    </ng-template>
  </hk-tab-panel>
</hk-tab-group>`;

  iconCode = `// TypeScript
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

// Template
<hk-tab-group>
  <hk-tab-panel value="home" label="Home" icon="House">
    <ng-template>
      <p>Home content</p>
    </ng-template>
  </hk-tab-panel>
  <hk-tab-panel value="settings" label="Settings" icon="Settings">
    <ng-template>
      <p>Settings content</p>
    </ng-template>
  </hk-tab-panel>
</hk-tab-group>`;

  disabledCode = `// TypeScript
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

// Template
<hk-tab-group>
  <hk-tab-panel value="active" label="Active Tab">
    <ng-template>
      <p>This tab is active and clickable.</p>
    </ng-template>
  </hk-tab-panel>
  <hk-tab-panel value="disabled" label="Disabled" [disabled]="true">
    <ng-template>
      <p>This content is inaccessible</p>
    </ng-template>
  </hk-tab-panel>
</hk-tab-group>`;

  programmaticCode = `// TypeScript
selectedTab = signal('first');

// Template
<button (click)="selectedTab.set('second')">Go to Second</button>
<hk-tab-group [(selectedTab)]="selectedTab">
  <hk-tab-panel value="first" label="First Tab">
    <ng-template>First tab content</ng-template>
  </hk-tab-panel>
  <hk-tab-panel value="second" label="Second Tab">
    <ng-template>Second tab content</ng-template>
  </hk-tab-panel>
</hk-tab-group>`;

  verticalCode = `// TypeScript
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

// Template
<hk-tab-group orientation="vertical">
  <hk-tab-panel value="general" label="General" icon="Settings">
    <ng-template>
      <p>General settings content</p>
    </ng-template>
  </hk-tab-panel>
  <hk-tab-panel value="security" label="Security" icon="Shield">
    <ng-template>
      <p>Security settings content</p>
    </ng-template>
  </hk-tab-panel>
</hk-tab-group>`;

  usageCode = `import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';

@Component({
  imports: [TabGroupComponent, TabPanelComponent],
  template: \`
    <hk-tab-group
      [(selectedTab)]="activeTab"
      orientation="horizontal"
      (selectedTabChange)="onTabChange($event)">

      <hk-tab-panel
        value="tab1"
        label="Tab Label"
        icon="House"
        [disabled]="false">
        <ng-template>
          <!-- Lazy-loaded content -->
          <p>Tab content here</p>
        </ng-template>
      </hk-tab-panel>

    </hk-tab-group>
  \`,
})`;

  // --- API docs ---
  groupInputDocs: ApiDocEntry[] = [
    {
      name: 'selectedTab',
      type: 'model<string | undefined>',
      default: 'undefined',
      description: 'Two-way binding for the currently active tab value. Use [(selectedTab)] for two-way binding.',
    },
    {
      name: 'activeIndex',
      type: 'number',
      default: '0',
      description: 'The index of the initially active tab. Used only when selectedTab is not provided.',
    },
    {
      name: 'selectionMode',
      type: "'follow' | 'explicit'",
      default: "'explicit'",
      description: "Selection mode. 'follow' activates a tab on keyboard focus, 'explicit' requires a click or Enter key.",
    },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Layout orientation of the tab list' },
    {
      name: 'wrap',
      type: 'boolean',
      default: 'true',
      description: 'Whether keyboard navigation wraps from the last tab back to the first (and vice versa)',
    },
  ];

  groupOutputDocs: ApiDocEntry[] = [
    {
      name: 'selectedTabChange',
      type: 'string | undefined',
      description: 'Emitted when the selected tab changes. This is the output side of the selectedTab model for two-way binding.',
    },
  ];

  groupMethodDocs: ApiDocEntry[] = [
    {
      name: 'ngAfterContentInit()',
      type: 'void',
      description: 'Lifecycle hook that sets the initial selected tab based on activeIndex if selectedTab was not explicitly provided.',
    },
  ];

  panelInputDocs: ApiDocEntry[] = [
    {
      name: 'value',
      type: 'string',
      description:
        'Unique identifier for this tab panel (required). Must be unique within the tab group. Used for two-way binding with selectedTab.',
    },
    {
      name: 'label',
      type: 'string',
      default: "''",
      description: 'Display text shown on the tab button in the tab list. Rendered alongside the optional icon.',
    },
    {
      name: 'icon',
      type: 'IconName | undefined',
      default: 'undefined',
      description: 'Optional Lucide icon name displayed before the label text on the tab button. Accepts any valid Lucide icon string.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description:
        'Whether this tab is disabled. Disabled tabs cannot be selected via click or keyboard navigation and are visually dimmed.',
    },
  ];

  lazyContentCode = `<hk-tab-panel value="details" label="Details">
  <!-- Content inside ng-template is only rendered when this tab is active -->
  <ng-template>
    <app-expensive-component />
  </ng-template>
</hk-tab-panel>`;

  typeSelectionMode = `type TabSelectionMode = 'follow' | 'explicit';
// 'follow'   - Tab is selected immediately when focused via keyboard
// 'explicit'  - Tab is focused but not selected until Enter/click`;

  typeOrientation = `type TabOrientation = 'horizontal' | 'vertical';
// 'horizontal' - Tabs rendered in a row above the content
// 'vertical'   - Tabs rendered in a column beside the content`;
}
