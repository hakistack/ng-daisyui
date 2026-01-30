import { CommonModule } from '@angular/common';
import { CdkStep, CdkStepper, CdkStepperModule, StepState } from '@angular/cdk/stepper';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-stepper',
  imports: [CommonModule, CdkStepperModule],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: CdkStepper, useExisting: StepperComponent }],
})
export class StepperComponent extends CdkStepper {
  // Customization inputs
  readonly showStepNumbers = input<boolean>(true);
  readonly showStepIndicator = input<boolean>(true);
  readonly showStateIcons = input<boolean>(true);
  readonly showCard = input<boolean>(true);
  readonly animateContent = input<boolean>(true);
  readonly previousButtonText = input<string>('Previous');
  readonly nextButtonText = input<string>('Next');
  readonly completeButtonText = input<string>('Complete');

  // Outputs
  readonly completed = output<void>();
  readonly stepChange = output<{ previousIndex: number; currentIndex: number }>();

  // Track previous index for animations
  private previousSelectedIndex = signal<number>(0);

  // Get animation direction based on navigation
  get animationDirection(): 'forward' | 'backward' {
    return this.selectedIndex >= this.previousSelectedIndex() ? 'forward' : 'backward';
  }

  // Step state helpers
  isStepCompleted(index: number): boolean {
    // A step is visually completed only if user has moved past it
    return index < this.selectedIndex;
  }

  isStepActive(index: number): boolean {
    return this.selectedIndex === index;
  }

  isStepEditable(index: number): boolean {
    const step = this.steps.get(index);
    return step?.editable ?? true;
  }

  isStepOptional(index: number): boolean {
    const step = this.steps.get(index);
    return step?.optional ?? false;
  }

  hasStepError(index: number): boolean {
    const step = this.steps.get(index);
    return step?.hasError ?? false;
  }

  getStepState(index: number): StepState | 'number' {
    const step = this.steps.get(index);
    if (!step) return 'number';

    if (step.hasError && step.interacted) return 'error';
    if (this.isStepCompleted(index)) return 'done';
    if (this.isStepActive(index) && step.editable) return 'edit';
    return 'number';
  }

  // Navigation
  canNavigateToStep(index: number): boolean {
    if (!this.linear) return true;
    // In linear mode, can only go to completed steps or current/previous
    return index <= this.selectedIndex;
  }

  goToStep(index: number): void {
    if (!this.canNavigateToStep(index)) return;

    const previousIndex = this.selectedIndex;
    this.previousSelectedIndex.set(previousIndex);
    this.selectedIndex = index;
    this.stepChange.emit({ previousIndex, currentIndex: index });
  }

  onNext(): void {
    if (this.selectedIndex < this.steps.length - 1) {
      const previousIndex = this.selectedIndex;
      this.previousSelectedIndex.set(previousIndex);
      this.selectedIndex = previousIndex + 1;
      this.stepChange.emit({ previousIndex, currentIndex: this.selectedIndex });
    }
  }

  onPrevious(): void {
    if (this.selectedIndex > 0) {
      this.goToStep(this.selectedIndex - 1);
    }
  }

  onComplete(): void {
    this.completed.emit();
  }

  // Check if step has custom label template
  hasCustomLabel(step: CdkStep): boolean {
    return !!step.stepLabel;
  }
}
