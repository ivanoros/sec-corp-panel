import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { FailProjectionValues } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';
import { formatDashboardAmount } from '../shared/settlements-display';

@Component({
  selector: 'app-fail-projection-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './fail-projection-panel.component.html',
  styleUrl: './fail-projection-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FailProjectionPanelComponent {
  readonly values = input.required<FailProjectionValues>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly formatAmount = formatDashboardAmount;
}
