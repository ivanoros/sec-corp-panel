import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { EndOfDayMovementValues } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';
import { formatDashboardAmount } from '../shared/settlements-display';

interface MovementRow {
  readonly key: keyof EndOfDayMovementValues;
  readonly label: string;
  readonly accent?: boolean;
}

@Component({
  selector: 'app-end-of-day-movement-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './end-of-day-movement-panel.component.html',
  styleUrl: './end-of-day-movement-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndOfDayMovementPanelComponent {
  readonly values = input.required<EndOfDayMovementValues>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly formatAmount = formatDashboardAmount;
  readonly rows: readonly MovementRow[] = [
    { key: 'secCorp4Pm', label: 'Sec Corp 4PM' },
    {
      key: 'netSettledSecuritiesIntoMarginFacility',
      label: 'Net Settled Securities into Margin Facility',
      accent: true,
    },
    { key: 'netSettledCashIntoMarginFacility', label: 'Net Settled Cash into Margin Facility' },
    { key: 'secCorpCash', label: 'Sec Corp Cash' },
    { key: 'target', label: 'Target' },
    { key: 'difference', label: 'Diff' },
    { key: 'securitiesToMove', label: 'Securities to move' },
  ];
}
