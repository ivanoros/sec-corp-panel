import type {
  FilterModel,
  IServerSideDatasource,
  IServerSideGetRowsParams,
  IServerSideGetRowsRequest,
} from 'ag-grid-community';
import { finalize, type Subscription } from 'rxjs';

import {
  SETTLEMENT_DETAIL_FIELDS,
  type SettlementDetail,
  type SettlementDetailField,
  type SettlementDetailsSearchQuery,
  type SettlementDetailsSearchResult,
  type SettlementTextFilter,
  type SettlementTextFilterOperator,
} from '../domain/settlement-detail';
import type { SettlementDetailsGateway } from './settlement-details.gateway';

const SETTLEMENT_DETAIL_FIELD_SET = new Set<string>(SETTLEMENT_DETAIL_FIELDS);
const TEXT_FILTER_OPERATORS = new Set<string>([
  'blank',
  'contains',
  'endsWith',
  'equals',
  'notBlank',
  'notContains',
  'notEqual',
  'startsWith',
]);

export interface SettlementDetailsDataSourceContext {
  readonly businessDate: () => string;
  readonly userId: string;
}

export interface SettlementDetailsRequestContext {
  readonly businessDate: string;
  readonly userId: string;
}

export interface SettlementDetailsDataSourceCallbacks {
  readonly onError: (message: string) => void;
  readonly onLoadingChange: (loading: boolean) => void;
  readonly onResult: (result: SettlementDetailsSearchResult) => void;
}

export class SettlementDetailsDataSource implements IServerSideDatasource<SettlementDetail> {
  private readonly subscriptions = new Map<number, Subscription>();
  private requestSequence = 0;
  private activeRequestCount = 0;

  constructor(
    private readonly gateway: SettlementDetailsGateway,
    private readonly context: SettlementDetailsDataSourceContext,
    private readonly callbacks: SettlementDetailsDataSourceCallbacks,
  ) {}

  getRows(params: IServerSideGetRowsParams<SettlementDetail>): void {
    const query = mapServerSideRequest(params.request, {
      businessDate: this.context.businessDate(),
      userId: this.context.userId,
    });
    const requestId = ++this.requestSequence;

    this.activeRequestCount += 1;
    this.callbacks.onLoadingChange(true);

    const subscription = this.gateway
      .search(query)
      .pipe(finalize(() => this.completeRequest(requestId)))
      .subscribe({
        next: (result) => {
          this.callbacks.onResult(result);
          params.success({ rowData: [...result.rows], rowCount: result.totalCount });
        },
        error: () => {
          this.callbacks.onError(
            'Settlement details could not be loaded. Refresh the panel to try again.',
          );
          params.fail();
        },
      });

    if (!subscription.closed) {
      this.subscriptions.set(requestId, subscription);
    }
  }

  destroy(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }

    this.subscriptions.clear();
    this.activeRequestCount = 0;
    this.callbacks.onLoadingChange(false);
  }

  private completeRequest(requestId: number): void {
    this.subscriptions.delete(requestId);
    this.activeRequestCount = Math.max(0, this.activeRequestCount - 1);
    this.callbacks.onLoadingChange(this.activeRequestCount > 0);
  }
}

export function mapServerSideRequest(
  request: IServerSideGetRowsRequest,
  context: SettlementDetailsRequestContext,
): SettlementDetailsSearchQuery {
  const offset = request.startRow ?? 0;
  const endRow = request.endRow ?? offset + 100;

  return {
    schemaVersion: 1,
    userId: context.userId,
    businessDate: context.businessDate,
    offset,
    limit: Math.min(500, Math.max(1, endRow - offset)),
    filters: mapFilterModel(request.filterModel),
    sort: request.sortModel.flatMap(({ colId, sort }) =>
      isSettlementDetailField(colId) && (sort === 'asc' || sort === 'desc')
        ? [{ field: colId, direction: sort }]
        : [],
    ),
  };
}

function mapFilterModel(
  filterModel: IServerSideGetRowsRequest['filterModel'],
): SettlementTextFilter[] {
  if (!isRecord(filterModel) || isAdvancedFilterModel(filterModel)) {
    return [];
  }

  return Object.entries(filterModel as FilterModel).flatMap(([field, model]) => {
    if (!isSettlementDetailField(field) || !isRecord(model)) {
      return [];
    }

    const operator = model['type'];
    const filterValue = model['filter'];

    if (!isTextFilterOperator(operator)) {
      return [];
    }

    if (operator !== 'blank' && operator !== 'notBlank' && typeof filterValue !== 'string') {
      return [];
    }

    return [
      {
        field,
        operator,
        value: typeof filterValue === 'string' ? filterValue.trim() : null,
      },
    ];
  });
}

function isSettlementDetailField(value: string): value is SettlementDetailField {
  return SETTLEMENT_DETAIL_FIELD_SET.has(value);
}

function isTextFilterOperator(value: unknown): value is SettlementTextFilterOperator {
  return typeof value === 'string' && TEXT_FILTER_OPERATORS.has(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAdvancedFilterModel(value: Readonly<Record<string, unknown>>): boolean {
  return 'filterType' in value && value['filterType'] === 'join';
}
