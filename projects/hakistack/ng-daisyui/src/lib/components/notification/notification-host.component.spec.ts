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
