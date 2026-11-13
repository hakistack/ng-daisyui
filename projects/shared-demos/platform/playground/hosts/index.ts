import type { Type } from '@angular/core';

/** Lazy playground per docs page id. A page gets a Playground tab only if it is listed here. */
export const PLAYGROUNDS: Record<string, () => Promise<Type<unknown>>> = {
  input: () => import('./input.playground').then((m) => m.InputPlaygroundComponent),
  select: () => import('./select.playground').then((m) => m.SelectPlaygroundComponent),
  datepicker: () => import('./datepicker.playground').then((m) => m.DatepickerPlaygroundComponent),
  timepicker: () => import('./timepicker.playground').then((m) => m.TimepickerPlaygroundComponent),
  toast: () => import('./toast.playground').then((m) => m.ToastPlaygroundComponent),
  alert: () => import('./alert.playground').then((m) => m.AlertPlaygroundComponent),
};
