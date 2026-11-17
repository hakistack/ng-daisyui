import { ChangeDetectionStrategy, Component, Injectable, InjectionToken, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CommandPaletteComponent } from '../components/command-palette/command-palette.component';
import { CommandPaletteLabels, provideHkCommandPaletteLabels } from '../components/command-palette/command-palette.labels';
import { DataGridComponent } from '../components/datagrid/datagrid.component';
import { createDataGrid } from '../components/datagrid/datagrid.helpers';
import { DataGridLabels, provideHkDataGridLabels } from '../components/datagrid/datagrid.labels';
import { DocumentWorkspaceComponent } from '../components/document-viewer/workspace/document-workspace.component';
import {
  DocumentWorkspaceLabels,
  provideHkDocumentWorkspaceLabels,
} from '../components/document-viewer/workspace/document-workspace.labels';
import { DynamicFormComponent } from '../components/dynamic-form/dynamic-form.component';
import { createForm, field, step } from '../components/dynamic-form/dynamic-form.helpers';
import {
  DYNAMIC_FORM_LABELS,
  DynamicFormLabels,
  HK_DYNAMIC_FORM_LABELS,
  provideDynamicFormLabels,
  provideHkDynamicFormLabels,
} from '../components/dynamic-form/dynamic-form.types';
import { NotificationHostComponent } from '../components/notification/notification-host.component';
import { NotificationLabels, provideHkNotificationLabels } from '../components/notification/notification.labels';
import { NotificationService } from '../components/notification/notification.service';
import { PdfViewerComponent } from '../components/pdf-viewer/pdf-viewer.component';
import { createPdfViewer } from '../components/pdf-viewer/pdf-viewer.helpers';
import { PdfViewerLabels, provideHkPdfLabels } from '../components/pdf-viewer/pdf-viewer.labels';
import { HkLabelsSource, injectLabels, provideLabelsSource } from './labels-source';

/**
 * Every app-wide `provide*Labels()` accepts a labels object, a Signal, or a function run in
 * an injection context. A signal source must re-render the (OnPush) component when it
 * changes, which is how an app follows a runtime language switch with any i18n library.
 */

// ── The helper itself ──────────────────────────────────────────────────────

interface Greeting {
  hello?: string;
}
const GREETING = new InjectionToken<HkLabelsSource<Greeting>>('GREETING');

/** Stands in for a translation service: a language stream, as Transloco exposes it. */
@Injectable({ providedIn: 'root' })
class FakeTranslations {
  readonly lang$ = new BehaviorSubject<'en' | 'es'>('en');
  /** Like Transloco's `translateSignal`: needs an injection context and calls `toSignal()`. */
  translateSignal(dictionary: Record<'en' | 'es', string>) {
    const lang = toSignal(this.lang$, { requireSync: true });
    return computed(() => dictionary[lang()]);
  }
}

@Component({
  selector: 'hk-test-greeting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ text() }}</p>`,
})
class GreetingComponent {
  private readonly labels = injectLabels(GREETING);
  readonly text = computed(() => this.labels()?.hello ?? 'Hello');
}

function renderGreeting(): () => string {
  const fixture = TestBed.createComponent(GreetingComponent);
  fixture.detectChanges();
  return () => {
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent!.trim();
  };
}

describe('labels source (shared helper)', () => {
  it('falls back to the component default when nothing is provided', () => {
    expect(renderGreeting()()).toBe('Hello');
  });

  it('accepts a plain object (the original form)', () => {
    TestBed.configureTestingModule({ providers: [provideLabelsSource(GREETING, { hello: 'Hola' })] });
    expect(renderGreeting()()).toBe('Hola');
  });

  it('follows a signal source', () => {
    const labels = signal<Greeting>({ hello: 'Hello' });
    TestBed.configureTestingModule({ providers: [provideLabelsSource(GREETING, labels)] });
    const text = renderGreeting();
    expect(text()).toBe('Hello');
    labels.set({ hello: 'Hola' });
    expect(text()).toBe('Hola');
  });

  it('runs a function once in an injection context, where toSignal-based translate helpers work', () => {
    const factory = vi.fn(() => {
      const hello = inject(FakeTranslations).translateSignal({ en: 'Hello', es: 'Hola' });
      return computed(() => ({ hello: hello() }));
    });
    TestBed.configureTestingModule({ providers: [provideLabelsSource(GREETING, factory)] });
    const first = renderGreeting();
    const second = renderGreeting();
    expect(first()).toBe('Hello');

    TestBed.inject(FakeTranslations).lang$.next('es');
    expect(first()).toBe('Hola');
    expect(second()).toBe('Hola');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('accepts a function that returns a plain object', () => {
    TestBed.configureTestingModule({
      providers: [provideLabelsSource(GREETING, () => ({ hello: inject(PLATFORM_ID) === 'browser' ? 'Hi' : 'Hey' }))],
    });
    expect(renderGreeting()()).toBe('Hi');
  });

  it('handles a source registered directly with useValue', () => {
    const labels = signal<Greeting>({ hello: 'Ciao' });
    TestBed.configureTestingModule({ providers: [{ provide: GREETING, useValue: labels }] });
    const text = renderGreeting();
    expect(text()).toBe('Ciao');
    labels.set({ hello: 'Salut' });
    expect(text()).toBe('Salut');
  });
});

// ── Each provider ──────────────────────────────────────────────────────────

describe('app-wide label providers follow a signal source', () => {
  beforeAll(() => {
    // jsdom may not implement modal dialogs (command palette).
    const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void };
    if (!proto.showModal) {
      proto.showModal = function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
      proto.close = function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      };
    }
  });

  it('provideHkDataGridLabels', () => {
    const labels = signal<DataGridLabels>({ empty: 'Nothing here' });
    TestBed.configureTestingModule({ providers: [provideHkDataGridLabels(labels)] });
    const fixture = TestBed.createComponent(DataGridComponent);
    fixture.componentRef.setInput('controller', createDataGrid({ columns: [{ field: 'name', header: 'Name' }], data: [] }));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nothing here');

    labels.set({ empty: 'Sin resultados' });
    fixture.detectChanges();
    expect(el.textContent).toContain('Sin resultados');
    expect(el.textContent).not.toContain('Nothing here');
  });

  it('provideHkNotificationLabels', () => {
    const labels = signal<NotificationLabels>({ regionAriaLabel: 'Alerts' });
    TestBed.configureTestingModule({ providers: [provideHkNotificationLabels(labels)] });
    const fixture = TestBed.createComponent(NotificationHostComponent);
    TestBed.inject(NotificationService).show({ title: 'Saved', duration: 0 });
    fixture.detectChanges();
    const region = () => (fixture.nativeElement as HTMLElement).querySelector('[role="region"]')!.getAttribute('aria-label');
    expect(region()).toBe('Alerts');

    labels.set({ regionAriaLabel: 'Notificaciones' });
    fixture.detectChanges();
    expect(region()).toBe('Notificaciones');
  });

  it('provideHkCommandPaletteLabels', () => {
    const labels = signal<CommandPaletteLabels>({ searchPlaceholder: 'Find…' });
    TestBed.configureTestingModule({
      providers: [provideHkCommandPaletteLabels(labels), { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    const fixture = TestBed.createComponent(CommandPaletteComponent);
    fixture.componentRef.setInput('config', { items: [{ id: 'a', label: 'A' }], hotkey: false });
    fixture.detectChanges();
    fixture.componentInstance.open();
    fixture.detectChanges();
    const input = () => (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
    expect(input().placeholder).toBe('Find…');

    labels.set({ searchPlaceholder: 'Buscar…' });
    fixture.detectChanges();
    expect(input().placeholder).toBe('Buscar…');
  });

  it('provideHkPdfLabels', async () => {
    const labels = signal<PdfViewerLabels>({ previousPage: 'Back a page' });
    TestBed.configureTestingModule({ providers: [provideHkPdfLabels(labels)] });
    const fixture = TestBed.createComponent(PdfViewerComponent);
    fixture.componentRef.setInput('src', new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    fixture.componentRef.setInput('config', createPdfViewer({}).config());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const named = (text: string) => (fixture.nativeElement as HTMLElement).querySelectorAll(`button[aria-label="${text}"]`).length;
    expect(named('Back a page')).toBeGreaterThan(0);

    labels.set({ previousPage: 'Anterior' });
    fixture.detectChanges();
    expect(named('Anterior')).toBeGreaterThan(0);
    expect(named('Back a page')).toBe(0);
  });

  it('provideHkDocumentWorkspaceLabels', () => {
    const labels = signal<DocumentWorkspaceLabels>({ documentAria: 'Nothing open' });
    TestBed.configureTestingModule({ providers: [provideHkDocumentWorkspaceLabels(labels)] });
    const fixture = TestBed.createComponent(DocumentWorkspaceComponent);
    fixture.componentRef.setInput('storageKey', null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nothing open');

    labels.set({ documentAria: 'Ningún documento' });
    fixture.detectChanges();
    expect(el.textContent).toContain('Ningún documento');
    expect(el.textContent).not.toContain('Nothing open');
  });

  describe('dynamic form', () => {
    const wizard = () =>
      createForm({
        steps: [step.create('one', 'One', [field.text('a', 'A')]), step.create('two', 'Two', [field.text('b', 'B')])],
      });

    function renderNextButtonText(): () => string[] {
      const fixture = TestBed.createComponent(DynamicFormComponent);
      fixture.componentRef.setInput('config', wizard().config());
      fixture.detectChanges();
      return () => {
        fixture.detectChanges();
        return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map((b) => b.textContent!.trim());
      };
    }

    it('provideHkDynamicFormLabels', () => {
      const labels = signal<DynamicFormLabels>({ nextButton: 'Forward' });
      TestBed.configureTestingModule({ providers: [provideHkDynamicFormLabels(labels)] });
      const buttons = renderNextButtonText();
      expect(buttons()).toContain('Forward');

      labels.set({ nextButton: 'Siguiente' });
      expect(buttons()).toContain('Siguiente');
      expect(buttons()).not.toContain('Forward');
    });

    it('provideDynamicFormLabels keeps working as an alias of the same token', () => {
      expect(DYNAMIC_FORM_LABELS).toBe(HK_DYNAMIC_FORM_LABELS);
      const labels = signal<DynamicFormLabels>({ nextButton: 'Weiter' });
      TestBed.configureTestingModule({ providers: [provideDynamicFormLabels(labels)] });
      const buttons = renderNextButtonText();
      expect(buttons()).toContain('Weiter');
      labels.set({ nextButton: 'Suivant' });
      expect(buttons()).toContain('Suivant');
    });
  });
});
