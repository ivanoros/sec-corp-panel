import { inject, Injectable, signal, type OnDestroy } from '@angular/core';
import { finalize, type Subscription } from 'rxjs';

import type { SettlementsDashboard } from '../domain/settlements-dashboard';
import { SETTLEMENTS_DASHBOARD_GATEWAY } from '../data-access/settlements-dashboard.gateway';

export type SettlementsDashboardLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

@Injectable()
export class SettlementsDashboardStore implements OnDestroy {
  private readonly gateway = inject(SETTLEMENTS_DASHBOARD_GATEWAY);
  private activeRequest: Subscription | null = null;
  private requestSequence = 0;
  private lastQuery: { readonly businessDate: string; readonly userId: string } | null = null;

  readonly dashboard = signal<SettlementsDashboard | null>(null);
  readonly loadStatus = signal<SettlementsDashboardLoadStatus>('idle');
  readonly errorMessage = signal<string | null>(null);

  load(query: { readonly businessDate: string; readonly userId: string }): void {
    const requestId = ++this.requestSequence;
    this.lastQuery = query;
    this.activeRequest?.unsubscribe();
    this.activeRequest = null;
    this.loadStatus.set('loading');
    this.errorMessage.set(null);

    const subscription = this.gateway
      .load(query)
      .pipe(
        finalize(() => {
          if (requestId === this.requestSequence) {
            this.activeRequest = null;
          }
        }),
      )
      .subscribe({
        next: (dashboard) => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.dashboard.set(dashboard);
          this.loadStatus.set('loaded');
        },
        error: () => {
          if (requestId !== this.requestSequence) {
            return;
          }

          this.loadStatus.set('error');
          this.errorMessage.set(
            'Settlement dashboard data could not be loaded. Refresh a panel to try again.',
          );
        },
      });

    if (!subscription.closed) {
      this.activeRequest = subscription;
    }
  }

  refresh(): void {
    if (this.lastQuery !== null) {
      this.load(this.lastQuery);
    }
  }

  refreshIfIdle(): void {
    if (this.loadStatus() !== 'loading') {
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.requestSequence += 1;
    this.activeRequest?.unsubscribe();
    this.activeRequest = null;
  }
}
