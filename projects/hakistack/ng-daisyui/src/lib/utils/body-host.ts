import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Type } from '@angular/core';

/**
 * A component created outside any template and appended to `<body>` — how service-driven overlays
 * (ToastService, AlertService) get a container without the app placing one.
 */
export interface BodyHost<C> {
  readonly ref: ComponentRef<C>;
  /** Detach from change detection, destroy and remove the element. */
  destroy(): void;
}

/** Browser-only: call it behind `isPlatformBrowser`. */
export function attachToBody<C>(component: Type<C>, appRef: ApplicationRef, environmentInjector: EnvironmentInjector): BodyHost<C> {
  const ref = createComponent(component, { environmentInjector });
  appRef.attachView(ref.hostView);
  document.body.appendChild(ref.location.nativeElement);
  let destroyed = false;
  return {
    ref,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      appRef.detachView(ref.hostView);
      ref.destroy();
      (ref.location.nativeElement as HTMLElement).remove();
    },
  };
}
