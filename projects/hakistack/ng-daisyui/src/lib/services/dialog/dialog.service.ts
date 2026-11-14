import { DestroyRef, inject, Injectable, StaticProvider } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog, DIALOG_DATA, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { BasePortalOutlet, ComponentType } from '@angular/cdk/portal';
import { NavigationStart, Router } from '@angular/router';
import { filter, Observable, take } from 'rxjs';
import { DialogWrapperComponent } from '../../components/dialog-wrapper/dialog-wrapper.component';

/** The part of a `DialogRef` the navigation cleanup needs (variance-free across `DialogRef<T, R>`). */
interface ClosableDialog {
  close(): void;
  readonly closed: Observable<unknown>;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);
  // Optional: apps without the router still get dialogs, just no close-on-navigation.
  private readonly router = inject(Router, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  /** Every dialog opened through this service (open() AND openRaw()) — closed on router navigation. */
  private readonly openDialogs = new Set<ClosableDialog>();

  constructor() {
    this.router?.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.openDialogs.forEach((ref) => ref.close());
        this.openDialogs.clear();
      });
  }

  /**
   * Open a plain CDK dialog for any component T.
   * @param component - The component to render
   * @param options.data - Injected as DIALOG_DATA
   * @param options - Any other DialogConfig<D, unknown> (width, height, disableClose, etc.)
   */
  openRaw<T, D = unknown>(
    component: ComponentType<T>,
    options?: {
      data?: D;
    } & Omit<DialogConfig<D, unknown>, 'providers'>,
  ): DialogRef<T, unknown> {
    const { data, ...cfg } = options ?? {};
    const providers: StaticProvider[] = [{ provide: DIALOG_DATA, useValue: data }];
    const ref = this.dialog.open<T, D, unknown>(component, {
      ...cfg,
      providers,
    } as DialogConfig<D, DialogRef<T, unknown>, BasePortalOutlet>);
    this.track(ref);
    return ref;
  }

  private track(ref: ClosableDialog): void {
    this.openDialogs.add(ref);
    ref.closed.pipe(take(1)).subscribe(() => this.openDialogs.delete(ref));
  }

  /**
   * Open a wrapper dialog that hosts your component T inside a modal-box.
   * @param component - The "inner" component type
   * @param options.data - Payload to inject into the inner component
   * @param options - Any DialogConfig<any, unknown> fields (width, height, disableClose, etc.)
   */
  open<TInner, DInner = unknown>(
    component: ComponentType<TInner>,
    options?: { data?: DInner } & Omit<DialogConfig<unknown, unknown>, 'data' | 'providers'>,
  ): DialogRef<DialogWrapperComponent, unknown> {
    const wrapperData = { component, componentData: options?.data };
    const providers: StaticProvider[] = [{ provide: DIALOG_DATA, useValue: wrapperData }];
    const cfg = options ? Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'data')) : {};
    const finalConfig: DialogConfig<unknown, unknown> = {
      width: '95vw',
      maxWidth: '32rem',
      minWidth: '24rem',
      ...cfg,
      data: wrapperData,
      providers,
    };

    const ref = this.dialog.open<DialogWrapperComponent, unknown, unknown>(
      DialogWrapperComponent,
      finalConfig as DialogConfig<unknown, DialogRef<DialogWrapperComponent, unknown>, BasePortalOutlet>,
    );

    this.track(ref);
    return ref;
  }
}
