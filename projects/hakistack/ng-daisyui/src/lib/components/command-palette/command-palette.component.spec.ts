import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandPaletteComponent } from './command-palette.component';
import { CommandPaletteConfig } from './command-palette.types';

const CONFIG: CommandPaletteConfig = {
  items: [
    { id: 'new', label: 'New file', group: 'files' },
    { id: 'open', label: 'Open file', group: 'files' },
    { id: 'settings', label: 'Settings' },
  ],
  groups: [{ id: 'files', label: 'Files' }],
  filter: 'substring',
  hotkey: false,
};

describe('CommandPaletteComponent accessibility (APG combobox)', () => {
  let fixture: ComponentFixture<CommandPaletteComponent>;

  beforeAll(() => {
    // jsdom may not implement modal dialogs.
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    fixture = TestBed.createComponent(CommandPaletteComponent);
    fixture.componentRef.setInput('config', CONFIG);
    fixture.detectChanges();
  });

  function type(query: string): HTMLInputElement {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = query;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  }

  it('wires the search input as a combobox controlling a listbox of options', () => {
    fixture.componentInstance.open();
    const input = type('file');

    expect(input.getAttribute('role')).toBe('combobox');
    const listbox = document.getElementById(input.getAttribute('aria-controls')!) as HTMLElement;
    expect(listbox.getAttribute('role')).toBe('listbox');
    const options = Array.from(listbox.querySelectorAll('[role="option"]'));
    expect(options.length).toBe(2);
    for (const option of options) expect(option.getAttribute('tabindex')).toBe('-1');
  });

  it('points aria-activedescendant at the highlighted option and moves it with the arrow keys', () => {
    fixture.componentInstance.open();
    const input = type('file');

    const first = input.getAttribute('aria-activedescendant');
    expect(first).toBeTruthy();
    expect(document.getElementById(first!)?.getAttribute('aria-selected')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    const second = input.getAttribute('aria-activedescendant');
    expect(second).not.toBe(first);
    expect(document.getElementById(second!)?.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById(first!)?.getAttribute('aria-selected')).toBe('false');
  });

  it('gives the dialog an accessible name and never uses aria-selected on a plain button', () => {
    fixture.componentInstance.open();
    type('file');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('dialog')?.getAttribute('aria-label')).toBeTruthy();
    for (const button of Array.from(root.querySelectorAll('button[aria-selected]'))) {
      expect(button.getAttribute('role')).toBe('option');
    }
  });
});
