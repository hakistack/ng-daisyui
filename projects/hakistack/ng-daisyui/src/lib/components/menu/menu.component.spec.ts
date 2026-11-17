import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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
    const labels = Array.from(host.querySelectorAll('a')).map((a) => a.textContent?.trim());
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
    setItems([item.group('Settings', [item.action('Account', () => {})], { expanded: true })]);
    const summary = host.querySelector('summary[role="menuitem"]');
    expect(summary?.getAttribute('aria-haspopup')).toBe('menu');
    expect(summary?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('details')?.open).toBe(true);
  });

  it('applies the horizontal modifier class', () => {
    fixture.componentRef.setInput('orientation', 'horizontal');
    setItems([item.link('A', '/a'), item.action('Run', () => {})]);
    expect(host.querySelector('ul.menu')?.classList.contains('menu-horizontal')).toBe(true);
    expect(host.querySelector('ul.menu')?.getAttribute('role')).toBe('menubar');
  });

  it('hides labels in collapsed rail mode', () => {
    fixture.componentRef.setInput('collapsed', true);
    setItems([item.link('Dashboard', '/dashboard')]);
    expect(host.querySelector('.hk-menu-label')).toBeNull();
    expect(host.querySelector('a')?.getAttribute('data-tip')).toBe('Dashboard');
  });

  it('opens a hover flyout with the group children in collapsed rail mode', () => {
    fixture.componentRef.setInput('collapsed', true);
    setItems([item.group('Admin', [item.link('Users', '/users'), item.link('Roles', '/roles')])]);

    const summary = host.querySelector<HTMLElement>('summary')!;
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

@Component({ template: '' })
class BlankPage {}

describe('MenuComponent semantics and keyboard (WAI-ARIA APG)', () => {
  let fixture: ComponentFixture<MenuComponent>;
  let host: HTMLElement;

  function render(items: MenuItem[], opts: { orientation?: 'horizontal' | 'vertical'; semantics?: 'navigation' | 'menu' } = {}): void {
    if (opts.orientation) fixture.componentRef.setInput('orientation', opts.orientation);
    fixture.componentRef.setInput('config', { items, semantics: opts.semantics });
    fixture.detectChanges();
    TestBed.tick();
  }

  function key(target: Element, k: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  }

  const tabStops = () => Array.from(host.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter((el) => el.tabIndex === 0);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [
        provideRouter([
          { path: '', component: BlankPage },
          { path: 'users', component: BlankPage },
        ]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuComponent);
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  it('renders a link-only menu as navigation: a plain list of links, no menu roles', () => {
    render([item.link('Home', '/'), item.group('Admin', [item.link('Users', '/users')], { expanded: true }), item.divider()]);
    expect(host.querySelector('ul.menu')?.hasAttribute('role')).toBe(false);
    expect(host.querySelector('[role="menuitem"], [role="menu"], [role="none"]')).toBeNull();
    expect(host.querySelector('summary')?.hasAttribute('aria-haspopup')).toBe(false);
    // Dividers are decoration inside a list, not separators.
    expect(host.querySelector('li[aria-hidden="true"]')).toBeTruthy();
    // Every link stays in the Tab order.
    expect(Array.from(host.querySelectorAll('a')).every((a) => !a.hasAttribute('tabindex'))).toBe(true);
  });

  it('marks the active route with aria-current="page" in navigation semantics', async () => {
    const router = TestBed.inject(Router);
    render([item.link('Home', '/'), item.link('Users', '/users')]);
    await router.navigateByUrl('/users');
    fixture.detectChanges();
    const users = Array.from(host.querySelectorAll('a')).find((a) => a.textContent?.includes('Users'));
    expect(users?.getAttribute('aria-current')).toBe('page');
  });

  it('can be forced to menu semantics, and switches to it as soon as an item is an action', () => {
    render([item.link('Home', '/')], { semantics: 'menu' });
    expect(host.querySelector('ul.menu')?.getAttribute('role')).toBe('menu');
    render([item.link('Home', '/'), item.action('Sign out', () => {})]);
    expect(host.querySelector('ul.menu')?.getAttribute('role')).toBe('menu');
  });

  it('gives a menu a single Tab stop that follows focus (roving tabindex)', () => {
    render([item.action('New', () => {}), item.action('Open', () => {}), item.action('Save', () => {})]);
    expect(tabStops().map((el) => el.textContent?.trim())).toEqual(['New']);

    const items = host.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items[0].focus();
    key(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    expect(tabStops()).toEqual([items[1]]);

    key(items[1], 'End');
    expect(document.activeElement).toBe(items[2]);
    key(items[2], 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);
  });

  it('menubar: ← → move between top-level items, ↓ opens a group on its first item, Escape returns', async () => {
    render(
      [
        item.group('File', [item.action('New', () => {}), item.action('Open', () => {})]),
        item.group('Edit', [item.action('Undo', () => {})]),
        item.action('Help', () => {}),
      ],
      { orientation: 'horizontal' },
    );
    const top = () => Array.from(host.querySelectorAll<HTMLElement>('ul.menu > li > details > summary, ul.menu > li > button'));
    const [file, edit, help] = top();
    expect(tabStops()).toEqual([file]);

    file.focus();
    key(file, 'ArrowRight');
    expect(document.activeElement).toBe(edit);
    key(edit, 'ArrowRight');
    expect(document.activeElement).toBe(help);
    key(help, 'ArrowRight');
    expect(document.activeElement).toBe(file);
    // Up/Down on a menubar item must not scroll the page or move along the bar.
    const down = key(file, 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    await Promise.resolve();
    fixture.detectChanges();
    expect((file.parentElement as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement?.textContent?.trim()).toBe('New');

    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.textContent?.trim()).toBe('Open');
    key(document.activeElement!, 'Escape');
    expect((file.parentElement as HTMLDetailsElement).open).toBe(false);
    expect(document.activeElement).toBe(file);
  });

  it('menubar: → inside a submenu closes it and moves to the next top-level item', async () => {
    render([item.group('File', [item.action('New', () => {})]), item.action('Help', () => {})], { orientation: 'horizontal' });
    const file = host.querySelector<HTMLElement>('summary')!;
    file.focus();
    key(file, 'ArrowDown');
    await Promise.resolve();
    fixture.detectChanges();
    key(document.activeElement!, 'ArrowRight');
    expect((file.parentElement as HTMLDetailsElement).open).toBe(false);
    expect(document.activeElement?.textContent?.trim()).toBe('Help');
  });

  it('navigation semantics leave arrow keys to the page', () => {
    render([item.link('Home', '/'), item.link('Users', '/users')]);
    const link = host.querySelector('a')!;
    link.focus();
    expect(key(link, 'ArrowDown').defaultPrevented).toBe(false);
  });
});

describe('processMenuItems ids', () => {
  it('keeps generated ids stable when the same items are processed again', () => {
    const items = [
      { label: 'Home', routerLink: '/' },
      { label: 'Settings', children: [{ label: 'Profile', routerLink: '/p' }] },
    ];
    const first = processMenuItems(items);
    const second = processMenuItems(items);
    expect(second[0].id).toBe(first[0].id);
    expect(second[1].children![0].id).toBe(first[1].children![0].id);
  });
});
