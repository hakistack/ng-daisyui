import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { BreadcrumbItem, BreadcrumbsComponent } from '@hakistack/ng-daisyui';
import { DocSectionComponent } from '../shared/doc-section.component';
import { DemoPageComponent } from '../shared/demo-page.component';

type DemoTab = 'basic' | 'icons' | 'maxwidth' | 'auto';

@Component({
  selector: 'app-breadcrumbs-demo',
  imports: [BreadcrumbsComponent, DocSectionComponent, DemoPageComponent],
  template: `
    <app-demo-page
      title="Breadcrumbs"
      description="A navigation trail — driven by plain item objects, or derived automatically from the Angular Router."
      icon="list-tree"
      category="Navigation"
      importName="BreadcrumbsComponent, BreadcrumbService"
    >
      <div examples class="space-y-6">
        <!-- Basic -->
        @if (activeTab() === 'basic') {
          <app-doc-section
            title="Basic"
            description="Plain item objects. The last item is the current page (non-interactive)."
            [codeExample]="basicCode"
          >
            <hk-breadcrumbs [items]="basicItems" (itemSelect)="picked.set($event.label)" />
            @if (picked()) {
              <p class="text-sm opacity-60 mt-3">
                Clicked: <strong>{{ picked() }}</strong>
              </p>
            }
          </app-doc-section>
        }

        <!-- With icons -->
        @if (activeTab() === 'icons') {
          <app-doc-section title="With icons" description="Each crumb can carry a leading Lucide icon." [codeExample]="iconsCode">
            <hk-breadcrumbs [items]="iconItems" (itemSelect)="picked.set($event.label)" />
          </app-doc-section>
        }

        <!-- Max width / scroll -->
        @if (activeTab() === 'maxwidth') {
          <app-doc-section
            title="Max width"
            description="Set maxWidth (a CSS length); if the trail is wider than the container it scrolls horizontally."
            [codeExample]="maxWidthCode"
          >
            <hk-breadcrumbs [items]="longItems" maxWidth="20rem" (itemSelect)="picked.set($event.label)" />
          </app-doc-section>
        }

        <!-- Auto / router -->
        @if (activeTab() === 'auto') {
          <app-doc-section
            title="Automatic (from the Router)"
            description="Set auto to build the trail from the route tree. Annotate routes with data.breadcrumb; the trail rebuilds on navigation. This live trail is built from the current page's route."
            [codeExample]="autoCode"
          >
            <hk-breadcrumbs auto [home]="{ label: 'Home', routerLink: '/', icon: 'house' }" />
            <p class="text-sm opacity-60 mt-3">
              The "Breadcrumbs" crumb comes from this route's <code>data: &#123; breadcrumb: 'Breadcrumbs' &#125;</code>; "Home" is the
              <code>home</code> input.
            </p>
          </app-doc-section>
        }
      </div>
    </app-demo-page>
  `,
})
export class BreadcrumbsDemoComponent {
  private route = inject(ActivatedRoute);
  private featureParam = toSignal(this.route.params.pipe(map((p) => p['feature'])));
  activeTab = computed(() => (this.featureParam() ?? 'basic') as DemoTab);

  picked = signal('');

  // Live demo crumbs use `action` so clicks don't navigate to non-existent
  // demo routes; real apps use `routerLink` (shown in the code samples).
  private nav =
    (label: string): ((i: BreadcrumbItem) => void) =>
    () =>
      this.picked.set(label);

  basicItems: BreadcrumbItem[] = [
    { label: 'Home', action: this.nav('Home') },
    { label: 'Documents', action: this.nav('Documents') },
    { label: 'Add Document' },
  ];

  iconItems: BreadcrumbItem[] = [
    { label: 'Home', icon: 'house', action: this.nav('Home') },
    { label: 'Documents', icon: 'folder', action: this.nav('Documents') },
    { label: 'Add Document', icon: 'file-text' },
  ];

  longItems: BreadcrumbItem[] = [
    { label: 'Long text 1', action: this.nav('Long text 1') },
    { label: 'Long text 2', action: this.nav('Long text 2') },
    { label: 'Long text 3', action: this.nav('Long text 3') },
    { label: 'Long text 4', action: this.nav('Long text 4') },
    { label: 'Long text 5' },
  ];

  basicCode = `items: BreadcrumbItem[] = [
  { label: 'Home', routerLink: '/' },
  { label: 'Documents', routerLink: '/documents' },
  { label: 'Add Document' },   // last → current
];

// <hk-breadcrumbs [items]="items" />`;

  iconsCode = `items = [
  { label: 'Home', routerLink: '/', icon: 'house' },
  { label: 'Documents', routerLink: '/documents', icon: 'folder' },
  { label: 'Add Document', icon: 'file-text' },
];`;

  maxWidthCode = `<hk-breadcrumbs [items]="items" maxWidth="20rem" />`;

  autoCode = `// Annotate routes:
{ path: 'documents', data: { breadcrumb: 'Documents' }, children: [
  { path: ':id', component: DocComponent,
    data: { breadcrumb: (ctx) => ctx.params['id'] } },
]}

// Render — rebuilds on navigation:
<hk-breadcrumbs auto [home]="{ label: 'Home', routerLink: '/', icon: 'house' }" />

// Or use the service's signal directly:
trail = inject(BreadcrumbService).trail;   // Signal<BreadcrumbItem[]>`;
}
