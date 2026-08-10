import { Injectable } from '@angular/core';
import { defer, delay, of, type Observable } from 'rxjs';

import type {
  SettlementDetail,
  SettlementDetailField,
  SettlementDetailsSearchQuery,
  SettlementDetailsSearchResult,
  SettlementSort,
  SettlementTextFilter,
} from '../domain/settlement-detail';
import type { SettlementDetailsGateway } from './settlement-details.gateway';
import { settlementDetailsSearchRequestSchema } from './settlement-details.schema';

export const MOCK_SETTLEMENT_DETAIL_COUNT = 500_000;

const SETTLEMENT_MODES = ['CNS', 'DVP/RVP'] as const;
const ACTIVITY_TYPES = [
  'Prime Broker',
  'Other Agency and Principal',
  'Cash Equity Client',
  'Transfer as Trade',
  'Other non-CNS Activity',
  'PB Done With',
] as const;
const MANAGERS = [
  ['31R', 'Walley Capital LLC', 'PB'],
  ['59V', 'GES Manager', 'GES'],
  ['49L', 'Marshall Wace LLP', 'PB'],
  ['32Q', 'Millennium International', 'PB'],
  ['01K', 'BNP Paribas Financial Markets', 'ARB'],
  ['35Q', 'AQR Capital Management', 'PB'],
  ['39R', 'Voleon Capital Management', 'PB'],
  ['42M', 'Jane Street', 'PB'],
  ['40P', 'USFRIA', 'PB'],
  ['13I', 'Maverick Capital Ltd', 'PB'],
  ['34S', 'Citadel Securities LLC', 'PB'],
  ['43S', 'BlackRock Institutional', 'PB'],
  ['00N', 'D. E. Shaw & Co LP', 'PB'],
  ['34Q', 'ExodusPoint Capital', 'PB'],
] as const;
const SECURITIES = [
  ['05278C107', '462106', 'AUTOHOME INC-ADR', 'US05278C1071', 'BH5QGR0', 'Equity', 'ADR'],
  ['03770Y107', '5512926', 'APNIMED INC', 'US03770Y1073', 'BXJMH95', 'Equity', 'Common Stock'],
  ['042068205', '2795111', 'ARM HOLDINGS PLC-ADR', 'US0420682058', 'BN5P5P7', 'Equity', 'ADR'],
  [
    '035710839',
    '2355686',
    'ANNALY CAPITAL MANAGEMENT',
    'US0357108390',
    'BPMQ7X2',
    'Equity',
    'REIT',
  ],
  ['922908553', '22853', 'Vanguard Real Estate ETF', 'US9229085538', 'B031NY4', 'Fund', 'ETP'],
  ['G1151C101', '9505', 'ACCENTURE PLC-CL A', 'IE00B4BNMY34', 'B4BNMY3', 'Equity', 'Common Stock'],
  ['172908105', '11952', 'CINTAS CORP', 'US1729081059', '2197137', 'Equity', 'Common Stock'],
  ['89628B107', '489665', 'TRINET GROUP INC', 'US89628B1079', '2693914', 'Equity', 'Common Stock'],
  [
    '03769M106',
    '2087853',
    'APOLLO GLOBAL MANAGEMENT',
    'US03769M1062',
    'BN44JF5',
    'Equity',
    'Common Stock',
  ],
  ['494550AL0', '24515', 'KINDER MORGAN EN 7.25', 'US494550AL04', '2862952', 'Bond', 'US DOMESTIC'],
  ['461202103', '14736', 'INTUIT INC', 'US4612021034', '2459020', 'Equity', 'Common Stock'],
  ['46432F388', '421442', 'iShares MSCI USA Value ETF', 'US46432F3881', 'B8PLRM4', 'Fund', 'ETP'],
] as const;
const TRADE_TYPES = ['Buy Long', 'Sell Long', 'Sell Short', 'Cover Short'] as const;
const BLOTTER_CODES = ['1W', '36', '6X', '6M', '6P', '3W'] as const;

@Injectable()
export class MockSettlementDetailsGateway implements SettlementDetailsGateway {
  search(query: SettlementDetailsSearchQuery): Observable<SettlementDetailsSearchResult> {
    const validatedQuery = settlementDetailsSearchRequestSchema.parse(query);

    return defer(() => of(searchMockSettlementDetails(validatedQuery))).pipe(delay(90));
  }
}

export function searchMockSettlementDetails(
  query: SettlementDetailsSearchQuery,
): SettlementDetailsSearchResult {
  const directPage = query.filters.length === 0 && query.sort.length === 0;
  const indices = directPage ? null : selectIndices(query);
  const totalCount = indices?.length ?? MOCK_SETTLEMENT_DETAIL_COUNT;
  const pageLength = Math.max(0, Math.min(query.limit, totalCount - query.offset));
  const pageIndices =
    indices?.slice(query.offset, query.offset + query.limit) ??
    Array.from({ length: pageLength }, (_, pageIndex) => query.offset + pageIndex);

  return {
    schemaVersion: 1,
    requestId: `mock-${query.businessDate}-${query.offset}-${query.limit}`,
    asOf: `${query.businessDate}T14:00:00-04:00`,
    totalCount,
    rows: pageIndices.map((index) => createMockSettlementDetail(index)),
  };
}

export function createMockSettlementDetail(index: number): SettlementDetail {
  const manager = MANAGERS[index % MANAGERS.length] ?? MANAGERS[0];
  const security = SECURITIES[index % SECURITIES.length] ?? SECURITIES[0];
  const sequence = String(index + 1).padStart(8, '0');

  return {
    recordId: `settlement-${sequence}`,
    settlementMode: SETTLEMENT_MODES[index % SETTLEMENT_MODES.length] ?? 'CNS',
    activityType: ACTIVITY_TYPES[index % ACTIVITY_TYPES.length] ?? 'Prime Broker',
    settlementStatus: index % 17 === 0 ? 'Failed' : index % 11 === 0 ? 'Partial' : 'Pending',
    managerCode: manager[0],
    managerName: manager[1],
    lineOfBusiness: manager[2],
    accountId: String(31_300_000 + ((index * 7919) % 70_000_000)),
    accountName: `${manager[1]} ${index % 5 === 0 ? 'Main' : 'Portfolio'}`,
    cusip: security[0],
    productId: security[1],
    securityDescription: security[2],
    isin: security[3],
    sedol: security[4],
    assetType: security[5],
    assetSubClass: security[6],
    blotterCode: BLOTTER_CODES[index % BLOTTER_CODES.length] ?? '1W',
    bookingReferenceId: `${manager[0]}ZZV${index.toString(36).toUpperCase().padStart(9, '0')}`,
    source: index % 13 === 0 ? 'Intraday' : 'SOD-Batch',
    tradeType: TRADE_TYPES[index % TRADE_TYPES.length] ?? 'Buy Long',
    tradeId: `TRD-${sequence}`,
  };
}

function selectIndices(query: SettlementDetailsSearchQuery): number[] {
  const indices: number[] = [];

  for (let index = 0; index < MOCK_SETTLEMENT_DETAIL_COUNT; index += 1) {
    if (query.filters.every((filter) => matchesFilter(index, filter))) {
      indices.push(index);
    }
  }

  if (query.sort.length > 0) {
    indices.sort((left, right) => compareIndices(left, right, query.sort));
  }

  return indices;
}

function compareIndices(left: number, right: number, sort: readonly SettlementSort[]): number {
  for (const rule of sort) {
    const comparison = getFieldValue(left, rule.field).localeCompare(
      getFieldValue(right, rule.field),
      'en-US',
      { numeric: true, sensitivity: 'base' },
    );

    if (comparison !== 0) {
      return rule.direction === 'asc' ? comparison : -comparison;
    }
  }

  return left - right;
}

function matchesFilter(index: number, filter: SettlementTextFilter): boolean {
  const actual = getFieldValue(index, filter.field).toLocaleLowerCase();
  const expected = filter.value?.toLocaleLowerCase() ?? '';

  switch (filter.operator) {
    case 'blank':
      return actual.length === 0;
    case 'contains':
      return actual.includes(expected);
    case 'endsWith':
      return actual.endsWith(expected);
    case 'equals':
      return actual === expected;
    case 'notBlank':
      return actual.length > 0;
    case 'notContains':
      return !actual.includes(expected);
    case 'notEqual':
      return actual !== expected;
    case 'startsWith':
      return actual.startsWith(expected);
  }
}

function getFieldValue(index: number, field: SettlementDetailField): string {
  const manager = MANAGERS[index % MANAGERS.length] ?? MANAGERS[0];
  const security = SECURITIES[index % SECURITIES.length] ?? SECURITIES[0];
  const sequence = String(index + 1).padStart(8, '0');

  switch (field) {
    case 'settlementMode':
      return SETTLEMENT_MODES[index % SETTLEMENT_MODES.length] ?? 'CNS';
    case 'activityType':
      return ACTIVITY_TYPES[index % ACTIVITY_TYPES.length] ?? 'Prime Broker';
    case 'settlementStatus':
      return index % 17 === 0 ? 'Failed' : index % 11 === 0 ? 'Partial' : 'Pending';
    case 'managerCode':
      return manager[0];
    case 'managerName':
      return manager[1];
    case 'lineOfBusiness':
      return manager[2];
    case 'accountId':
      return String(31_300_000 + ((index * 7919) % 70_000_000));
    case 'accountName':
      return `${manager[1]} ${index % 5 === 0 ? 'Main' : 'Portfolio'}`;
    case 'cusip':
      return security[0];
    case 'productId':
      return security[1];
    case 'securityDescription':
      return security[2];
    case 'isin':
      return security[3];
    case 'sedol':
      return security[4];
    case 'assetType':
      return security[5];
    case 'assetSubClass':
      return security[6];
    case 'blotterCode':
      return BLOTTER_CODES[index % BLOTTER_CODES.length] ?? '1W';
    case 'bookingReferenceId':
      return `${manager[0]}ZZV${index.toString(36).toUpperCase().padStart(9, '0')}`;
    case 'source':
      return index % 13 === 0 ? 'Intraday' : 'SOD-Batch';
    case 'tradeType':
      return TRADE_TYPES[index % TRADE_TYPES.length] ?? 'Buy Long';
    case 'tradeId':
      return `TRD-${sequence}`;
  }
}
