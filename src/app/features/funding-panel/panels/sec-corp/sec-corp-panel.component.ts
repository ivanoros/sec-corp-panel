import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { FundingPanelStore } from '../../application/funding-panel.store';
import { FUNDING_PANEL_GATEWAY } from '../../data-access/funding-panel.gateway';
import { MockFundingPanelGateway } from '../../data-access/mock-funding-panel.gateway';
import { FundingGridComponent } from '../../presentation/funding-grid/funding-grid.component';

const SEC_CORP_MOCK_BUSINESS_DATE = '2026-07-25';

@Component({
  selector: 'app-sec-corp-panel',
  standalone: true,
  imports: [FundingGridComponent],
  templateUrl: './sec-corp-panel.component.html',
  styleUrl: './sec-corp-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    FundingPanelStore,
    MockFundingPanelGateway,
    {
      provide: FUNDING_PANEL_GATEWAY,
      useExisting: MockFundingPanelGateway,
    },
  ],
})
export class SecCorpPanelComponent {
  readonly store = inject(FundingPanelStore);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);

  constructor() {
    configureAgGrid(this.runtimeConfig);
    this.store.load({
      panelCode: 'sec-corp',
      businessDate: SEC_CORP_MOCK_BUSINESS_DATE,
    });
  }

  retryLoad(): void {
    this.store.requestRefresh();
  }
}
