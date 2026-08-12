import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { CashPositionPoint } from '../../domain/settlements-dashboard';
import { SettlementPanelFrameComponent } from '../shared/settlement-panel-frame/settlement-panel-frame.component';

interface ChartPoint {
  readonly x: number;
  readonly pbilY: number;
  readonly secCorpY: number;
}

@Component({
  selector: 'app-cash-positions-over-time-panel',
  standalone: true,
  imports: [SettlementPanelFrameComponent],
  templateUrl: './cash-positions-over-time-panel.component.html',
  styleUrl: './cash-positions-over-time-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashPositionsOverTimePanelComponent {
  readonly points = input.required<readonly CashPositionPoint[]>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
  readonly selectedSeries = input<'all' | 'pbil' | 'secCorp'>('all');
  readonly chartPoints = computed(() => createChartPoints(this.points()));
  readonly pbilPath = computed(() => toPolylinePoints(this.chartPoints(), 'pbilY'));
  readonly secCorpPath = computed(() => toPolylinePoints(this.chartPoints(), 'secCorpY'));
}

function createChartPoints(points: readonly CashPositionPoint[]): ChartPoint[] {
  const numericValues = points.flatMap((point) => [Number(point.pbil), Number(point.secCorp)]);
  const minimum = Math.min(...numericValues);
  const maximum = Math.max(...numericValues);
  const range = Math.max(1, maximum - minimum);
  const horizontalStep = points.length > 1 ? 940 / (points.length - 1) : 0;

  return points.map((point, index) => ({
    x: 30 + horizontalStep * index,
    pbilY: 160 - ((Number(point.pbil) - minimum) / range) * 120,
    secCorpY: 160 - ((Number(point.secCorp) - minimum) / range) * 120,
  }));
}

function toPolylinePoints(points: readonly ChartPoint[], field: 'pbilY' | 'secCorpY'): string {
  return points.map((point) => `${point.x},${point[field]}`).join(' ');
}
