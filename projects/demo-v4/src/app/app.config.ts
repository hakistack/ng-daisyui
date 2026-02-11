import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToast, provideAlert } from '@hakistack/ng-daisyui-v4';

import { routes } from './app.routes';
import { providePipes } from '../../../hakistack/ng-daisyui-v4/src/lib/services/pipe-registry.service';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), providePipes(), provideRouter(routes), provideToast(), provideAlert()],
};
