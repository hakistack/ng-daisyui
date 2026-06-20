import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuComponent } from './menu.component';
import { collectGroupIds, createMenu, findMenuItem, inferMenuItemKind, isMenuItemVisible, item, processMenuItems } from './menu.helpers';
import { MenuItem } from './menu.types';

// ---------------------------------------------------------------------------
// Helpers (pure)
// ---------------------------------------------------------------------------

describe('menu helpers', () => {
  it('infers item kind from fields', () => {
    expect(inferMenuItemKind({ label: 'A', routerLink: '/a' })).toBe('link');
    expect(inferMenuItemKind({ label: 'B', href: 'https://x' })).toBe('link');
    expect(inferMenuItemKind({ label: 'C', action: () => {} })).toBe('action');
    expect(inferMenuItemKind({ label: 'D', children: [{ label: 'd1' }] })).toBe('group');
    expect(inferMenuItemKind({})).toBe('divider');
    expect(inferMenuItemKind({ label: 'T', kind: 'title' })).toBe('title');
  });

  it('resolves visibility predicates', () => {
    expect(isMenuItemVisible({ label: 'A' })).toBe(true);
    expect(isMenuItemVisible({ label: 'A', visible: false })).toBe(false);
    expect(isMenuItemVisible({ label: 'A', visible: () => false })).toBe(false);
    expect(isMenuItemVisible({ label: 'A', visible: () => true })).toBe(true);
  });

  it('assigns ids and prunes hidden items and empty groups', () => {
    const items: MenuItem[] = [
      { label: 'Visible', routerLink: '/v' },
      { label: 'Hidden', routerLink: '/h', visible: false },
      { label: 'Empty group', children: [{ label: 'child', visible: false }] },
      { label: 'Kept group', children: [{ label: 'kid', routerLink: '/k' }] },
    ];
    const processed = processMenuItems(items);
    expect(processed.map((i) => i.label)).toEqual(['Visible', 'Kept group']);
    expect(processed.every((i) => !!i.id)).toBe(true);
    expect(processed[1].children?.[0].id).toBeTruthy();
  });

  it('preserves explicit ids', () => {
    const processed = processMenuItems([{ id: 'fixed', label: 'A', routerLink: '/a' }]);
    expect(processed[0].id).toBe('fixed');
  });

  it('finds items and collects group ids', () => {
    const items: MenuItem[] = [{ id: 'g', label: 'Group', children: [{ id: 'c', label: 'Child', routerLink: '/c' }] }];
    expect(findMenuItem(items, 'c')?.label).toBe('Child');
    expect(findMenuItem(items, 'missing')).toBeUndefined();
    expect(collectGroupIds(items)).toEqual(['g']);
  });

  it('item factory produces correctly-typed items', () => {
    expect(item.link('A', '/a', { icon: 'house' })).toMatchObject({ label: 'A', routerLink: '/a', kind: 'link', icon: 'house' });
    expect(item.external('Ext', 'https://x')).toMatchObject({ href: 'https://x', target: '_blank', kind: 'link' });
    const act = item.action('Run', () => {});
    expect(act.kind).toBe('action');
    expect(typeof act.action).toBe('function');
    expect(item.group('G', [item.link('c', '/c')]).children?.length).toBe(1);
    expect(item.divider().kind).toBe('divider');
  });
});

// ---------------------------------------------------------------------------
// createMenu controller
// ---------------------------------------------------------------------------

describe('createMenu', () => {
  it('applies orientation-aware defaults', () => {
    const vertical = createMenu({ items: [] });
    expect(vertical.config().orientation).toBe('vertical');
    expect(vertical.config().accordion).toBe(false);

    const horizontal = createMenu({ items: [], orientation: 'horizontal' });
    expect(horizontal.config().accordion).toBe(true);
    expect(horizontal.config().closeOnOutsideClick).toBe(true);
  });

  it('drives collapsed state reactively', () => {
    const menu = createMenu({ items: [] });
    expect(menu.collapsed()).toBe(false);
    menu.setCollapsed(true);
    expect(menu.collapsed()).toBe(true);
    expect(menu.config().collapsed).toBe(true);
  });

  it('find() locates items in the source tree', () => {
    const menu = createMenu({ items: [item.group('G', [item.link('C', '/c', { id: 'c' })])] });
    expect(menu.find('c')?.label).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;
  let host: HTMLElement;

  function setItems(items: MenuItem[]): void {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    host = fixture.nativeElement as HTMLElement;
  });

  it('renders links, titles and dividers', () => {
    setItems([item.title('Section'), item.link('Dashboard', '/dashboard'), item.divider(), item.action('Run', () => {})]);

    expect(host.querySelector('.menu-title')?.textContent).toContain('Section');
    expect(host.querySelector('a[role="menuitem"]')?.textContent).toContain('Dashboard');
    expect(host.querySelector('li[role="separator"]')).toBeTruthy();
    expect(host.querySelector('button[role="menuitem"]')?.textContent).toContain('Run');
  });

  it('renders badges and shortcuts', () => {
    setItems([item.link('Inbox', '/inbox', { badge: 7, shortcut: '⌘I' })]);
    expect(host.querySelector('.badge')?.textContent).toContain('7');
    expect(host.querySelector('kbd')?.textContent).toContain('⌘I');
  });

  it('hides items failing the visibility predicate', () => {
    setItems([item.link('Shown', '/a'), item.link('Gone', '/b', { visible: false })]);
    const labels = Array.from(host.querySelectorAll('a[role="menuitem"]')).map((a) => a.textContent?.trim());
    expect(labels).toContain('Shown');
    expect(labels).not.toContain('Gone');
  });

  it('emits itemSelect when a leaf is activated, runs the item action, and skips disabled', () => {
    const selected: string[] = [];
    let actionRan = false;
    fixture.componentRef.setInput('items', [
      item.action('Go', () => (actionRan = true)),
      item.action('Nope', () => {}, { disabled: true }),
    ]);
    fixture.componentInstance.itemSelect.subscribe((i) => selected.push(i.label ?? ''));
    fixture.detectChanges();

    const buttons = host.querySelectorAll('button[role="menuitem"]');
    (buttons[0] as HTMLButtonElement).click();
    expect(actionRan).toBe(true);
    expect(selected).toEqual(['Go']);

    // disabled button is rendered disabled → click is a no-op
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders a collapsible group with aria-expanded reflecting open state', () => {
    setItems([item.group('Settings', [item.link('Account', '/account')], { expanded: true })]);
    const summary = host.querySelector('summary[role="menuitem"]');
    expect(summary?.getAttribute('aria-haspopup')).toBe('menu');
    expect(summary?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('details')?.open).toBe(true);
  });

  it('applies the horizontal modifier class', () => {
    fixture.componentRef.setInput('orientation', 'horizontal');
    setItems([item.link('A', '/a')]);
    expect(host.querySelector('ul.menu')?.classList.contains('menu-horizontal')).toBe(true);
    expect(host.querySelector('ul.menu')?.getAttribute('role')).toBe('menubar');
  });

  it('hides labels in collapsed rail mode', () => {
    fixture.componentRef.setInput('collapsed', true);
    setItems([item.link('Dashboard', '/dashboard')]);
    expect(host.querySelector('.hk-menu-label')).toBeNull();
    expect(host.querySelector('a[role="menuitem"]')?.getAttribute('data-tip')).toBe('Dashboard');
  });

  it('opens a hover flyout with the group children in collapsed rail mode', () => {
    fixture.componentRef.setInput('collapsed', true);
    setItems([item.group('Admin', [item.link('Users', '/users'), item.link('Roles', '/roles')])]);

    const summary = host.querySelector<HTMLElement>('summary[role="menuitem"]')!;
    summary.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();

    const overlay = document.querySelector('.cdk-overlay-container');
    expect(overlay?.textContent).toContain('Users');
    expect(overlay?.textContent).toContain('Roles');

    // Closes programmatically.
    fixture.componentInstance['closeFlyout']();
    fixture.detectChanges();
    expect(fixture.componentInstance['flyoutGroup']()).toBeNull();
  });
});
