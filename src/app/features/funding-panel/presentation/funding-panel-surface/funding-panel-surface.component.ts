import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { FundingPanelStore } from '../../application/funding-panel.store';
import { FundingGridComponent } from '../funding-grid/funding-grid.component';

@Component({
  selector: 'app-funding-panel-surface',
  standalone: true,
  imports: [FundingGridComponent],
  templateUrl: './funding-panel-surface.component.html',
  styleUrl: './funding-panel-surface.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundingPanelSurfaceComponent implements OnInit {
  readonly panelCode = input.required<string>();
  readonly panelTitle = input.required<string>();
  readonly store = inject(FundingPanelStore);
  readonly confirmingConflictDiscard = signal(false);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);

  constructor() {
    configureAgGrid(this.runtimeConfig);
  }

  ngOnInit(): void {
    this.store.load({
      panelCode: this.panelCode(),
      businessDate: this.runtimeConfig.businessDate,
    });
  }

  retryLoad(): void {
    this.store.requestRefresh();
  }

  retrySave(): void {
    this.store.retrySave();
  }

  requestConflictDiscard(): void {
    this.confirmingConflictDiscard.set(true);
  }

  cancelConflictDiscard(): void {
    this.confirmingConflictDiscard.set(false);
  }

  confirmConflictDiscard(): void {
    this.confirmingConflictDiscard.set(false);
    this.store.discardChangesAndRefresh();
  }
}
