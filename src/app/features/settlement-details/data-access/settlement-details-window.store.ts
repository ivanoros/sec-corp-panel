import { Injectable, computed, inject, signal, type OnDestroy } from '@angular/core';
import { finalize, type Subscription } from 'rxjs';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import type {
  SettlementDetail,
  SettlementDateCriterion,
  SettlementDetailsSearchQuery,
  SettlementDetailsSearchResult,
  SettlementTextFilter,
} from '../domain/settlement-detail';
import { SETTLEMENT_DETAILS_GATEWAY } from './settlement-details.gateway';

export const SETTLEMENT_DETAILS_WINDOW_SIZE = 1_000;

export interface SettlementDetailsWindowCriteria {
  readonly settlementDate: SettlementDateCriterion;
  readonly filters: readonly SettlementTextFilter[];
}

@Injectable()
export class SettlementDetailsWindowStore implements OnDestroy {
  private readonly gateway = inject(SETTLEMENT_DETAILS_GATEWAY);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private activeRequest: Subscription | null = null;
  private requestSequence = 0;

  readonly rows = signal<SettlementDetail[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly asOf = signal<string | null>(null);
  readonly serverPageIndex = signal(0);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverPageCount = computed(() =>
    Math.max(1, Math.ceil((this.totalCount() ?? 0) / SETTLEMENT_DETAILS_WINDOW_SIZE)),
  );
  readonly rangeStart = computed(() =>
    (this.totalCount() ?? 0) === 0
      ? 0
      : this.serverPageIndex() * SETTLEMENT_DETAILS_WINDOW_SIZE + 1,
  );
  readonly rangeEnd = computed(() =>
    Math.min((this.serverPageIndex() + 1) * SETTLEMENT_DETAILS_WINDOW_SIZE, this.totalCount() ?? 0),
  );

  loadPage(criteria: SettlementDetailsWindowCriteria, pageIndex: number): void {
    const normalizedPageIndex = Math.max(0, Math.trunc(pageIndex));
    const requestId = ++this.requestSequence;

    this.activeRequest?.unsubscribe();
    this.activeRequest = null;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const query = createSettlementDetailsWindowQuery(
      criteria,
      normalizedPageIndex,
      this.runtimeConfig.userId,
    );
    const subscription = this.gateway
      .search(query)
      .pipe(
        finalize(() => {
          if (requestId === this.requestSequence) {
            this.isLoading.set(false);
            this.activeRequest = null;
          }
        }),
      )
      .subscribe({
        next: (result) => this.acceptResult(result, normalizedPageIndex, requestId),
        error: () => {
          if (requestId === this.requestSequence) {
            this.errorMessage.set(
              'Settlement details could not be loaded. Refresh the panel to try again.',
            );
          }
        },
      });

    if (!subscription.closed) {
      this.activeRequest = subscription;
    }
  }

  ngOnDestroy(): void {
    this.requestSequence += 1;
    this.activeRequest?.unsubscribe();
    this.activeRequest = null;
    this.isLoading.set(false);
  }

  private acceptResult(
    result: SettlementDetailsSearchResult,
    pageIndex: number,
    requestId: number,
  ): void {
    if (requestId !== this.requestSequence) {
      return;
    }

    this.rows.set([...result.rows]);
    this.totalCount.set(result.totalCount);
    this.asOf.set(result.asOf);
    this.serverPageIndex.set(pageIndex);
  }
}

export function createSettlementDetailsWindowQuery(
  criteria: SettlementDetailsWindowCriteria,
  pageIndex: number,
  userId: string,
): SettlementDetailsSearchQuery {
  const normalizedPageIndex = Math.max(0, Math.trunc(pageIndex));

  return {
    schemaVersion: 1,
    userId,
    settlementDate: { ...criteria.settlementDate },
    offset: normalizedPageIndex * SETTLEMENT_DETAILS_WINDOW_SIZE,
    limit: SETTLEMENT_DETAILS_WINDOW_SIZE,
    filters: [...criteria.filters],
    sort: [],
  };
}
