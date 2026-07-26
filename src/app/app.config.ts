import { provideHttpClient } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { APP_RUNTIME_CONFIG, type RuntimeConfig } from './core/config/runtime-config';

export function createAppConfig(runtimeConfig: RuntimeConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideHttpClient(),
      provideRouter(routes),
      {
        provide: APP_RUNTIME_CONFIG,
        useValue: runtimeConfig,
      },
    ],
  };
}
