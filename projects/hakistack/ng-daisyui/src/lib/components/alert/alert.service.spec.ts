import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertService } from './alert.service';
import { AlertResult } from './alert.types';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(AlertService);
  });

  afterEach(() => {
    document.body.querySelectorAll('hk-alert-container').forEach((el) => el.remove());
  });

  it('settles the previous alert as dismissed when a new alert replaces it', async () => {
    const first = service.show({ title: 'First' });
    // Let show() reach showInternal (it awaits an optional htmlUrl fetch first).
    await Promise.resolve();
    void service.show({ title: 'Second' });

    const result = await Promise.race<AlertResult | 'pending'>([
      first,
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 50)),
    ]);

    expect(result).toEqual({ isConfirmed: false, isDismissed: true, isCancelled: false, dismissReason: 'close' });
  });
});
