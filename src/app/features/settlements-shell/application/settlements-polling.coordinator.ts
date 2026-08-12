import { DOCUMENT } from '@angular/common';
import { inject, Injectable, type OnDestroy } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';

export interface SettlementsPollingTargets {
  readonly refreshDashboard: () => void;
  readonly refreshSettlementDetails: () => void;
}

@Injectable()
export class SettlementsPollingCoordinator implements OnDestroy {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly document = inject(DOCUMENT);
  private timer: ReturnType<typeof setInterval> | null = null;

  start(targets: SettlementsPollingTargets): void {
    this.stop();

    if (!this.runtimeConfig.settlementsPollingEnabled) {
      return;
    }

    this.timer = setInterval(() => {
      if (this.document.visibilityState === 'hidden') {
        return;
      }

      targets.refreshDashboard();
      targets.refreshSettlementDetails();
    }, this.runtimeConfig.settlementsPollingIntervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
