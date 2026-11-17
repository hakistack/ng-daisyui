import { TestBed } from '@angular/core/testing';

import { NotificationHostComponent } from './notification-host.component';
import { NotificationService } from './notification.service';

describe('NotificationHostComponent accessibility', () => {
  it('announces each notification once, through one named polite region', () => {
    TestBed.configureTestingModule({ imports: [NotificationHostComponent] });
    const fixture = TestBed.createComponent(NotificationHostComponent);
    const service = TestBed.inject(NotificationService);
    fixture.detectChanges();

    service.show({ title: 'Upload failed', message: 'Try again', severity: 'error', duration: 0 });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const region = root.querySelector('[role="region"]') as HTMLElement;
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-label')).toBe('Notifications');
    expect(root.querySelectorAll('[role="alert"]').length).toBe(0);
    expect(root.querySelectorAll('[aria-live]').length).toBe(1);
    expect(root.querySelector('hk-notification-item .sr-only')?.textContent).toContain('Error');
  });
});

describe('NotificationItemComponent auto-dismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup() {
    TestBed.configureTestingModule({ imports: [NotificationHostComponent] });
    const fixture = TestBed.createComponent(NotificationHostComponent);
    const service = TestBed.inject(NotificationService);
    fixture.detectChanges();
    service.show({ title: 'Saved', duration: 1000, pauseOnHover: false });
    fixture.detectChanges();
    const item = (fixture.nativeElement as HTMLElement).querySelector('hk-notification-item') as HTMLElement;
    return { fixture, service, item };
  }

  it('dismisses after its duration', () => {
    const { service } = setup();
    vi.advanceTimersByTime(1000);
    expect(service.notifications()[0]?.dismissing ?? true).toBe(true);
  });

  it('stays while keyboard focus is inside it, even with pauseOnHover off (WCAG 2.2.1)', () => {
    const { service, item } = setup();
    item.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].dismissing).toBeFalsy();

    item.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    vi.advanceTimersByTime(1000);
    expect(service.notifications()[0]?.dismissing ?? true).toBe(true);
  });
});
