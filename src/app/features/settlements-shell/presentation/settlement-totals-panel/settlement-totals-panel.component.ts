import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { SettlementTotalsValues } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';
import { formatDashboardAmount } from '../shared/settlements-display';

@Component({
  selector: 'app-settlement-totals-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './settlement-totals-panel.component.html',
  styleUrl: './settlement-totals-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementTotalsPanelComponent {
  readonly values = input.required<SettlementTotalsValues>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly formatAmount = formatDashboardAmount;
}
