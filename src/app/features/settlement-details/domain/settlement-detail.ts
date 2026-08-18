export const SETTLEMENT_DETAIL_FIELDS = [
  'settlementMode',
  'activityType',
  'settlementStatus',
  'managerCode',
  'managerName',
  'lineOfBusiness',
  'accountId',
  'accountName',
  'cusip',
  'productId',
  'securityDescription',
  'isin',
  'sedol',
  'assetType',
  'assetSubClass',
  'blotterCode',
  'bookingReferenceId',
  'source',
  'tradeType',
  'tradeId',
  'tradedQuantity',
  'tradeNetAmount',
  'settledQuantity',
  'settlementNetAmount',
  'settlementCurrency',
] as const;

export type SettlementDetailField = (typeof SETTLEMENT_DETAIL_FIELDS)[number];

export interface SettlementDetail {
  readonly recordId: string;
  readonly settlementMode: string;
  readonly activityType: string;
  readonly settlementStatus: string;
  readonly managerCode: string;
  readonly managerName: string;
  readonly lineOfBusiness: string;
  readonly accountId: string;
  readonly accountName: string;
  readonly cusip: string;
  readonly productId: string;
  readonly securityDescription: string;
  readonly isin: string;
  readonly sedol: string;
  readonly assetType: string;
  readonly assetSubClass: string;
  readonly blotterCode: string;
  readonly bookingReferenceId: string;
  readonly source: string;
  readonly tradeType: string;
  readonly tradeId: string;
  readonly tradedQuantity: number;
  readonly tradeNetAmount: number;
  readonly settledQuantity: number;
  readonly settlementNetAmount: number;
  readonly settlementCurrency: string;
}

export type SettlementSortDirection = 'asc' | 'desc';

export interface SettlementSort {
  readonly field: SettlementDetailField;
  readonly direction: SettlementSortDirection;
}

export type SettlementTextFilterOperator =
  | 'blank'
  | 'contains'
  | 'endsWith'
  | 'equals'
  | 'notBlank'
  | 'notContains'
  | 'notEqual'
  | 'startsWith';

export interface SettlementTextFilter {
  readonly field: SettlementDetailField;
  readonly operator: SettlementTextFilterOperator;
  readonly value: string | null;
}

export interface SettlementDetailsSearchQuery {
  readonly schemaVersion: 1;
  readonly userId: string;
  readonly businessDate: string;
  readonly offset: number;
  readonly limit: number;
  readonly filters: readonly SettlementTextFilter[];
  readonly sort: readonly SettlementSort[];
}

export interface SettlementDetailsSearchResult {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly asOf: string;
  readonly totalCount: number;
  readonly rows: readonly SettlementDetail[];
}
