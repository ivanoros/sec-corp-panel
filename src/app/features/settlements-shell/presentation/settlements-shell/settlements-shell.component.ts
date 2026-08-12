import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  signal,
  viewChild,
} from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { SettlementDetailsPanelComponent } from '../../../settlement-details/presentation/settlement-details-panel/settlement-details-panel.component';
import { SettlementsDashboardStore } from '../../application/settlements-dashboard.store';
import {
  type SettlementLayoutHandle,
  type SettlementsLayout,
  SettlementsLayoutStore,
} from '../../application/settlements-layout.store';
import { SettlementsPollingCoordinator } from '../../application/settlements-polling.coordinator';
import { SETTLEMENTS_DASHBOARD_DATA_PROVIDERS } from '../../data-access/settlements-dashboard-data.providers';
import { CashPositionsOverTimePanelComponent } from '../cash-positions-over-time-panel/cash-positions-over-time-panel.component';
import { EndOfDayMovementPanelComponent } from '../end-of-day-movement-panel/end-of-day-movement-panel.component';
import { NetCashPositionPanelComponent } from '../net-cash-position-panel/net-cash-position-panel.component';
import { ProjectionsPanelComponent } from '../projections-panel/projections-panel.component';
import { SettlementTotalsPanelComponent } from '../settlement-totals-panel/settlement-totals-panel.component';

@Component({
  selector: 'app-settlements-shell',
  standalone: true,
  imports: [
    CashPositionsOverTimePanelComponent,
    EndOfDayMovementPanelComponent,
    NetCashPositionPanelComponent,
    ProjectionsPanelComponent,
    SettlementDetailsPanelComponent,
    SettlementTotalsPanelComponent,
  ],
  templateUrl: './settlements-shell.component.html',
  styleUrl: './settlements-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    ...SETTLEMENTS_DASHBOARD_DATA_PROVIDERS,
    SettlementsDashboardStore,
    SettlementsLayoutStore,
    SettlementsPollingCoordinator,
  ],
})
export class SettlementsShellComponent implements OnInit {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly pollingCoordinator = inject(SettlementsPollingCoordinator);
  private readonly settlementDetailsPanel = viewChild(SettlementDetailsPanelComponent);
  private readonly activeResize = signal<{
    readonly handle: SettlementLayoutHandle;
    readonly pointerId: number;
    readonly startX: number;
    readonly startY: number;
    readonly width: number;
    readonly height: number;
    readonly base: SettlementsLayout;
  } | null>(null);
  readonly store = inject(SettlementsDashboardStore);
  readonly layoutStore = inject(SettlementsLayoutStore);
  readonly resizing = computed(() => this.activeResize() !== null);
  readonly workspaceStyle = computed(() => {
    const layout = this.layoutStore.layout();

    return {
      '--settlements-left-rail': `${layout.leftRailPercent}%`,
      '--settlements-right-summary': `${layout.rightSummaryPercent}%`,
      '--settlements-top-row': `${layout.topRowPercent}%`,
      '--settlements-totals-row': `${layout.totalsRowPercent}%`,
    };
  });

  ngOnInit(): void {
    this.store.load({
      businessDate: this.runtimeConfig.businessDate,
      userId: this.runtimeConfig.userId,
    });
    this.pollingCoordinator.start({
      refreshDashboard: () => this.store.refreshIfIdle(),
      refreshSettlementDetails: () => this.settlementDetailsPanel()?.refreshIfIdle(),
    });
  }

  startResize(handle: SettlementLayoutHandle, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const workspace = (event.currentTarget as HTMLElement).parentElement;
    const target = event.currentTarget as HTMLElement;

    if (workspace === null) {
      return;
    }

    const bounds = workspace.getBoundingClientRect();
    target.setPointerCapture(event.pointerId);
    this.activeResize.set({
      handle,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: bounds.width,
      height: bounds.height,
      base: this.layoutStore.layout(),
    });
    event.preventDefault();
  }

  continueResize(event: PointerEvent): void {
    const resize = this.activeResize();

    if (resize === null || resize.pointerId !== event.pointerId) {
      return;
    }

    const horizontal = resize.handle === 'leftRail' || resize.handle === 'rightSummary';
    const size = horizontal ? resize.width : resize.height;
    const delta = horizontal ? event.clientX - resize.startX : event.clientY - resize.startY;

    this.layoutStore.previewResize(resize.handle, resize.base, (delta / Math.max(1, size)) * 100);
  }

  finishResize(event: PointerEvent): void {
    const resize = this.activeResize();

    if (resize === null || resize.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement;

    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    this.activeResize.set(null);
    this.layoutStore.persist();
  }

  resizeWithKeyboard(handle: SettlementLayoutHandle, event: KeyboardEvent): void {
    const isHorizontal = handle === 'leftRail' || handle === 'rightSummary';
    const negativeKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const positiveKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    if (event.key !== negativeKey && event.key !== positiveKey) {
      return;
    }

    this.layoutStore.adjust(handle, event.key === negativeKey ? -2 : 2);
    event.preventDefault();
  }
}
