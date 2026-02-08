import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CdkPortalOutlet, ComponentPortal, PortalModule } from '@angular/cdk/portal';

import { ChangeDetectionStrategy, Component, ComponentRef, ElementRef, inject, Injector, OnDestroy, OnInit, Type, viewChild } from '@angular/core';

interface InternalWrapperData<T = unknown> {
  /** The actual "inner" component to render */
  component: Type<T>;
  /** The data to inject into that inner component */
  componentData?: unknown;
}

/**
 * Internal wrapper component used by `DialogService.open()` to render
 * a child component inside a CDK dialog with consistent styling.
 *
 * Creates a CDK portal outlet and attaches the provided component with
 * its own injector so the inner component receives the correct `DIALOG_DATA`.
 */
@Component({
  selector: 'app-dialog-wrapper',
  imports: [PortalModule],
  templateUrl: './dialog-wrapper.component.html',
  styleUrl: './dialog-wrapper.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogWrapperComponent<T = unknown> implements OnInit, OnDestroy {
  readonly dialogRef = inject(DialogRef<T, unknown>);
  private readonly injector = inject(Injector);
  private readonly data = inject(DIALOG_DATA) as InternalWrapperData<T>;

  readonly outlet = viewChild.required(CdkPortalOutlet);
  readonly dialogWrapper = viewChild.required<ElementRef<HTMLElement>>('dialogWrapper');

  private componentRef?: ComponentRef<T>;
  private portal?: ComponentPortal<T>;

  ngOnInit(): void {
    this.createAndAttachPortal();
  }

  ngOnDestroy(): void {
    this.cleanupPortal();
  }

  private createAndAttachPortal(): void {
    if (!this.data?.component) {
      console.warn('DialogWrapperComponent: No component provided in data');
      return;
    }

    try {
      const childInjector = Injector.create({
        providers: [{ provide: DIALOG_DATA, useValue: this.data.componentData ?? null }],
        parent: this.injector,
      });

      this.portal = new ComponentPortal(this.data.component, null, childInjector);
      this.componentRef = this.outlet().attachComponentPortal(this.portal);
    } catch (error) {
      console.error('DialogWrapperComponent: Failed to create portal:', error);
      this.dialogRef.close();
    }
  }

  private cleanupPortal(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = undefined;
    }

    if (this.portal) {
      this.portal = undefined;
    }

    this.outlet().detach();
  }
}
