import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BreadcrumbsComponent } from './breadcrumbs.component';
import { BreadcrumbService } from './breadcrumbs.service';
import { BreadcrumbItem } from './breadcrumbs.types';

@Component({ template: '' })
class DummyComponent {}

const ROUTES = [
  {
    path: 'docs',
    data: { breadcrumb: 'Docs' },
    children: [
      { path: '', component: DummyComponent },
      {
        path: ':id',
        component: DummyComponent,
        data: { breadcrumb: (ctx: { params: Record<string, string> }) => `Doc ${ctx.params['id']}` },
      },
    ],
  },
  { path: 'plain', component: DummyComponent }, // no breadcrumb data → no crumb
];

// ---------------------------------------------------------------------------
// Manual mode
// ---------------------------------------------------------------------------

describe('BreadcrumbsComponent (manual)', () => {
  let fixture: ComponentFixture<BreadcrumbsComponent>;
  let host: HTMLElement;

  function setItems(items: BreadcrumbItem[]): void {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BreadcrumbsComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(BreadcrumbsComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders a nav + ol with the crumbs', () => {
    setItems([{ label: 'Home', routerLink: '/' }, { label: 'Docs', routerLink: '/docs' }, { label: 'Add' }]);
    expect(host.querySelector('nav.breadcrumbs')?.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(host.querySelectorAll('ol > li').length).toBe(3);
    expect(host.querySelectorAll('a').length).toBe(2);
  });

  it('marks the last crumb current (aria-current, non-link)', () => {
    setItems([{ label: 'Home', routerLink: '/' }, { label: 'Add Document' }]);
    const current = host.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain('Add Document');
    expect(current?.tagName).toBe('SPAN');
  });

  it('respects an explicit current flag', () => {
    setItems([
      { label: 'Home', routerLink: '/', current: true },
      { label: 'Docs', routerLink: '/docs' },
    ]);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toContain('Home');
  });

  it('emits itemSelect on click and skips disabled', () => {
    const picked: string[] = [];
    fixture.componentRef.setInput('items', [
      { label: 'Run', action: () => picked.push('action') },
      { label: 'Nope', disabled: true, action: () => picked.push('nope') },
      { label: 'Current' },
    ]);
    fixture.componentInstance.itemSelect.subscribe((i) => picked.push(i.label ?? ''));
    fixture.detectChanges();

    // First crumb is an action span (no href/routerLink) → click fires.
    host.querySelectorAll<HTMLElement>('ol > li > *')[0].click();
    expect(picked).toContain('action');
    expect(picked).toContain('Run');
    expect(picked).not.toContain('nope');
  });

  it('applies the size class and max-width', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.componentRef.setInput('maxWidth', '20rem');
    setItems([{ label: 'A' }]);
    const nav = host.querySelector<HTMLElement>('nav.breadcrumbs')!;
    expect(nav.classList.contains('text-lg')).toBe(true);
    expect(nav.style.maxWidth).toBe('20rem');
  });
});

// ---------------------------------------------------------------------------
// Automatic (router) mode
// ---------------------------------------------------------------------------

describe('BreadcrumbService + auto mode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(ROUTES)] });
  });

  it('builds a trail from route data with accumulated URLs and dynamic labels', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/docs/42');

    const trail = TestBed.inject(BreadcrumbService).build();
    expect(trail.map((c) => c.label)).toEqual(['Docs', 'Doc 42']);
    expect(trail.map((c) => c.routerLink)).toEqual(['/docs', '/docs/42']);
    expect(trail[trail.length - 1].current).toBe(true);
  });

  it('skips routes without breadcrumb data', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/plain');
    expect(TestBed.inject(BreadcrumbService).build()).toEqual([]);
  });

  it('renders the router trail with home prepended in auto mode', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/docs/42');

    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    const host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('auto', true);
    fixture.componentRef.setInput('home', { label: 'Home', routerLink: '/' });
    fixture.detectChanges();

    const labels = Array.from(host.querySelectorAll('ol > li')).map((li) => li.textContent?.trim());
    expect(labels[0]).toContain('Home');
    expect(labels.join(' ')).toContain('Docs');
    expect(labels.join(' ')).toContain('Doc 42');
    expect(host.querySelector('[aria-current="page"]')?.textContent).toContain('Doc 42');
  });
});
