import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'sec-corp',
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
    path: '**',
    redirectTo: 'sec-corp',
  },
];
