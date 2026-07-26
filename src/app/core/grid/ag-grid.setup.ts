import { ClientSideRowModelModule, ModuleRegistry } from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';

import type { RuntimeConfig } from '../config/runtime-config';

const FUNDING_GRID_MODULES = [ClientSideRowModelModule];
let modulesRegistered = false;

export function configureAgGrid(
  runtimeConfig: Pick<RuntimeConfig, 'agGridEnterpriseLicenseKey'>,
): void {
  if (!modulesRegistered) {
    ModuleRegistry.registerModules(FUNDING_GRID_MODULES);
    modulesRegistered = true;
  }

  if (runtimeConfig.agGridEnterpriseLicenseKey !== null) {
    LicenseManager.setLicenseKey(runtimeConfig.agGridEnterpriseLicenseKey);
  }
}
