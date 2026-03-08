import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';
import { DEFAULT_TOAST_CONFIG, provideToast, TOAST_CONFIG, ToastGlobalConfig } from './toast.config';
import { Toast, ToastAction, ToastPosition, ToastSeverity } from './toast.types';

// ---------------------------------------------------------------------------
// ToastService
// ---------------------------------------------------------------------------
describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  // ── Creation & defaults ───────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with no toasts', () => {
    expect(service.toasts().length).toBe(0);
    expect(service.hasToasts()).toBe(false);
  });

  it('should use default config when no custom config is provided', () => {
    expect(service.config.maxToasts).toBe(DEFAULT_TOAST_CONFIG.maxToasts);
    expect(service.config.defaultLife).toBe(DEFAULT_TOAST_CONFIG.defaultLife);
    expect(service.config.position).toBe(DEFAULT_TOAST_CONFIG.position);
    expect(service.config.preventDuplicates).toBe(DEFAULT_TOAST_CONFIG.preventDuplicates);
  });

  // ── show() ────────────────────────────────────────────────────────────

  describe('show()', () => {
    it('should add a toast and return its id', () => {
      const id = service.show({ severity: 'info', summary: 'Hello' });
      expect(id).toBeTruthy();
      expect(service.toasts().length).toBe(1);
      expect(service.hasToasts()).toBe(true);
    });

    it('should set default values for optional fields', () => {
      service.show({ severity: 'success', summary: 'OK' });
      const toast = service.toasts()[0];
      expect(toast.sticky).toBe(false);
      expect(toast.soft).toBe(false);
      expect(toast.pauseOnHover).toBe(DEFAULT_TOAST_CONFIG.pauseOnHover);
      expect(toast.tapToDismiss).toBe(DEFAULT_TOAST_CONFIG.tapToDismiss);
      expect(toast.dismissing).toBe(false);
      expect(toast.isPaused).toBe(false);
      expect(toast.life).toBe(DEFAULT_TOAST_CONFIG.defaultLife);
    });

    it('should use custom life when provided', () => {
      service.show({ severity: 'info', summary: 'Hello', life: 10000 });
      expect(service.toasts()[0].life).toBe(10000);
    });

    it('should store summary and detail', () => {
      service.show({ severity: 'info', summary: 'Title', detail: 'Description' });
      const toast = service.toasts()[0];
      expect(toast.summary).toBe('Title');
      expect(toast.detail).toBe('Description');
    });

    it('should support sticky toasts', () => {
      service.show({ severity: 'warning', summary: 'Sticky', sticky: true });
      expect(service.toasts()[0].sticky).toBe(true);
    });

    it('should support soft variant', () => {
      service.show({ severity: 'info', summary: 'Soft', soft: true });
      expect(service.toasts()[0].soft).toBe(true);
    });

    it('should store actions on the toast', () => {
      const actions: ToastAction[] = [
        { label: 'Undo', onClick: () => {} },
        { label: 'Dismiss', onClick: () => {}, style: 'ghost' },
      ];
      service.show({ severity: 'info', summary: 'With actions', actions });
      expect(service.toasts()[0].actions).toHaveLength(2);
      expect(service.toasts()[0].actions![0].label).toBe('Undo');
    });

    it('should store onTap callback', () => {
      const onTap = vi.fn();
      service.show({ severity: 'info', summary: 'Tappable', onTap });
      expect(service.toasts()[0].onTap).toBe(onTap);
    });
  });

  // ── Convenience methods ───────────────────────────────────────────────

  describe('convenience methods', () => {
    it('success() should create a toast with success severity', () => {
      const id = service.success('Done!');
      expect(id).toBeTruthy();
      expect(service.toasts()[0].severity).toBe('success');
      expect(service.toasts()[0].summary).toBe('Done!');
    });

    it('error() should create a toast with error severity', () => {
      service.error('Failed', 'Something went wrong');
      const toast = service.toasts()[0];
      expect(toast.severity).toBe('error');
      expect(toast.summary).toBe('Failed');
      expect(toast.detail).toBe('Something went wrong');
    });

    it('warning() should create a toast with warning severity', () => {
      service.warning('Caution');
      expect(service.toasts()[0].severity).toBe('warning');
    });

    it('info() should create a toast with info severity', () => {
      service.info('FYI');
      expect(service.toasts()[0].severity).toBe('info');
    });

    it('convenience methods should forward extra options', () => {
      service.success('Done', undefined, { sticky: true, soft: true });
      const toast = service.toasts()[0];
      expect(toast.sticky).toBe(true);
      expect(toast.soft).toBe(true);
    });
  });

  // ── networkStatus ─────────────────────────────────────────────────────

  describe('networkStatus()', () => {
    it('should show success toast for online status', () => {
      service.networkStatus('online');
      const toast = service.toasts()[0];
      expect(toast.severity).toBe('success');
      expect(toast.summary).toContain('online');
    });

    it('should show error toast for offline status', () => {
      service.networkStatus('offline');
      const toast = service.toasts()[0];
      expect(toast.severity).toBe('error');
      expect(toast.summary).toContain('offline');
    });
  });

  // ── dismiss() ─────────────────────────────────────────────────────────

  describe('dismiss()', () => {
    it('should mark the toast as dismissing', () => {
      const id = service.show({ severity: 'info', summary: 'Bye' });
      service.dismiss(id);
      const toast = service.toasts().find(t => t.id === id);
      expect(toast?.dismissing).toBe(true);
    });

    it('should remove the toast after exit duration', () => {
      const id = service.show({ severity: 'info', summary: 'Bye' });
      service.dismiss(id);
      expect(service.toasts().length).toBe(1); // still present (animating)

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50);
      expect(service.toasts().length).toBe(0);
    });

    it('should not throw when dismissing a non-existent id', () => {
      expect(() => service.dismiss('non-existent')).not.toThrow();
    });

    it('should not dismiss an already-dismissing toast again', () => {
      const id = service.show({ severity: 'info', summary: 'Bye' });
      service.dismiss(id);
      service.dismiss(id); // second dismiss should be a no-op

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50);
      expect(service.toasts().length).toBe(0);
    });
  });

  // ── clear() ───────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('should remove all toasts immediately', () => {
      service.show({ severity: 'info', summary: 'A' });
      service.show({ severity: 'success', summary: 'B' });
      service.show({ severity: 'error', summary: 'C' });
      expect(service.toasts().length).toBe(3);

      service.clear();
      expect(service.toasts().length).toBe(0);
      expect(service.hasToasts()).toBe(false);
    });
  });

  // ── Auto-dismiss timer ────────────────────────────────────────────────

  describe('auto-dismiss timer', () => {
    it('should auto-dismiss after the toast life expires', () => {
      service.show({ severity: 'info', summary: 'Temp', life: 1000 });
      expect(service.toasts().length).toBe(1);

      vi.advanceTimersByTime(1000); // timer fires dismiss
      expect(service.toasts()[0]?.dismissing).toBe(true);

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50); // exit animation
      expect(service.toasts().length).toBe(0);
    });

    it('should not auto-dismiss sticky toasts', () => {
      service.show({ severity: 'info', summary: 'Sticky', sticky: true, life: 500 });
      vi.advanceTimersByTime(1000);
      expect(service.toasts().length).toBe(1);
      expect(service.toasts()[0].dismissing).toBe(false);
    });
  });

  // ── Pause / Resume auto-dismiss ───────────────────────────────────────

  describe('pauseAutoDismiss() / resumeAutoDismiss()', () => {
    it('should pause and mark the toast as paused', () => {
      const id = service.show({ severity: 'info', summary: 'Hover me', life: 3000 });
      vi.advanceTimersByTime(500); // let some time pass

      service.pauseAutoDismiss(id);
      const toast = service.toasts().find(t => t.id === id);
      expect(toast?.isPaused).toBe(true);

      // Should NOT dismiss while paused even after original life
      vi.advanceTimersByTime(5000);
      expect(service.toasts().find(t => t.id === id)).toBeTruthy();
      expect(service.toasts().find(t => t.id === id)?.dismissing).toBe(false);

      // Clean up
      service.clear();
    });

    it('should resume after pause and eventually dismiss', () => {
      const id = service.show({ severity: 'info', summary: 'Hover me', life: 3000, pauseOnHover: true });
      vi.advanceTimersByTime(500);

      service.pauseAutoDismiss(id);
      vi.advanceTimersByTime(1000); // paused for 1 second

      service.resumeAutoDismiss(id);
      const toast = service.toasts().find(t => t.id === id);
      expect(toast?.isPaused).toBe(false);

      // After extended timeout, should auto-dismiss
      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.extendedTimeOut + 50);
      const dismissing = service.toasts().find(t => t.id === id);
      expect(dismissing?.dismissing).toBe(true);

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50);
      expect(service.toasts().find(t => t.id === id)).toBeUndefined();
    });

    it('should be a no-op when pausing a non-existent toast', () => {
      expect(() => service.pauseAutoDismiss('fake-id')).not.toThrow();
    });

    it('should be a no-op when resuming a non-existent toast', () => {
      expect(() => service.resumeAutoDismiss('fake-id')).not.toThrow();
    });
  });

  // ── handleToastClick() ────────────────────────────────────────────────

  describe('handleToastClick()', () => {
    it('should invoke onTap callback', () => {
      const onTap = vi.fn();
      const id = service.show({ severity: 'info', summary: 'Click me', onTap });
      service.handleToastClick(id);
      expect(onTap).toHaveBeenCalledOnce();
    });

    it('should dismiss on click when tapToDismiss is true', () => {
      const id = service.show({ severity: 'info', summary: 'Tap', tapToDismiss: true });
      service.handleToastClick(id);
      expect(service.toasts()[0].dismissing).toBe(true);

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50);
      expect(service.toasts().length).toBe(0);
    });

    it('should not dismiss on click when tapToDismiss is false', () => {
      const id = service.show({ severity: 'info', summary: 'No tap' });
      service.handleToastClick(id);
      expect(service.toasts()[0].dismissing).toBe(false);
    });

    it('should not throw when clicking a non-existent toast', () => {
      expect(() => service.handleToastClick('fake')).not.toThrow();
    });
  });

  // ── handleActionClick() ───────────────────────────────────────────────

  describe('handleActionClick()', () => {
    it('should invoke the action onClick callback', () => {
      const onClick = vi.fn();
      const action: ToastAction = { label: 'Undo', onClick };
      const id = service.show({ severity: 'info', summary: 'Action', actions: [action] });
      service.handleActionClick(id, action);
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should dismiss by default after action click', () => {
      const onClick = vi.fn();
      const action: ToastAction = { label: 'Confirm', onClick };
      service.show({ severity: 'info', summary: 'Action', actions: [action] });
      service.handleActionClick(service.toasts()[0].id, action);
      expect(service.toasts()[0].dismissing).toBe(true);

      vi.advanceTimersByTime(DEFAULT_TOAST_CONFIG.exitDuration + 50);
      expect(service.toasts().length).toBe(0);
    });

    it('should NOT dismiss when dismissOnClick is false', () => {
      const onClick = vi.fn();
      const action: ToastAction = { label: 'Keep', onClick, dismissOnClick: false };
      service.show({ severity: 'info', summary: 'Action', actions: [action] });
      service.handleActionClick(service.toasts()[0].id, action);
      expect(onClick).toHaveBeenCalledOnce();
      expect(service.toasts()[0].dismissing).toBe(false);
    });
  });

  // ── Duplicate prevention ──────────────────────────────────────────────

  describe('duplicate prevention', () => {
    it('should prevent duplicate toasts with same severity and summary', () => {
      const id1 = service.show({ severity: 'info', summary: 'Same' });
      const id2 = service.show({ severity: 'info', summary: 'Same' });
      expect(id1).toBe(id2);
      expect(service.toasts().length).toBe(1);
    });

    it('should allow different summaries with same severity', () => {
      service.show({ severity: 'info', summary: 'First' });
      service.show({ severity: 'info', summary: 'Second' });
      expect(service.toasts().length).toBe(2);
    });

    it('should allow same summary with different severity', () => {
      service.show({ severity: 'info', summary: 'Same' });
      service.show({ severity: 'error', summary: 'Same' });
      expect(service.toasts().length).toBe(2);
    });
  });

  // ── Max toasts ────────────────────────────────────────────────────────

  describe('max toasts limit', () => {
    it('should enforce maxToasts limit and auto-dismiss oldest', () => {
      const max = service.config.maxToasts; // default 5
      for (let i = 0; i < max + 1; i++) {
        service.show({ severity: 'info', summary: `Toast ${i}` });
      }
      // Should have dismissed the oldest to fit the new one
      expect(service.toasts().length).toBe(max);
      // The first toast should have been replaced
      expect(service.toasts()[0].summary).toBe('Toast 1');
    });
  });

  // ── Multiple toasts (stacking) ────────────────────────────────────────

  describe('toast stacking', () => {
    it('should allow multiple toasts of different types to coexist', () => {
      service.success('Success');
      service.error('Error');
      service.info('Info');
      service.warning('Warning');
      expect(service.toasts().length).toBe(4);
    });

    it('should maintain order of toasts', () => {
      service.show({ severity: 'info', summary: 'First' });
      service.show({ severity: 'info', summary: 'Second' });
      service.show({ severity: 'info', summary: 'Third' });
      expect(service.toasts()[0].summary).toBe('First');
      expect(service.toasts()[1].summary).toBe('Second');
      expect(service.toasts()[2].summary).toBe('Third');
    });
  });
});

// ---------------------------------------------------------------------------
// ToastService with custom config via provideToast
// ---------------------------------------------------------------------------
describe('ToastService with provideToast', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideToast({
          maxToasts: 2,
          position: 'top-end',
          defaultLife: 2000,
          preventDuplicates: false,
          tapToDismiss: true,
        }),
      ],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  it('should use custom config values', () => {
    expect(service.config.maxToasts).toBe(2);
    expect(service.config.position).toBe('top-end');
    expect(service.config.defaultLife).toBe(2000);
    expect(service.config.tapToDismiss).toBe(true);
  });

  it('should use custom defaultLife for toasts', () => {
    service.show({ severity: 'info', summary: 'Custom life' });
    expect(service.toasts()[0].life).toBe(2000);
  });

  it('should allow duplicates when preventDuplicates is false', () => {
    service.show({ severity: 'info', summary: 'Dup' });
    service.show({ severity: 'info', summary: 'Dup' });
    expect(service.toasts().length).toBe(2);
  });

  it('should respect custom maxToasts', () => {
    service.show({ severity: 'info', summary: 'One' });
    service.show({ severity: 'info', summary: 'Two' });
    service.show({ severity: 'info', summary: 'Three' });
    // Max is 2, oldest should be auto-dismissed
    expect(service.toasts().length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// provideToast helper
// ---------------------------------------------------------------------------
describe('provideToast()', () => {
  it('should create environment providers', () => {
    const providers = provideToast({ position: 'top-center' });
    expect(providers).toBeTruthy();
  });

  it('should merge with default config', () => {
    TestBed.configureTestingModule({
      providers: [provideToast({ position: 'top-center' })],
    });
    const config = TestBed.inject(TOAST_CONFIG) as ToastGlobalConfig;
    expect(config.position).toBe('top-center');
    // Other values should come from defaults
    expect(config.maxToasts).toBe(DEFAULT_TOAST_CONFIG.maxToasts);
    expect(config.defaultLife).toBe(DEFAULT_TOAST_CONFIG.defaultLife);
  });
});

// ---------------------------------------------------------------------------
// ToastComponent
// ---------------------------------------------------------------------------
describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let service: ToastService;

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    service = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    service.clear();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Positioning ───────────────────────────────────────────────────────

  describe('positioning', () => {
    it('should default to bottom-end position', () => {
      expect(component.position()).toBe('bottom-end');
    });

    it('should compute correct container classes for bottom-end', () => {
      expect(component.containerClasses()).toContain('toast-bottom');
      expect(component.containerClasses()).toContain('toast-end');
    });

    it('should compute correct container classes for top-start', () => {
      component.position.set('top-start');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('toast-top');
      expect(component.containerClasses()).toContain('toast-start');
    });

    it('should compute correct container classes for top-center', () => {
      component.position.set('top-center');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('toast-top');
      expect(component.containerClasses()).toContain('toast-center');
    });

    it('should compute correct container classes for bottom-center', () => {
      component.position.set('bottom-center');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('toast-bottom');
      expect(component.containerClasses()).toContain('toast-center');
    });

    it('should compute correct container classes for bottom-start', () => {
      component.position.set('bottom-start');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('toast-bottom');
      expect(component.containerClasses()).toContain('toast-start');
    });

    it('should compute correct container classes for top-end', () => {
      component.position.set('top-end');
      fixture.detectChanges();
      expect(component.containerClasses()).toContain('toast-top');
      expect(component.containerClasses()).toContain('toast-end');
    });

    it('should always include toast-container class', () => {
      const positions: ToastPosition[] = ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'];
      for (const pos of positions) {
        component.position.set(pos);
        expect(component.containerClasses()).toContain('toast-container');
      }
    });
  });

  // ── positionVertical ──────────────────────────────────────────────────

  describe('positionVertical', () => {
    it('should return top for top-* positions', () => {
      component.position.set('top-start');
      expect(component.positionVertical()).toBe('top');
      component.position.set('top-center');
      expect(component.positionVertical()).toBe('top');
      component.position.set('top-end');
      expect(component.positionVertical()).toBe('top');
    });

    it('should return bottom for bottom-* positions', () => {
      component.position.set('bottom-start');
      expect(component.positionVertical()).toBe('bottom');
      component.position.set('bottom-center');
      expect(component.positionVertical()).toBe('bottom');
      component.position.set('bottom-end');
      expect(component.positionVertical()).toBe('bottom');
    });
  });

  // ── getToastClasses() ─────────────────────────────────────────────────

  describe('getToastClasses()', () => {
    function makeToast(overrides: Partial<Toast> = {}): Toast {
      return {
        id: 'test-id',
        severity: 'info',
        summary: 'Test',
        life: 5000,
        sticky: false,
        soft: false,
        progressBar: false,
        pauseOnHover: true,
        tapToDismiss: false,
        dismissing: false,
        progressTarget: 100,
        isPaused: false,
        createdAt: Date.now(),
        remainingTime: 5000,
        transitionDuration: 0,
        ...overrides,
      };
    }

    it('should always include alert and toast-item classes', () => {
      const toast = makeToast();
      const classes = component.getToastClasses(toast);
      expect(classes).toContain('alert');
      expect(classes).toContain('toast-item');
    });

    it('should include entry animation class for bottom position', () => {
      component.position.set('bottom-end');
      const toast = makeToast({ dismissing: false });
      expect(component.getToastClasses(toast)).toContain('toast-enter-bottom');
    });

    it('should include entry animation class for top position', () => {
      component.position.set('top-end');
      const toast = makeToast({ dismissing: false });
      expect(component.getToastClasses(toast)).toContain('toast-enter-top');
    });

    it('should include leave animation class when dismissing from bottom', () => {
      component.position.set('bottom-end');
      const toast = makeToast({ dismissing: true });
      expect(component.getToastClasses(toast)).toContain('toast-leave-bottom');
    });

    it('should include leave animation class when dismissing from top', () => {
      component.position.set('top-end');
      const toast = makeToast({ dismissing: true });
      expect(component.getToastClasses(toast)).toContain('toast-leave-top');
    });

    it('should include alert-soft for soft toasts', () => {
      const toast = makeToast({ soft: true });
      expect(component.getToastClasses(toast)).toContain('alert-soft');
    });

    it('should not include alert-soft for non-soft toasts', () => {
      const toast = makeToast({ soft: false });
      expect(component.getToastClasses(toast)).not.toContain('alert-soft');
    });

    it('should include cursor-pointer for tapToDismiss toasts', () => {
      const toast = makeToast({ tapToDismiss: true });
      expect(component.getToastClasses(toast)).toContain('cursor-pointer');
    });

    it('should include cursor-pointer when onTap is set', () => {
      const toast = makeToast({ onTap: () => {} });
      expect(component.getToastClasses(toast)).toContain('cursor-pointer');
    });

    it('should not include cursor-pointer when neither tapToDismiss nor onTap', () => {
      const toast = makeToast({ tapToDismiss: false });
      expect(component.getToastClasses(toast)).not.toContain('cursor-pointer');
    });

    it('should include correct severity class for each severity', () => {
      const severityMap: Record<ToastSeverity, string> = {
        success: 'alert-success',
        info: 'alert-info',
        warning: 'alert-warning',
        error: 'alert-error',
      };
      for (const [severity, expectedClass] of Object.entries(severityMap)) {
        const toast = makeToast({ severity: severity as ToastSeverity });
        expect(component.getToastClasses(toast)).toContain(expectedClass);
      }
    });
  });

  // ── getIcon() ─────────────────────────────────────────────────────────

  describe('getIcon()', () => {
    it('should return CircleCheck for success severity', () => {
      expect(component.getIcon('success')).toBe('CircleCheck');
    });

    it('should return Info for info severity', () => {
      expect(component.getIcon('info')).toBe('Info');
    });

    it('should return TriangleAlert for warning severity', () => {
      expect(component.getIcon('warning')).toBe('TriangleAlert');
    });

    it('should return CircleX for error severity', () => {
      expect(component.getIcon('error')).toBe('CircleX');
    });
  });

  // ── getActionButtonClass() ────────────────────────────────────────────

  describe('getActionButtonClass()', () => {
    it('should return btn-outline for default style', () => {
      const cls = component.getActionButtonClass('default');
      expect(cls).toContain('btn');
      expect(cls).toContain('btn-xs');
      expect(cls).toContain('btn-outline');
    });

    it('should return btn-primary for primary style', () => {
      const cls = component.getActionButtonClass('primary');
      expect(cls).toContain('btn-primary');
    });

    it('should return btn-ghost for ghost style', () => {
      const cls = component.getActionButtonClass('ghost');
      expect(cls).toContain('btn-ghost');
    });

    it('should return btn-outline when style is undefined', () => {
      const cls = component.getActionButtonClass(undefined);
      expect(cls).toContain('btn-outline');
    });
  });

  // ── dismiss() delegation ──────────────────────────────────────────────

  describe('dismiss()', () => {
    it('should delegate to ToastService.dismiss()', () => {
      const id = service.show({ severity: 'info', summary: 'Test' });
      fixture.detectChanges();

      component.dismiss(id);
      fixture.detectChanges();

      const toast = service.toasts().find(t => t.id === id);
      expect(toast?.dismissing).toBe(true);
    });
  });

  // ── onToastClick() delegation ─────────────────────────────────────────

  describe('onToastClick()', () => {
    it('should delegate to ToastService.handleToastClick()', () => {
      const spy = vi.spyOn(service, 'handleToastClick');
      const id = service.show({ severity: 'info', summary: 'Click' });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      component.onToastClick(toast);
      expect(spy).toHaveBeenCalledWith(id);
    });
  });

  // ── onMouseEnter / onMouseLeave ───────────────────────────────────────

  describe('hover interactions', () => {
    it('onMouseEnter should call pauseAutoDismiss for pauseOnHover non-sticky toasts', () => {
      const spy = vi.spyOn(service, 'pauseAutoDismiss');
      const id = service.show({ severity: 'info', summary: 'Hover', pauseOnHover: true });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      component.onMouseEnter(toast);
      expect(spy).toHaveBeenCalledWith(id);
    });

    it('onMouseEnter should NOT call pauseAutoDismiss for sticky toasts', () => {
      const spy = vi.spyOn(service, 'pauseAutoDismiss');
      service.show({ severity: 'info', summary: 'Sticky', sticky: true, pauseOnHover: true });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      component.onMouseEnter(toast);
      expect(spy).not.toHaveBeenCalled();
    });

    it('onMouseEnter should NOT call pauseAutoDismiss when pauseOnHover is false', () => {
      const spy = vi.spyOn(service, 'pauseAutoDismiss');
      service.show({ severity: 'info', summary: 'No hover', pauseOnHover: false });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      component.onMouseEnter(toast);
      expect(spy).not.toHaveBeenCalled();
    });

    it('onMouseLeave should call resumeAutoDismiss for paused, non-sticky toasts', () => {
      const spy = vi.spyOn(service, 'resumeAutoDismiss');
      const id = service.show({ severity: 'info', summary: 'Hover', pauseOnHover: true, life: 5000 });
      fixture.detectChanges();
      vi.advanceTimersByTime(100);

      // First pause it
      service.pauseAutoDismiss(id);
      fixture.detectChanges();

      const toast = service.toasts().find(t => t.id === id)!;
      expect(toast.isPaused).toBe(true);

      component.onMouseLeave(toast);
      expect(spy).toHaveBeenCalledWith(id);
    });

    it('onMouseLeave should NOT call resumeAutoDismiss when not paused', () => {
      const spy = vi.spyOn(service, 'resumeAutoDismiss');
      service.show({ severity: 'info', summary: 'Not paused', pauseOnHover: true });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      // isPaused is false by default
      component.onMouseLeave(toast);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── handleActionClick() ───────────────────────────────────────────────

  describe('handleActionClick()', () => {
    it('should delegate to service and stop event propagation', () => {
      const serviceSpy = vi.spyOn(service, 'handleActionClick');
      const action: ToastAction = { label: 'Undo', onClick: () => {} };
      const id = service.show({ severity: 'info', summary: 'Action', actions: [action] });
      fixture.detectChanges();

      const toast = service.toasts()[0];
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      component.handleActionClick(toast, action, mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
      expect(serviceSpy).toHaveBeenCalledWith(id, action);
    });
  });

  // ── Template rendering ────────────────────────────────────────────────

  describe('template rendering', () => {
    it('should render toast container div', () => {
      const container = fixture.nativeElement.querySelector('.toast-container');
      expect(container).toBeTruthy();
    });

    it('should not render any toast items when no toasts exist', () => {
      const items = fixture.nativeElement.querySelectorAll('.toast-item');
      expect(items.length).toBe(0);
    });

    it('should render a toast item when a toast is shown', () => {
      service.show({ severity: 'info', summary: 'Rendered' });
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.toast-item');
      expect(items.length).toBe(1);
    });

    it('should render the summary text', () => {
      service.show({ severity: 'info', summary: 'Hello World' });
      fixture.detectChanges();

      const summary = fixture.nativeElement.querySelector('.toast-summary');
      expect(summary?.textContent?.trim()).toBe('Hello World');
    });

    it('should render the detail text when provided', () => {
      service.show({ severity: 'info', summary: 'Title', detail: 'Detail text here' });
      fixture.detectChanges();

      const detail = fixture.nativeElement.querySelector('.toast-detail');
      expect(detail?.textContent?.trim()).toBe('Detail text here');
    });

    it('should not render detail element when detail is not provided', () => {
      service.show({ severity: 'info', summary: 'No detail' });
      fixture.detectChanges();

      const detail = fixture.nativeElement.querySelector('.toast-detail');
      expect(detail).toBeNull();
    });

    it('should render a dismiss button for each toast', () => {
      service.show({ severity: 'info', summary: 'Dismissable' });
      fixture.detectChanges();

      const dismissBtn = fixture.nativeElement.querySelector('.toast-dismiss');
      expect(dismissBtn).toBeTruthy();
      expect(dismissBtn.getAttribute('aria-label')).toBe('Dismiss notification');
    });

    it('should render action buttons when provided', () => {
      service.show({
        severity: 'info',
        summary: 'Actions',
        actions: [
          { label: 'Undo', onClick: () => {} },
          { label: 'Retry', onClick: () => {}, style: 'primary' },
        ],
      });
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.toast-actions button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent.trim()).toBe('Undo');
      expect(buttons[1].textContent.trim()).toBe('Retry');
    });

    it('should render multiple toasts when stacked', () => {
      service.show({ severity: 'success', summary: 'First' });
      service.show({ severity: 'error', summary: 'Second' });
      service.show({ severity: 'warning', summary: 'Third' });
      fixture.detectChanges();

      const items = fixture.nativeElement.querySelectorAll('.toast-item');
      expect(items.length).toBe(3);
    });

    it('should set appropriate ARIA attributes on toast elements', () => {
      service.show({ severity: 'info', summary: 'Accessible' });
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.toast-item');
      expect(item.getAttribute('role')).toBe('alert');
      expect(item.getAttribute('aria-live')).toBe('assertive');
      expect(item.getAttribute('aria-atomic')).toBe('true');
      expect(item.getAttribute('aria-label')).toBe('Accessible');
    });

    it('should set role=status and aria-live=polite for sticky toasts', () => {
      service.show({ severity: 'info', summary: 'Sticky ARIA', sticky: true });
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector('.toast-item');
      expect(item.getAttribute('role')).toBe('status');
      expect(item.getAttribute('aria-live')).toBe('polite');
    });

    it('should render progress bar for non-sticky toasts with progressBar enabled', () => {
      service.show({ severity: 'info', summary: 'Progress', progressBar: true });
      fixture.detectChanges();

      const progressBar = fixture.nativeElement.querySelector('.toast-progress');
      expect(progressBar).toBeTruthy();
    });

    it('should NOT render progress bar for sticky toasts', () => {
      service.show({ severity: 'info', summary: 'Sticky', sticky: true, progressBar: true });
      fixture.detectChanges();

      const progressBar = fixture.nativeElement.querySelector('.toast-progress');
      expect(progressBar).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// ToastComponent with custom position via TOAST_CONFIG
// ---------------------------------------------------------------------------
describe('ToastComponent with custom config', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideToast({ position: 'top-center' }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should use the configured position', () => {
    expect(component.position()).toBe('top-center');
  });

  it('should compute correct container classes for configured position', () => {
    expect(component.containerClasses()).toContain('toast-top');
    expect(component.containerClasses()).toContain('toast-center');
  });
});
