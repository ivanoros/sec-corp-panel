import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FundingPanelStore } from '../../application/funding-panel.store';
import { FUNDING_PANEL_DATA_ACCESS_PROVIDERS } from '../../data-access/funding-panel-data.providers';
import { provideFundingPanelDefinition } from '../../data-access/funding-panel-definition.provider';
import { provideFundingPanelMockReport } from '../../data-access/funding-panel-mock-report';
import { FundingPanelSurfaceComponent } from '../../presentation/funding-panel-surface/funding-panel-surface.component';
import { createSecCorpReportFixture } from './mocks/sec-corp-report.fixture';
import { SEC_CORP_PANEL_DEFINITION } from './sec-corp-panel.definition';

@Component({
  selector: 'app-sec-corp-panel',
  standalone: true,
  imports: [FundingPanelSurfaceComponent],
  templateUrl: './sec-corp-panel.component.html',
  styleUrl: './sec-corp-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    FundingPanelStore,
    ...FUNDING_PANEL_DATA_ACCESS_PROVIDERS,
    provideFundingPanelDefinition(SEC_CORP_PANEL_DEFINITION),
    provideFundingPanelMockReport(createSecCorpReportFixture),
  ],
})
export class SecCorpPanelComponent {
  readonly store = inject(FundingPanelStore);
}
