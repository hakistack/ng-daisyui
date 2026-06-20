import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SidebarComponent } from './sidebar.component';
import { AppShellComponent } from './app-shell.component';
import { MenuConfig } from '../menu/menu.types';

const sampleMenu: MenuConfig = {
  items: [
    { label: 'Home', routerLink: '/home' },
    { label: 'About', routerLink: '/about' },
  ],
};

// ---------------------------------------------------------------------------
// hk-navbar
// ---------------------------------------------------------------------------

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NavbarComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders a navbar with the default aria-label and the three slots', () => {
    fixture.detectChanges();
    const nav = host.querySelector('nav.navbar');
    expect(nav).toBeTruthy();
    expect(nav?.getAttribute('aria-label')).toBe('Main');
    expect(host.querySelector('.navbar-start')).toBeTruthy();
    expect(host.querySelector('.navbar-center')).toBeTruthy();
    expect(host.querySelector('.navbar-end')).toBeTruthy();
  });

  it('hides the hamburger by default and shows it when enabled', () => {
    fixture.detectChanges();
    expect(host.querySelector('button[aria-label="Toggle navigation"]')).toBeNull();

    fixture.componentRef.setInput('showMenuToggle', true);
    fixture.detectChanges();
    expect(host.querySelector('button[aria-label="Toggle navigation"]')).toBeTruthy();
  });

  it('emits menuToggle when the hamburger is clicked', () => {
    let toggled = 0;
    fixture.componentRef.setInput('showMenuToggle', true);
    fixture.componentInstance.menuToggle.subscribe(() => toggled++);
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button[aria-label="Toggle navigation"]')!.click();
    expect(toggled).toBe(1);
  });

  it('applies sticky classes when sticky', () => {
    fixture.componentRef.setInput('sticky', true);
    fixture.detectChanges();
    expect(host.querySelector('nav.navbar')?.classList.contains('sticky')).toBe(true);
  });

  it('renders an embedded horizontal menu', () => {
    fixture.componentRef.setInput('menu', sampleMenu);
    fixture.detectChanges();
    const menuEl = host.querySelector('.navbar-center ul.menu');
    expect(menuEl?.classList.contains('menu-horizontal')).toBe(true);
    expect(host.querySelectorAll('.navbar-center a[role="menuitem"]').length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// hk-sidebar
// ---------------------------------------------------------------------------

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(SidebarComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders an aside with the menu and default aria-label', () => {
    fixture.componentRef.setInput('menu', sampleMenu);
    fixture.detectChanges();
    const aside = host.querySelector('aside.hk-sidebar');
    expect(aside).toBeTruthy();
    expect(aside?.getAttribute('aria-label')).toBe('Sidebar');
    expect(host.querySelectorAll('a[role="menuitem"]').length).toBe(2);
  });

  it('shows the collapse toggle only when collapsible and toggles the model', () => {
    fixture.detectChanges();
    expect(host.querySelector('button[aria-label="Collapse sidebar"]')).toBeNull();

    fixture.componentRef.setInput('collapsible', true);
    fixture.detectChanges();
    const btn = host.querySelector<HTMLButtonElement>('button[aria-label="Collapse sidebar"]')!;
    expect(btn).toBeTruthy();

    let lastCollapsed: boolean | undefined;
    fixture.componentInstance.collapsed.subscribe((v) => (lastCollapsed = v));
    btn.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.collapsed()).toBe(true);
    expect(lastCollapsed).toBe(true);
  });

  it('narrows to a rail width when collapsed', () => {
    fixture.componentRef.setInput('width', '20rem');
    fixture.detectChanges();
    const aside = host.querySelector<HTMLElement>('aside.hk-sidebar')!;
    expect(aside.style.width).toBe('20rem');

    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    expect(aside.style.width).toBe('4rem');
  });

  it('puts the border on the correct edge', () => {
    fixture.componentRef.setInput('side', 'end');
    fixture.detectChanges();
    expect(host.querySelector('aside.hk-sidebar')?.classList.contains('border-l')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hk-app-shell
// ---------------------------------------------------------------------------

describe('AppShellComponent', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppShellComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(AppShellComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders the drawer scaffold', () => {
    fixture.detectChanges();
    expect(host.querySelector('.drawer')).toBeTruthy();
    expect(host.querySelector('input.drawer-toggle')).toBeTruthy();
    expect(host.querySelector('.drawer-content')).toBeTruthy();
    expect(host.querySelector('.drawer-side')).toBeTruthy();
    expect(host.querySelector('label.drawer-overlay[aria-label="Close sidebar"]')).toBeTruthy();
    expect(host.querySelector('hk-navbar')).toBeTruthy();
    expect(host.querySelector('hk-sidebar')).toBeTruthy();
  });

  it('is permanent (drawer-open) at the breakpoint in push mode', () => {
    fixture.detectChanges();
    expect(host.querySelector('.drawer')?.classList.contains('lg:drawer-open')).toBe(true);

    fixture.componentRef.setInput('responsiveBreakpoint', 'md');
    fixture.detectChanges();
    const drawer = host.querySelector('.drawer')!;
    expect(drawer.classList.contains('md:drawer-open')).toBe(true);
    expect(drawer.classList.contains('lg:drawer-open')).toBe(false);
  });

  it('never sets drawer-open in overlay mode and traps focus when open', () => {
    fixture.componentRef.setInput('mode', 'overlay');
    fixture.detectChanges();
    expect(host.querySelector('.drawer')?.classList.contains('lg:drawer-open')).toBe(false);
    expect(fixture.componentInstance.trapActive()).toBe(false);

    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.trapActive()).toBe(true);
  });

  it('toggles the drawer from the navbar hamburger', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.drawerOpen()).toBe(false);
    host.querySelector<HTMLButtonElement>('button[aria-label="Toggle navigation"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.drawerOpen()).toBe(true);
    expect(host.querySelector<HTMLInputElement>('input.drawer-toggle')!.checked).toBe(true);
  });

  it('closes on Escape', () => {
    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.drawerOpen()).toBe(false);
  });

  it('closes the drawer when a sidebar item is selected', () => {
    fixture.componentRef.setInput('sidebar', { menu: sampleMenu });
    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();

    const sidebar = fixture.debugElement.query(By.directive(SidebarComponent)).componentInstance as SidebarComponent;
    sidebar.itemSelect.emit({ label: 'Home', routerLink: '/home' });
    fixture.detectChanges();
    expect(fixture.componentInstance.drawerOpen()).toBe(false);
  });
});
