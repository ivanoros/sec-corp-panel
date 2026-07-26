import { ClientSideRowModelModule, ModuleRegistry } from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';

import type { RuntimeConfig } from '../config/runtime-config';

const FUNDING_GRID_MODULES = [ClientSideRowModelModule];

export function configureAgGrid(runtimeConfig: RuntimeConfig): void {
  ModuleRegistry.registerModules(FUNDING_GRID_MODULES);

  if (runtimeConfig.agGridEnterpriseLicenseKey !== null) {
    LicenseManager.setLicenseKey(runtimeConfig.agGridEnterpriseLicenseKey);
  }
}
