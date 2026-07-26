import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FundingPanelStore } from '../../application/funding-panel.store';
import { FUNDING_PANEL_GATEWAY } from '../../data-access/funding-panel.gateway';
import { MockFundingPanelGateway } from '../../data-access/mock-funding-panel.gateway';

const SEC_CORP_MOCK_BUSINESS_DATE = '2026-07-25';

@Component({
  selector: 'app-sec-corp-panel',
  standalone: true,
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

  constructor() {
    this.store.load({
      panelCode: 'sec-corp',
      businessDate: SEC_CORP_MOCK_BUSINESS_DATE,
    });
  }
}
