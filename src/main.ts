import { bootstrapApplication } from '@angular/platform-browser';

import { createAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { readRuntimeConfig } from './app/core/config/runtime-config';

const runtimeConfig = readRuntimeConfig();

bootstrapApplication(AppComponent, createAppConfig(runtimeConfig)).catch((error: unknown) => {
  console.error('Unable to bootstrap the Sec Corp panel.', error);
});
