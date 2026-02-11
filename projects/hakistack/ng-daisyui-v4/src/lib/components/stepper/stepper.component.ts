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
  readonly showStepIndicator = input<boolean>(true);
  readonly showCard = input<boolean>(true);
  readonly animateContent = input<boolean>(true);
  readonly previousButtonText = input<string>('Previous');
  readonly nextButtonText = input<string>('Next');
  readonly completeButtonText = input<string>('Complete');

  readonly completed = output<void>();
  readonly stepChange = output<{ previousIndex: number; currentIndex: number }>();

  private previousSelectedIndex = signal<number>(0);

  get animationDirection(): 'forward' | 'backward' {
    return this.selectedIndex >= this.previousSelectedIndex() ? 'forward' : 'backward';
  }

  isStepCompleted(index: number): boolean {
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

  canNavigateToStep(index: number): boolean {
    if (!this.linear) return true;
    return index <= this.selectedIndex;
  }

  goToStep(index: number): void {
    if (!this.canNavigateToStep(index)) return;
    this.navigateToStep(index);
  }

  onNext(): void {
    if (this.selectedIndex < this.steps.length - 1) {
      this.navigateToStep(this.selectedIndex + 1);
    }
  }

  onPrevious(): void {
    if (this.selectedIndex > 0) {
      this.navigateToStep(this.selectedIndex - 1);
    }
  }

  onComplete(): void {
    this.completed.emit();
  }

  hasCustomLabel(step: CdkStep): boolean {
    return !!step.stepLabel;
  }

  private navigateToStep(index: number): void {
    const previousIndex = this.selectedIndex;
    this.previousSelectedIndex.set(previousIndex);
    this.selectedIndex = index;
    this.stepChange.emit({ previousIndex, currentIndex: index });
  }
}
