import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MesaDocumentListComponent, MesaDocumentListLabels } from './mesa-document-list.component';
import { WorkspaceDocument } from './workspace-document';

/** The Mesa document list (jsdom): the filter, keys into the list, short lists. */

const LABELS: MesaDocumentListLabels = {
  documents: 'Documents',
  listHint: 'hint',
  pageCountShort: '{count} p.',
  filter: 'Filter documents',
  noMatches: 'No documents match',
};

function docs(count: number): WorkspaceDocument[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `d${i}`,
    name: `${i % 2 ? 'Invoice' : 'Contrato'} ${String(i).padStart(3, '0')}.pdf`,
    src: '/x.pdf',
    description: i % 2 ? 'Facturación' : 'Contratos',
  }));
}

@Component({
  imports: [MesaDocumentListComponent],
  template: `<hk-mesa-document-list [documents]="documents()" [active]="active()" [labels]="labels" (choose)="chosen.set($event)" />`,
})
class ListHost {
  readonly documents = signal(docs(12));
  readonly active = signal<string | null>('d0');
  readonly labels = LABELS;
  readonly chosen = signal<string | null>(null);
}

describe('hk-mesa-document-list', () => {
  async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    for (let i = 0; i < 3; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const rows = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('[data-document-index]'));

  it('filters long lists by name and description, accents aside', async () => {
    const fixture = TestBed.createComponent(ListHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(rows(el).length).toBe(12);

    input.value = 'facturacion 00';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(rows(el).map((r) => r.querySelector('.truncate')?.textContent?.trim())).toEqual([
      'Invoice 001.pdf',
      'Invoice 003.pdf',
      'Invoice 005.pdf',
      'Invoice 007.pdf',
      'Invoice 009.pdf',
    ]);

    // ↓ from the filter enters the list; Enter with one match opens it.
    input.value = 'invoice 011';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fixture.componentInstance.chosen()).toBe('d11');

    input.value = 'nothing like it';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(rows(el).length).toBe(0);
    expect(el.textContent).toContain('No documents match');
  });

  it('has no filter for short lists', async () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.componentInstance.documents.set(docs(3));
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="search"]')).toBeNull();
  });
});
