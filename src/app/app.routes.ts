import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'settlements',
  },
  {
    path: 'settlements',
    loadComponent: () =>
      import('./features/settlements-shell/presentation/settlements-shell/settlements-shell.component').then(
        ({ SettlementsShellComponent }) => SettlementsShellComponent,
      ),
  },
  {
    path: 'sec-corp',
    loadComponent: () =>
      import('./features/funding-panel/panels/sec-corp/sec-corp-panel.component').then(
        ({ SecCorpPanelComponent }) => SecCorpPanelComponent,
      ),
  },
  {
    path: 'pbil',
    loadComponent: () =>
      import('./features/funding-panel/panels/pbil/pbil-panel.component').then(
        ({ PbilPanelComponent }) => PbilPanelComponent,
      ),
  },
  {
    path: 'settlement-details',
    loadComponent: () =>
      import('./features/settlement-details/presentation/settlement-details-panel/settlement-details-panel.component').then(
        ({ SettlementDetailsPanelComponent }) => SettlementDetailsPanelComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'settlements',
  },
];
