import { Component, signal } from '@angular/core';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { ApiTableComponent } from '../shared/api-table.component';
import { CodeBlockComponent } from '../shared/code-block.component';
import { ApiDocEntry } from '../shared/api-table.types';

type TabsTab = 'basic' | 'features' | 'vertical';

@Component({
  selector: 'app-tabs-demo',
  imports: [TabGroupComponent, TabPanelComponent, DocSectionComponent, ApiTableComponent, CodeBlockComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold">Tabs</h1>
        <p class="text-base-content/70 mt-2">Accessible tabbed interface with keyboard navigation</p>
        <div class="mt-2">
          <code class="badge badge-outline text-xs">import {{ '{' }} TabGroupComponent, TabPanelComponent {{ '}' }} from '&#64;hakistack/ng-daisyui'</code>
        </div>
      </div>

      <!-- Page Tabs -->
      <div role="tablist" class="tabs tabs-bordered">
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'examples'" (click)="pageTab.set('examples')">Examples</button>
        <button role="tab" class="tab" [class.tab-active]="pageTab() === 'api'" (click)="pageTab.set('api')">API</button>
      </div>

      @if (pageTab() === 'examples') {
        <!-- Variant Tabs -->
        <div role="tablist" class="tabs tabs-boxed">
          <input type="radio" name="tabs_demo" role="tab" class="tab" aria-label="Basic"
            [checked]="activeTab() === 'basic'" (change)="activeTab.set('basic')" />
          <input type="radio" name="tabs_demo" role="tab" class="tab" aria-label="Features"
            [checked]="activeTab() === 'features'" (change)="activeTab.set('features')" />
          <input type="radio" name="tabs_demo" role="tab" class="tab" aria-label="Vertical"
            [checked]="activeTab() === 'vertical'" (change)="activeTab.set('vertical')" />
        </div>

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

            <app-doc-section title="Programmatic Control" description="Control tabs from outside the component" [codeExample]="programmaticCode">
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
      }

      @if (pageTab() === 'api') {
        <div class="space-y-6">
          <app-api-table title="TabGroup Inputs" [entries]="groupInputDocs" />
          <app-api-table title="TabGroup Outputs" [entries]="groupOutputDocs" />
          <app-api-table title="TabPanel Inputs" [entries]="panelInputDocs" />

          <div>
            <h3 class="text-lg font-semibold mb-2">Usage</h3>
            <app-code-block [code]="usageCode" />
          </div>
        </div>
      }
    </div>
  `,
})
export class TabsDemoComponent {
  pageTab = signal<'examples' | 'api'>('examples');
  activeTab = signal<TabsTab>('basic');
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
    { name: 'selectedTab', type: 'model<string>', description: 'Two-way binding for the active tab value' },
    { name: 'orientation', type: "'horizontal' | 'vertical'", default: "'horizontal'", description: 'Tab orientation' },
  ];

  groupOutputDocs: ApiDocEntry[] = [
    { name: 'selectedTabChange', type: 'string', description: 'Emitted when the selected tab changes' },
  ];

  panelInputDocs: ApiDocEntry[] = [
    { name: 'value', type: 'string', description: 'Unique identifier for this tab panel (required)' },
    { name: 'label', type: 'string', description: 'Display text for the tab button (required)' },
    { name: 'icon', type: 'IconName', default: '-', description: 'Lucide icon name shown before the label' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable this tab' },
  ];
}
