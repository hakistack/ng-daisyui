import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkStep, CdkStepperModule } from '@angular/cdk/stepper';
import { StepperComponent } from './stepper.component';

// ---------------------------------------------------------------------------
// Test host components
// ---------------------------------------------------------------------------

@Component({
  selector: 'hk-test-host-basic-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper>
      <cdk-step label="Step 1">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2">
        <p>Step 2 Content</p>
      </cdk-step>
      <cdk-step label="Step 3">
        <p>Step 3 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class BasicStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

@Component({
  selector: 'hk-test-host-linear-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper [linear]="true">
      <cdk-step label="Step 1" [completed]="step1Completed">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2" [completed]="step2Completed">
        <p>Step 2 Content</p>
      </cdk-step>
      <cdk-step label="Step 3">
        <p>Step 3 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class LinearStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
  step1Completed = false;
  step2Completed = false;
}

/**
 * A separate host for the linear stepper test where step1 starts already completed.
 * This avoids ExpressionChangedAfterItHasBeenChecked errors caused by mutating
 * `step1Completed` after the first change detection cycle.
 */
@Component({
  selector: 'hk-test-host-linear-completed-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper [linear]="true">
      <cdk-step label="Step 1" [completed]="true">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2">
        <p>Step 2 Content</p>
      </cdk-step>
      <cdk-step label="Step 3">
        <p>Step 3 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class LinearCompletedStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

@Component({
  selector: 'hk-test-host-optional-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper>
      <cdk-step label="Required Step">
        <p>Required Content</p>
      </cdk-step>
      <cdk-step label="Optional Step" [optional]="true">
        <p>Optional Content</p>
      </cdk-step>
      <cdk-step label="Final Step">
        <p>Final Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class OptionalStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

@Component({
  selector: 'hk-test-host-error-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper>
      <cdk-step label="Step 1" [hasError]="true">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2">
        <p>Step 2 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class ErrorStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

@Component({
  selector: 'hk-test-host-custom-buttons-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper
      previousButtonText="Back"
      nextButtonText="Forward"
      completeButtonText="Finish"
      [showStepIndicator]="false"
      [showCard]="false"
      [animateContent]="false"
    >
      <cdk-step label="Step 1">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2">
        <p>Step 2 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class CustomButtonsStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

@Component({
  selector: 'hk-test-host-editable-stepper',
  imports: [StepperComponent, CdkStepperModule],
  template: `
    <hk-stepper>
      <cdk-step label="Step 1" [editable]="true">
        <p>Step 1 Content</p>
      </cdk-step>
      <cdk-step label="Step 2" [editable]="false">
        <p>Step 2 Content</p>
      </cdk-step>
    </hk-stepper>
  `,
})
class EditableStepperTestHostComponent {
  readonly stepper = viewChild.required(StepperComponent);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStepIndicators(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('li[role="tab"]'));
}

function getNavigationButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('button[type="button"]'));
}

function getPreviousButton(fixture: ComponentFixture<unknown>): HTMLButtonElement | null {
  const buttons = getNavigationButtons(fixture);
  return buttons.find(b => b.textContent?.trim().includes('Previous') || b.textContent?.trim().includes('Back')) ?? null;
}

function getNextButton(fixture: ComponentFixture<unknown>): HTMLButtonElement | null {
  const buttons = getNavigationButtons(fixture);
  return buttons.find(b => b.textContent?.trim().includes('Next') || b.textContent?.trim().includes('Forward')) ?? null;
}

function getCompleteButton(fixture: ComponentFixture<unknown>): HTMLButtonElement | null {
  const buttons = getNavigationButtons(fixture);
  return buttons.find(b => b.textContent?.trim().includes('Complete') || b.textContent?.trim().includes('Finish')) ?? null;
}

function getStepContent(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return fixture.nativeElement.querySelector('.step-content-wrapper');
}

function getStepIndicatorText(fixture: ComponentFixture<unknown>): HTMLElement | null {
  return fixture.nativeElement.querySelector('.text-base-content\\/70');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('StepperComponent', () => {
  // -------------------------------------------------------------------------
  // Component creation
  // -------------------------------------------------------------------------
  describe('component creation', () => {
    it('should create the stepper', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper()).toBeTruthy();
    });

    it('should extend CdkStepper', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper() instanceof CdkStep).toBe(false);
      expect(fixture.componentInstance.stepper().steps).toBeDefined();
      expect(fixture.componentInstance.stepper().selectedIndex).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Step rendering
  // -------------------------------------------------------------------------
  describe('step rendering', () => {
    it('should render step indicators for all steps', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators.length).toBe(3);
    });

    it('should display step labels', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].textContent?.trim()).toContain('Step 1');
      expect(indicators[1].textContent?.trim()).toContain('Step 2');
      expect(indicators[2].textContent?.trim()).toContain('Step 3');
    });

    it('should display content for the first step by default', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const content = getStepContent(fixture);
      expect(content?.textContent).toContain('Step 1 Content');
    });

    it('should show step indicator text', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicatorText = getStepIndicatorText(fixture);
      expect(indicatorText?.textContent?.trim()).toContain('Step 1 of 3');
    });
  });

  // -------------------------------------------------------------------------
  // Step navigation (next/previous)
  // -------------------------------------------------------------------------
  describe('step navigation', () => {
    it('should navigate to the next step when next is clicked', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(1);
      const content = getStepContent(fixture);
      expect(content?.textContent).toContain('Step 2 Content');
    });

    it('should navigate to the previous step when previous is clicked', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();
      expect(stepper.selectedIndex).toBe(1);

      stepper.onPrevious();
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(0);
      const content = getStepContent(fixture);
      expect(content?.textContent).toContain('Step 1 Content');
    });

    it('should navigate by clicking the next button in the DOM', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const nextBtn = getNextButton(fixture);
      expect(nextBtn).toBeTruthy();
      nextBtn!.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper().selectedIndex).toBe(1);
    });

    it('should navigate by clicking the previous button in the DOM', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      const prevBtn = getPreviousButton(fixture);
      expect(prevBtn).toBeTruthy();
      prevBtn!.click();
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(0);
    });

    it('should emit stepChange when navigating', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      let emitted: { previousIndex: number; currentIndex: number } | undefined;
      stepper.stepChange.subscribe((e) => (emitted = e));

      stepper.onNext();
      fixture.detectChanges();

      expect(emitted).toEqual({ previousIndex: 0, currentIndex: 1 });
    });

    it('should navigate to a specific step via goToStep', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.goToStep(2);
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(2);
    });

    it('should navigate to step by clicking step indicator', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      indicators[2].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper().selectedIndex).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases: first/last step boundaries
  // -------------------------------------------------------------------------
  describe('edge cases: step boundaries', () => {
    it('should not go below index 0 on previous', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.selectedIndex).toBe(0);

      stepper.onPrevious();
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(0);
    });

    it('should not go beyond the last step on next', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext(); // -> 1
      stepper.onNext(); // -> 2 (last)
      stepper.onNext(); // should remain at 2
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(2);
    });

    it('should disable the previous button on the first step', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const prevBtn = getPreviousButton(fixture);
      expect(prevBtn?.disabled).toBe(true);
    });

    it('should show complete button on the last step instead of next', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      stepper.onNext();
      fixture.detectChanges();

      const completeBtn = getCompleteButton(fixture);
      expect(completeBtn).toBeTruthy();

      const nextBtn = getNextButton(fixture);
      expect(nextBtn).toBeNull();
    });

    it('should emit completed event when complete button is clicked', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      stepper.onNext();
      fixture.detectChanges();

      let completedEmitted = false;
      stepper.completed.subscribe(() => (completedEmitted = true));

      const completeBtn = getCompleteButton(fixture);
      completeBtn!.click();
      fixture.detectChanges();

      expect(completedEmitted).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Linear mode
  // -------------------------------------------------------------------------
  describe('linear mode', () => {
    it('should not allow jumping ahead in linear mode', async () => {
      await TestBed.configureTestingModule({
        imports: [LinearStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(LinearStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.linear).toBe(true);

      // Try to jump to step 3
      stepper.goToStep(2);
      fixture.detectChanges();

      expect(stepper.selectedIndex).toBe(0);
    });

    it('should allow navigating to current or previous steps in linear mode', async () => {
      // Use a fresh host where step1 is already completed from the start
      await TestBed.configureTestingModule({
        imports: [LinearCompletedStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(LinearCompletedStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();

      // Move to step 2
      stepper.onNext();
      fixture.detectChanges();
      expect(stepper.selectedIndex).toBe(1);

      // Should be able to go back to step 0
      stepper.goToStep(0);
      fixture.detectChanges();
      expect(stepper.selectedIndex).toBe(0);
    });

    it('should report canNavigateToStep correctly in linear mode', async () => {
      await TestBed.configureTestingModule({
        imports: [LinearStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(LinearStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.canNavigateToStep(0)).toBe(true);
      expect(stepper.canNavigateToStep(1)).toBe(false);
      expect(stepper.canNavigateToStep(2)).toBe(false);
    });

    it('should allow navigating to all steps in non-linear mode', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.canNavigateToStep(0)).toBe(true);
      expect(stepper.canNavigateToStep(1)).toBe(true);
      expect(stepper.canNavigateToStep(2)).toBe(true);
    });

    it('should not navigate forward in step indicators in linear mode', async () => {
      await TestBed.configureTestingModule({
        imports: [LinearStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(LinearStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      indicators[2].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper().selectedIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Step completion state
  // -------------------------------------------------------------------------
  describe('step completion state', () => {
    it('should mark previous steps as completed', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      expect(stepper.isStepCompleted(0)).toBe(true);
      expect(stepper.isStepCompleted(1)).toBe(false);
    });

    it('should mark the current step as active', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.isStepActive(0)).toBe(true);
      expect(stepper.isStepActive(1)).toBe(false);

      stepper.onNext();
      fixture.detectChanges();

      expect(stepper.isStepActive(0)).toBe(false);
      expect(stepper.isStepActive(1)).toBe(true);
    });

    it('should apply step-primary CSS class to completed and active steps', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].classList.contains('step-primary')).toBe(true); // completed
      expect(indicators[1].classList.contains('step-primary')).toBe(true); // active
      expect(indicators[2].classList.contains('step-primary')).toBe(false); // future
    });
  });

  // -------------------------------------------------------------------------
  // Step state
  // -------------------------------------------------------------------------
  describe('getStepState', () => {
    it('should return "number" for future steps', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.getStepState(1)).toBe('number');
      expect(stepper.getStepState(2)).toBe('number');
    });

    it('should return "edit" for the active editable step', async () => {
      await TestBed.configureTestingModule({
        imports: [EditableStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(EditableStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      // Step 0 is active and editable
      expect(stepper.getStepState(0)).toBe('edit');
    });

    it('should return "done" for completed steps', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      expect(stepper.getStepState(0)).toBe('done');
    });

    it('should return "number" for non-existent step index', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.getStepState(99)).toBe('number');
    });
  });

  // -------------------------------------------------------------------------
  // Optional steps
  // -------------------------------------------------------------------------
  describe('optional steps', () => {
    it('should detect optional steps', async () => {
      await TestBed.configureTestingModule({
        imports: [OptionalStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(OptionalStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.isStepOptional(0)).toBe(false);
      expect(stepper.isStepOptional(1)).toBe(true);
      expect(stepper.isStepOptional(2)).toBe(false);
    });

    it('should display "(Optional)" text for optional steps', async () => {
      await TestBed.configureTestingModule({
        imports: [OptionalStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(OptionalStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[1].textContent).toContain('(Optional)');
      expect(indicators[0].textContent).not.toContain('(Optional)');
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('should detect step errors', async () => {
      await TestBed.configureTestingModule({
        imports: [ErrorStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(ErrorStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.hasStepError(0)).toBe(true);
      expect(stepper.hasStepError(1)).toBe(false);
    });

    it('should apply step-error CSS class when step has error', async () => {
      await TestBed.configureTestingModule({
        imports: [ErrorStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(ErrorStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].classList.contains('step-error')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Editable steps
  // -------------------------------------------------------------------------
  describe('editable steps', () => {
    it('should detect editable steps', async () => {
      await TestBed.configureTestingModule({
        imports: [EditableStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(EditableStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      expect(stepper.isStepEditable(0)).toBe(true);
      expect(stepper.isStepEditable(1)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Animation direction
  // -------------------------------------------------------------------------
  describe('animation direction', () => {
    it('should report forward direction when moving to a higher index', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      expect(stepper.animationDirection).toBe('forward');
    });

    it('should report backward direction when moving to a lower index', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();
      stepper.onPrevious();
      fixture.detectChanges();

      expect(stepper.animationDirection).toBe('backward');
    });
  });

  // -------------------------------------------------------------------------
  // Custom button texts and inputs
  // -------------------------------------------------------------------------
  describe('custom inputs', () => {
    it('should use custom button text', async () => {
      await TestBed.configureTestingModule({
        imports: [CustomButtonsStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(CustomButtonsStepperTestHostComponent);
      fixture.detectChanges();

      const prevBtn = getPreviousButton(fixture);
      expect(prevBtn?.textContent?.trim()).toBe('Back');

      const nextBtn = getNextButton(fixture);
      expect(nextBtn?.textContent?.trim()).toBe('Forward');
    });

    it('should use custom complete button text on last step', async () => {
      await TestBed.configureTestingModule({
        imports: [CustomButtonsStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(CustomButtonsStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      const completeBtn = getCompleteButton(fixture);
      expect(completeBtn?.textContent?.trim()).toBe('Finish');
    });

    it('should hide step indicator when showStepIndicator is false', async () => {
      await TestBed.configureTestingModule({
        imports: [CustomButtonsStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(CustomButtonsStepperTestHostComponent);
      fixture.detectChanges();

      const indicatorText = getStepIndicatorText(fixture);
      expect(indicatorText).toBeNull();
    });

    it('should not wrap in card when showCard is false', async () => {
      await TestBed.configureTestingModule({
        imports: [CustomButtonsStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(CustomButtonsStepperTestHostComponent);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card');
      expect(card).toBeNull();
    });

    it('should wrap in card by default', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.card');
      expect(card).toBeTruthy();
    });

    it('should not apply animation classes when animateContent is false', async () => {
      await TestBed.configureTestingModule({
        imports: [CustomButtonsStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(CustomButtonsStepperTestHostComponent);
      fixture.detectChanges();

      const stepper = fixture.componentInstance.stepper();
      stepper.onNext();
      fixture.detectChanges();

      const content = getStepContent(fixture);
      expect(content?.classList.contains('animate-forward')).toBe(false);
      expect(content?.classList.contains('animate-backward')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // ARIA attributes
  // -------------------------------------------------------------------------
  describe('ARIA attributes', () => {
    it('should have role="tablist" on the step indicators container', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
      expect(tablist).toBeTruthy();
    });

    it('should have role="tab" on each step indicator', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      for (const indicator of indicators) {
        expect(indicator.getAttribute('role')).toBe('tab');
      }
    });

    it('should have role="tabpanel" on the step content', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const tabpanel = fixture.nativeElement.querySelector('[role="tabpanel"]');
      expect(tabpanel).toBeTruthy();
    });

    it('should set aria-selected on the active step indicator', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].getAttribute('aria-selected')).toBe('true');
      expect(indicators[1].getAttribute('aria-selected')).toBe('false');
    });

    it('should set aria-current="step" on the active step indicator', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].getAttribute('aria-current')).toBe('step');
      expect(indicators[1].getAttribute('aria-current')).toBeNull();
    });

    it('should set tabindex for navigable steps in linear mode', async () => {
      await TestBed.configureTestingModule({
        imports: [LinearStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(LinearStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      expect(indicators[0].getAttribute('tabindex')).toBe('0');
      expect(indicators[1].getAttribute('tabindex')).toBe('-1');
      expect(indicators[2].getAttribute('tabindex')).toBe('-1');
    });

    it('should set aria-labelledby on the tabpanel', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const tabpanel = fixture.nativeElement.querySelector('[role="tabpanel"]');
      expect(tabpanel?.getAttribute('aria-labelledby')).toBe('step-0');
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard interaction on step indicators
  // -------------------------------------------------------------------------
  describe('keyboard interaction on step indicators', () => {
    it('should navigate to step on Enter key press', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      indicators[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper().selectedIndex).toBe(2);
    });

    it('should navigate to step on Space key press', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      const indicators = getStepIndicators(fixture);
      indicators[1].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      fixture.detectChanges();

      expect(fixture.componentInstance.stepper().selectedIndex).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Step indicator text updates
  // -------------------------------------------------------------------------
  describe('step indicator text updates', () => {
    it('should update step indicator text when navigating', async () => {
      await TestBed.configureTestingModule({
        imports: [BasicStepperTestHostComponent],
      }).compileComponents();

      const fixture = TestBed.createComponent(BasicStepperTestHostComponent);
      fixture.detectChanges();

      let indicatorText = getStepIndicatorText(fixture);
      expect(indicatorText?.textContent?.trim()).toContain('Step 1 of 3');

      fixture.componentInstance.stepper().onNext();
      fixture.detectChanges();

      indicatorText = getStepIndicatorText(fixture);
      expect(indicatorText?.textContent?.trim()).toContain('Step 2 of 3');
    });
  });
});
