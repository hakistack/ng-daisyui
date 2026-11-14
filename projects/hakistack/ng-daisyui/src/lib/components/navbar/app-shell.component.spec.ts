import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LucideMenu, provideLucideIcons } from '@lucide/angular';
import { of } from 'rxjs';

import { AppShellComponent } from './app-shell.component';

function setup(belowBreakpoint: boolean) {
  TestBed.configureTestingModule({
    imports: [AppShellComponent],
    providers: [
      provideRouter([]),
      provideLucideIcons(LucideMenu),
      { provide: BreakpointObserver, useValue: { observe: () => of({ matches: belowBreakpoint, breakpoints: {} } as BreakpointState) } },
    ],
  });
  const fixture = TestBed.createComponent(AppShellComponent);
  fixture.detectChanges();
  return fixture;
}

describe('AppShellComponent accessibility', () => {
  it('traps focus in an open push-mode drawer below the breakpoint (it renders as an overlay there)', () => {
    const fixture = setup(true);
    fixture.componentRef.setInput('mode', 'push');
    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.trapActive()).toBe(true);
  });

  it('does not trap focus in push mode at or above the breakpoint (the drawer is permanent)', () => {
    const fixture = setup(false);
    fixture.componentRef.setInput('mode', 'push');
    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.trapActive()).toBe(false);
  });

  it('exposes the drawer state on the hamburger (aria-expanded / aria-controls)', () => {
    const fixture = setup(true);
    const button = () => fixture.nativeElement.querySelector('button[aria-label="Toggle navigation"]') as HTMLButtonElement;
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(button().getAttribute('aria-controls')!)).toBeTruthy();

    fixture.componentInstance.drawerOpen.set(true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-expanded')).toBe('true');
  });
});
