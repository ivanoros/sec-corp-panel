import { bootstrapApplication } from '@angular/platform-browser';

import { createAppConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { readRuntimeConfig } from './app/core/config/runtime-config';
import { configureAgGrid } from './app/core/grid/ag-grid.setup';

const runtimeConfig = readRuntimeConfig();

configureAgGrid(runtimeConfig);

bootstrapApplication(AppComponent, createAppConfig(runtimeConfig)).catch((error: unknown) => {
  console.error('Unable to bootstrap the Sec Corp panel.', error);
});
