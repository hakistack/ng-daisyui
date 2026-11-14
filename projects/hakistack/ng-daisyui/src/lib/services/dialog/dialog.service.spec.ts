import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DialogService } from './dialog.service';

@Component({ selector: 'hk-test-dialog-content', template: 'content' })
class ContentComponent {}

describe('DialogService', () => {
  it('closes openRaw() dialogs on router navigation, like open() dialogs', () => {
    const events = new Subject<unknown>();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { events } }] });
    const service = TestBed.inject(DialogService);

    const raw = service.openRaw(ContentComponent);
    let closed = false;
    raw.closed.subscribe(() => (closed = true));

    events.next(new NavigationStart(1, '/elsewhere'));
    expect(closed).toBe(true);
  });

  it('works without a Router', () => {
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: null }] });
    const service = TestBed.inject(DialogService);
    const ref = service.openRaw(ContentComponent);
    expect(ref).toBeTruthy();
    ref.close();
  });
});
