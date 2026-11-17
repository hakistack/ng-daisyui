import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AlertService, provideAlert } from './alert.service';
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

describe('AlertService HTML sanitizing', () => {
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

  async function renderedBody(options: Parameters<AlertService['show']>[0]): Promise<HTMLElement> {
    void service.show(options);
    await Promise.resolve();
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    const body = document.body.querySelector('hk-alert-container [id^="alert-body-"]') as HTMLElement;
    return body;
  }

  it('strips scripts and event handlers from html by default', async () => {
    const body = await renderedBody({ title: 'T', html: '<b>bold</b><img src="x" onerror="alert(1)"><script>alert(2)</script>' });
    expect(body.innerHTML).toContain('<b>bold</b>');
    expect(body.innerHTML).not.toContain('onerror');
    expect(body.innerHTML).not.toContain('<script');
  });

  it('renders html verbatim only with trustedHtml: true', async () => {
    const body = await renderedBody({ title: 'T', html: '<span style="color: red">x</span>', trustedHtml: true });
    expect(body.innerHTML).toContain('style="color: red"');
  });
});

describe('AlertService loading overlay', () => {
  it('removes a closable loading overlay when the user closes it', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const service = TestBed.inject(AlertService);
    service.showLoading({ allowClose: true });
    const container = document.body.querySelector('hk-alert-container')!;
    const instance = (service as unknown as { compRef: { instance: { overlays: () => { resolve: (r: AlertResult) => void }[] } } }).compRef
      .instance;
    expect(instance.overlays().length).toBe(1);

    instance.overlays()[0].resolve({ isConfirmed: false, isDismissed: true, isCancelled: false, dismissReason: 'esc' });
    expect(instance.overlays().length).toBe(0);
    container.remove();
  });
});

describe('AlertService accessible names', () => {
  afterEach(() => {
    document.body.querySelectorAll('hk-alert-container').forEach((el) => el.remove());
  });

  async function render(show: (service: AlertService) => void): Promise<HTMLElement> {
    const service = TestBed.inject(AlertService);
    show(service);
    await Promise.resolve();
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    return document.body.querySelector('hk-alert-container [role="dialog"]') as HTMLElement;
  }

  it('describes the dialog by its body only when there is one', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const dialog = await render((s) => void s.show({ title: 'No body' }));
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });

  it('points aria-describedby at the rendered text body', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const dialog = await render((s) => void s.show({ title: 'Saved', text: 'All changes stored.' }));
    const id = dialog.getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toContain('All changes stored.');
  });

  const spanishLabels = () =>
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }, provideAlert({ labels: { close: 'Cerrar', loading: 'Cargando' } })],
    });

  it('localises the close button through AlertLabels', async () => {
    spanishLabels();
    const dialog = await render((s) => void s.show({ title: 'Hola' }));
    expect(dialog.querySelector('.modal-box button.btn-circle')?.getAttribute('aria-label')).toBe('Cerrar');
  });

  it('gives the loading spinner localised screen-reader text', async () => {
    spanishLabels();
    const loading = await render((s) => s.showLoading({ title: 'Espere' }));
    const status = loading.querySelector('[role="status"]')!;
    expect(status.textContent?.trim()).toBe('Cargando');
    expect(status.querySelector('.loading')?.getAttribute('aria-hidden')).toBe('true');
  });
});
