import {
  CellStyleModule,
  ClientSideRowModelModule,
  CustomEditorModule,
  HighlightChangesModule,
  ModuleRegistry,
  NumberFilterModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  TextEditorModule,
  TextFilterModule,
  TooltipModule,
} from 'ag-grid-community';
import { ColumnsToolPanelModule, LicenseManager, SideBarModule } from 'ag-grid-enterprise';

import type { RuntimeConfig } from '../config/runtime-config';

const FUNDING_GRID_MODULES = [
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnsToolPanelModule,
  CustomEditorModule,
  HighlightChangesModule,
  NumberFilterModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  SideBarModule,
  TextEditorModule,
  TextFilterModule,
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
