import type { DecimalString } from './decimal-value';

export const PERIOD_IDS = [
  'snapshot0830',
  'snapshot1130',
  'snapshot1330',
  'live',
  'opportunityFunding',
] as const;

export const SNAPSHOT_PERIOD_IDS = ['snapshot0830', 'snapshot1130', 'snapshot1330'] as const;
export const EDITABLE_PERIOD_IDS = [...SNAPSHOT_PERIOD_IDS, 'opportunityFunding'] as const;

export type PeriodId = (typeof PERIOD_IDS)[number];
export type SnapshotPeriodId = (typeof SNAPSHOT_PERIOD_IDS)[number];
export type EditablePeriodId = (typeof EDITABLE_PERIOD_IDS)[number];
export type PeriodKind = 'snapshot' | 'live' | 'opportunity';
export type FundingRowKind =
  'opening-balance' | 'section' | 'detail' | 'subtotal' | 'closing-balance';
export type FundingRowValueMode = 'input' | 'calculated' | 'section';

export interface FundingReportPermissions {
  readonly canEdit: boolean;
  readonly canSave: boolean;
}

export interface ReportPeriod {
  readonly id: PeriodId;
  readonly label: string;
  readonly kind: PeriodKind;
  readonly editable: boolean;
}

export interface SumCalculation {
  readonly kind: 'sum';
  readonly rowIds: readonly string[];
}

export type FundingValueMap = Readonly<Record<PeriodId, DecimalString | null>>;

export interface FundingRow {
  readonly id: string;
  readonly code: string;
  readonly label: string;
  readonly displayOrder: number;
  readonly depth: 0 | 1 | 2;
  readonly kind: FundingRowKind;
  readonly valueMode: FundingRowValueMode;
  readonly calculation: SumCalculation | null;
  readonly values: FundingValueMap;
}

export interface FundingReport {
  readonly schemaVersion: 1;
  readonly reportId: string;
  readonly panelCode: string;
  readonly title: string;
  readonly businessDate: string;
  readonly currency: string;
  readonly timezone: string;
  readonly asOf: string;
  readonly version: number;
  readonly permissions: FundingReportPermissions;
  readonly periods: readonly ReportPeriod[];
  readonly rows: readonly FundingRow[];
}

export interface SaveFundingReportCommand {
  readonly schemaVersion: 1;
  readonly expectedVersion: number;
  readonly report: FundingReport;
}

export function isSnapshotPeriodId(value: string): value is SnapshotPeriodId {
  return SNAPSHOT_PERIOD_IDS.some((periodId) => periodId === value);
}

export function isEditablePeriodId(value: string): value is EditablePeriodId {
  return EDITABLE_PERIOD_IDS.some((periodId) => periodId === value);
}
