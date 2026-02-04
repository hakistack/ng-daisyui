import { Component, signal } from '@angular/core';
import { TabGroupComponent, TabPanelComponent } from '@hakistack/ng-daisyui-v3';

@Component({
  selector: 'app-tabs-demo',
  imports: [TabGroupComponent, TabPanelComponent],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-3xl font-bold">Tabs</h1>
        <p class="text-base-content/70 mt-2">Accessible tabbed interface with keyboard navigation</p>
      </div>

      <!-- Basic Tabs -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Basic Tabs</h2>
          <p class="text-sm text-base-content/60 mb-4">Simple horizontal tabs</p>

          <app-tab-group [(selectedTab)]="basicTab">
            <app-tab-panel value="overview" label="Overview">
              <ng-template>
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">Overview</h3>
                  <p class="text-base-content/70">This is the overview tab content. It contains general information about the product or feature.</p>
                </div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="features" label="Features">
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
            </app-tab-panel>

            <app-tab-panel value="pricing" label="Pricing">
              <ng-template>
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">Pricing</h3>
                  <p class="text-base-content/70">Check out our competitive pricing plans.</p>
                </div>
              </ng-template>
            </app-tab-panel>
          </app-tab-group>

          <div class="mt-4 text-sm">
            Selected Tab: <code class="bg-base-200 px-2 py-1 rounded">{{ basicTab() }}</code>
          </div>
        </div>
      </div>

      <!-- Tabs with Icons -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Tabs with Icons</h2>
          <p class="text-sm text-base-content/60 mb-4">Lucide icons in tab labels</p>

          <app-tab-group>
            <app-tab-panel value="home" label="Home" icon="House">
              <ng-template>
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">Welcome Home</h3>
                  <p class="text-base-content/70">This is the home dashboard.</p>
                </div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="profile" label="Profile" icon="User">
              <ng-template>
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">User Profile</h3>
                  <p class="text-base-content/70">Manage your profile settings.</p>
                </div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="settings" label="Settings" icon="Settings">
              <ng-template>
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">Application Settings</h3>
                  <p class="text-base-content/70">Configure application preferences.</p>
                </div>
              </ng-template>
            </app-tab-panel>
          </app-tab-group>
        </div>
      </div>

      <!-- Disabled Tab -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Disabled Tab</h2>
          <p class="text-sm text-base-content/60 mb-4">Some tabs can be disabled</p>

          <app-tab-group>
            <app-tab-panel value="active" label="Active Tab">
              <ng-template>
                <div class="p-4">
                  <p class="text-base-content/70">This tab is active and clickable.</p>
                </div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="disabled" label="Disabled Tab" [disabled]="true">
              <ng-template>
                <div class="p-4">
                  <p>You won't see this content.</p>
                </div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="another" label="Another Tab">
              <ng-template>
                <div class="p-4">
                  <p class="text-base-content/70">This tab is also active.</p>
                </div>
              </ng-template>
            </app-tab-panel>
          </app-tab-group>
        </div>
      </div>

      <!-- Programmatic Control -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Programmatic Control</h2>
          <p class="text-sm text-base-content/60 mb-4">Control tabs from outside the component</p>

          <div class="flex gap-2 mb-4">
            <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('first')">Go to First</button>
            <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('second')">Go to Second</button>
            <button class="btn btn-sm btn-outline" (click)="programmaticTab.set('third')">Go to Third</button>
          </div>

          <app-tab-group [(selectedTab)]="programmaticTab">
            <app-tab-panel value="first" label="First Tab">
              <ng-template>
                <div class="p-4 bg-primary/10 rounded">First tab content</div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="second" label="Second Tab">
              <ng-template>
                <div class="p-4 bg-secondary/10 rounded">Second tab content</div>
              </ng-template>
            </app-tab-panel>

            <app-tab-panel value="third" label="Third Tab">
              <ng-template>
                <div class="p-4 bg-accent/10 rounded">Third tab content</div>
              </ng-template>
            </app-tab-panel>
          </app-tab-group>
        </div>
      </div>
    </div>
  `,
})
export class TabsDemoComponent {
  basicTab = signal('overview');
  programmaticTab = signal('first');
}
