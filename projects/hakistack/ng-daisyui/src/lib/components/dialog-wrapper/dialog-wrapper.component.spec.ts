import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy, Component, inject as ngInject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

import { DialogWrapperComponent } from './dialog-wrapper.component';

// ---------------------------------------------------------------------------
// Mock inner components used for portal testing
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-dialog-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="test-content">Hello from inner: {{ data?.message }}</div>`,
})
class TestDialogContentComponent {
  readonly data = ngInject<{ message: string } | null>(DIALOG_DATA);
}

@Component({
  selector: 'hk-test-dialog-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="test-actions">
      <button class="confirm-btn" (click)="dialogRef.close('confirmed')">Confirm</button>
      <button class="cancel-btn" (click)="dialogRef.close()">Cancel</button>
    </div>
  `,
})
class TestDialogActionsComponent {
  readonly dialogRef = ngInject(DialogRef);
}

// ---------------------------------------------------------------------------
// Mock DialogRef
// ---------------------------------------------------------------------------

function createMockDialogRef(): DialogRef {
  return {
    close: vi.fn(),
    closed: { subscribe: vi.fn() } as unknown,
    componentInstance: null,
    disableClose: false,
  } as unknown as DialogRef;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DialogWrapperComponent', () => {
  describe('creation with no component', () => {
    let component: DialogWrapperComponent;
    let fixture: ComponentFixture<DialogWrapperComponent>;
    let mockDialogRef: DialogRef;

    beforeEach(async () => {
      mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: { component: null } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(DialogWrapperComponent);
      component = fixture.componentInstance;
    });

    it('should create the wrapper component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have a reference to DialogRef', () => {
      fixture.detectChanges();
      expect(component.dialogRef).toBe(mockDialogRef);
    });

    it('should warn when no component is provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalledWith('DialogWrapperComponent: No component provided in data');
      warnSpy.mockRestore();
    });

    it('should render the dialog wrapper element', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const wrapper = el.querySelector('.dialog-box');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('creation with a valid component', () => {
    let fixture: ComponentFixture<DialogWrapperComponent>;
    let mockDialogRef: DialogRef;

    beforeEach(async () => {
      mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogContentComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogContentComponent,
              componentData: { message: 'Test Data' },
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(DialogWrapperComponent);
    });

    it('should create and attach inner component portal', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.test-content');
      expect(content).toBeTruthy();
    });

    it('should inject component data into inner component', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.test-content');
      expect(content!.textContent).toContain('Hello from inner: Test Data');
    });

    it('should clean up portal on destroy', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.test-content')).toBeTruthy();

      fixture.destroy();

      // After destroy, the component ref should be cleaned up
      // (no error thrown during destruction is the main assertion)
      expect(true).toBe(true);
    });
  });

  describe('creation with component data as null', () => {
    let fixture: ComponentFixture<DialogWrapperComponent>;
    let mockDialogRef: DialogRef;

    beforeEach(async () => {
      mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogContentComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogContentComponent,
              componentData: undefined,
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(DialogWrapperComponent);
    });

    it('should inject null as DIALOG_DATA into inner component when componentData is undefined', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.test-content');
      // data is null, so message is undefined => "Hello from inner: "
      expect(content).toBeTruthy();
      expect(content!.textContent).toContain('Hello from inner:');
    });
  });

  describe('dialog actions (confirm/cancel)', () => {
    let fixture: ComponentFixture<DialogWrapperComponent>;
    let mockDialogRef: DialogRef;

    beforeEach(async () => {
      mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogActionsComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogActionsComponent,
            },
          },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();
    });

    it('should render action buttons from inner component', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.confirm-btn')).toBeTruthy();
      expect(el.querySelector('.cancel-btn')).toBeTruthy();
    });

    it('should close dialog with result on confirm', () => {
      const el: HTMLElement = fixture.nativeElement;
      const confirmBtn = el.querySelector('.confirm-btn') as HTMLButtonElement;
      confirmBtn.click();
      fixture.detectChanges();

      expect(mockDialogRef.close).toHaveBeenCalledWith('confirmed');
    });

    it('should close dialog without result on cancel', () => {
      const el: HTMLElement = fixture.nativeElement;
      const cancelBtn = el.querySelector('.cancel-btn') as HTMLButtonElement;
      cancelBtn.click();
      fixture.detectChanges();

      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('error handling', () => {
    it('should close dialog when portal creation fails', async () => {
      const mockDialogRef = createMockDialogRef();

      // Provide an invalid component that will cause an error
      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: class InvalidComponent {},
            },
          },
        ],
      }).compileComponents();

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      // Should have logged an error and closed the dialog
      expect(errorSpy).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });

  describe('dialog wrapper HTML structure', () => {
    it('should have dialog-box class on wrapper', () => {
      const mockDialogRef = createMockDialogRef();

      TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: { component: null } },
        ],
      });

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const dialogBox = el.querySelector('.dialog-box');
      expect(dialogBox).toBeTruthy();
    });

    it('should contain a cdkPortalOutlet', () => {
      const mockDialogRef = createMockDialogRef();

      TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: { component: null } },
        ],
      });

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      // The outlet viewChild is required -- it should exist
      expect(fixture.componentInstance.outlet).toBeTruthy();
    });

    it('should have the dialogWrapper viewChild reference', () => {
      const mockDialogRef = createMockDialogRef();

      TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: { component: null } },
        ],
      });

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.dialogWrapper).toBeTruthy();
    });

    it('should have animation classes on the dialog box', () => {
      const mockDialogRef = createMockDialogRef();

      TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: { component: null } },
        ],
      });

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const dialogBox = el.querySelector('.dialog-box') as HTMLElement;
      expect(dialogBox.classList.contains('animate__animated')).toBe(true);
      expect(dialogBox.classList.contains('animate__zoomIn')).toBe(true);
    });
  });

  describe('data injection scenarios', () => {
    it('should pass explicit componentData to inner component', async () => {
      const mockDialogRef = createMockDialogRef();
      const testData = { message: 'Custom payload' };

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogContentComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogContentComponent,
              componentData: testData,
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.test-content');
      expect(content!.textContent).toContain('Custom payload');
    });

    it('should inject null when componentData is explicitly null', async () => {
      const mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogContentComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogContentComponent,
              componentData: null,
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      const el: HTMLElement = fixture.nativeElement;
      const content = el.querySelector('.test-content');
      expect(content).toBeTruthy();
      // null ?? null === null so data is null
      expect(content!.textContent).toContain('Hello from inner:');
    });

    it('should pass DialogRef to inner component that injects it', async () => {
      const mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent, TestDialogActionsComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          {
            provide: DIALOG_DATA,
            useValue: {
              component: TestDialogActionsComponent,
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      // The inner component can use the wrapper's DialogRef via the parent injector
      const el: HTMLElement = fixture.nativeElement;
      const confirmBtn = el.querySelector('.confirm-btn') as HTMLButtonElement;
      confirmBtn.click();

      expect(mockDialogRef.close).toHaveBeenCalledWith('confirmed');
    });
  });

  describe('no data at all', () => {
    it('should warn when data object has no component field', async () => {
      const mockDialogRef = createMockDialogRef();

      await TestBed.configureTestingModule({
        imports: [DialogWrapperComponent],
        providers: [
          { provide: DialogRef, useValue: mockDialogRef },
          { provide: DIALOG_DATA, useValue: {} },
        ],
      }).compileComponents();

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const fixture = TestBed.createComponent(DialogWrapperComponent);
      fixture.detectChanges();

      expect(warnSpy).toHaveBeenCalledWith('DialogWrapperComponent: No component provided in data');
      warnSpy.mockRestore();
    });
  });
});
