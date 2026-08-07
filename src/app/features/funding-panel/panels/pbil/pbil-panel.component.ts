import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { FundingPanelStore } from '../../application/funding-panel.store';
import { FUNDING_PANEL_DATA_ACCESS_PROVIDERS } from '../../data-access/funding-panel-data.providers';
import { provideFundingPanelDefinition } from '../../data-access/funding-panel-definition.provider';
import { provideFundingPanelMockReport } from '../../data-access/funding-panel-mock-report';
import { FundingPanelSurfaceComponent } from '../../presentation/funding-panel-surface/funding-panel-surface.component';
import { createPbilReportFixture } from './mocks/pbil-report.fixture';
import { PBIL_PANEL_DEFINITION } from './pbil-panel.definition';

@Component({
  selector: 'app-pbil-panel',
  standalone: true,
  imports: [FundingPanelSurfaceComponent],
  templateUrl: './pbil-panel.component.html',
  styleUrl: './pbil-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    FundingPanelStore,
    ...FUNDING_PANEL_DATA_ACCESS_PROVIDERS,
    provideFundingPanelDefinition(PBIL_PANEL_DEFINITION),
    provideFundingPanelMockReport(createPbilReportFixture),
  ],
})
export class PbilPanelComponent {
  readonly store = inject(FundingPanelStore);
}
