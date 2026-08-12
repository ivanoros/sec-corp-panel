import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { SettlementProjectionValues } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';
import { formatDashboardAmount } from '../shared/settlements-display';

interface ProjectionRow {
  readonly label: string;
  readonly key: keyof SettlementProjectionValues;
}

@Component({
  selector: 'app-projections-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './projections-panel.component.html',
  styleUrl: './projections-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectionsPanelComponent {
  readonly values = input.required<SettlementProjectionValues>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly formatAmount = formatDashboardAmount;
  readonly rows: readonly ProjectionRow[] = [
    { label: 'Live', key: 'live' },
    { label: '8:30am', key: 'snapshot0830' },
    { label: '11:30am', key: 'snapshot1130' },
    { label: '1:30pm', key: 'snapshot1330' },
    { label: 'EOD', key: 'endOfDay' },
  ];
}
