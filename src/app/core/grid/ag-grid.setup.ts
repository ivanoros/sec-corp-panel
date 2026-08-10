import {
  CellStyleModule,
  ClientSideRowModelModule,
  CustomEditorModule,
  HighlightChangesModule,
  ModuleRegistry,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  TextEditorModule,
  TooltipModule,
} from 'ag-grid-community';
import { LicenseManager } from 'ag-grid-enterprise';

import type { RuntimeConfig } from '../config/runtime-config';

const FUNDING_GRID_MODULES = [
  CellStyleModule,
  ClientSideRowModelModule,
  CustomEditorModule,
  HighlightChangesModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  TextEditorModule,
  TooltipModule,
];
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
