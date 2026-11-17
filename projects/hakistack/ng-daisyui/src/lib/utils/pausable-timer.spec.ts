import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ApplicationRef, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { attachToBody } from './body-host';
import { createPausableTimer } from './pausable-timer';

describe('createPausableTimer', () => {
  let clock = 0;
  const now = () => clock;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
  });
  afterEach(() => vi.useRealTimers());

  function advance(ms: number): void {
    clock += ms;
    vi.advanceTimersByTime(ms);
  }

  it('expires after the given time', () => {
    const expired = vi.fn();
    createPausableTimer(expired, now).start(1000);
    advance(999);
    expect(expired).not.toHaveBeenCalled();
    advance(1);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('freezes the remaining time while held and resumes with it', () => {
    const expired = vi.fn();
    const timer = createPausableTimer(expired, now);
    timer.start(1000);
    advance(400);
    expect(timer.hold('hover')).toBe(true);
    advance(5000);
    expect(expired).not.toHaveBeenCalled();
    expect(timer.remaining()).toBe(600);

    expect(timer.release('hover')).toBe(600);
    advance(599);
    expect(expired).not.toHaveBeenCalled();
    advance(1);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('resumes only when every reason is released', () => {
    const timer = createPausableTimer(vi.fn(), now);
    timer.start(1000);
    timer.hold('hover');
    expect(timer.hold('focus')).toBe(false);
    expect(timer.release('hover')).toBeNull();
    expect(timer.isHeld()).toBe(true);
    expect(timer.isRunning()).toBe(false);
    expect(timer.release('focus')).toBe(1000);
    expect(timer.isRunning()).toBe(true);
  });

  it('never resumes with less than minRemaining', () => {
    const timer = createPausableTimer(vi.fn(), now);
    timer.start(1000);
    advance(950);
    timer.hold('hover');
    expect(timer.release('hover', 1000)).toBe(1000);
  });

  it('ignores releases of reasons it does not hold, and anything after cancel', () => {
    const expired = vi.fn();
    const timer = createPausableTimer(expired, now);
    timer.start(1000);
    expect(timer.release('focus')).toBeNull();
    timer.hold('hover');
    timer.cancel();
    expect(timer.release('hover')).toBeNull();
    advance(5000);
    expect(expired).not.toHaveBeenCalled();
  });
});

@Component({ selector: 'hk-test-body-host', template: '<p>hosted</p>' })
class HostedComponent {}

describe('attachToBody', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('appends the component to <body> and removes it on destroy', () => {
    const host = attachToBody(HostedComponent, TestBed.inject(ApplicationRef), TestBed.inject(EnvironmentInjector));
    const el = host.ref.location.nativeElement as HTMLElement;
    expect(el.parentElement).toBe(document.body);
    expect(TestBed.inject(ApplicationRef).viewCount).toBeGreaterThan(0);

    host.destroy();
    expect(el.isConnected).toBe(false);
    expect(() => host.destroy()).not.toThrow();
  });
});
