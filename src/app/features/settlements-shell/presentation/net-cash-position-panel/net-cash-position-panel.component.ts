import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { SettlementBusinessUnitValues } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';
import { formatDashboardAmount } from '../shared/settlements-display';

@Component({
  selector: 'app-net-cash-position-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './net-cash-position-panel.component.html',
  styleUrl: './net-cash-position-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetCashPositionPanelComponent {
  readonly values = input.required<SettlementBusinessUnitValues>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly formatAmount = formatDashboardAmount;
}
