import {
  CellStyleModule,
  ClientSideRowModelModule,
  CustomEditorModule,
  HighlightChangesModule,
  ModuleRegistry,
  PaginationModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  TextEditorModule,
  TextFilterModule,
  TooltipModule,
} from 'ag-grid-community';
import {
  ColumnsToolPanelModule,
  LicenseManager,
  ServerSideRowModelApiModule,
  ServerSideRowModelModule,
  SideBarModule,
} from 'ag-grid-enterprise';

import type { RuntimeConfig } from '../config/runtime-config';

const FUNDING_GRID_MODULES = [
  CellStyleModule,
  ClientSideRowModelModule,
  ColumnsToolPanelModule,
  CustomEditorModule,
  HighlightChangesModule,
  PaginationModule,
  RenderApiModule,
  RowApiModule,
  RowStyleModule,
  ServerSideRowModelApiModule,
  ServerSideRowModelModule,
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
