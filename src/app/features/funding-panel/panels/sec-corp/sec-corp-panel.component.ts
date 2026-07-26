import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { FundingPanelStore } from '../../application/funding-panel.store';
import { FUNDING_PANEL_DATA_ACCESS_PROVIDERS } from '../../data-access/funding-panel-data.providers';
import { FundingGridComponent } from '../../presentation/funding-grid/funding-grid.component';

@Component({
  selector: 'app-sec-corp-panel',
  standalone: true,
  imports: [FundingGridComponent],
  templateUrl: './sec-corp-panel.component.html',
  styleUrl: './sec-corp-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FundingPanelStore, ...FUNDING_PANEL_DATA_ACCESS_PROVIDERS],
})
export class SecCorpPanelComponent {
  readonly store = inject(FundingPanelStore);
  readonly confirmingConflictDiscard = signal(false);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);

  constructor() {
    configureAgGrid(this.runtimeConfig);
    this.store.load({
      panelCode: 'sec-corp',
      businessDate: this.runtimeConfig.businessDate,
    });
  }

  retryLoad(): void {
    this.store.requestRefresh();
  }

  retrySave(): void {
    this.store.retrySave();
  }

  requestConflictDiscard(): void {
    this.confirmingConflictDiscard.set(true);
  }

  cancelConflictDiscard(): void {
    this.confirmingConflictDiscard.set(false);
  }

  confirmConflictDiscard(): void {
    this.confirmingConflictDiscard.set(false);
    this.store.discardChangesAndRefresh();
  }
}
