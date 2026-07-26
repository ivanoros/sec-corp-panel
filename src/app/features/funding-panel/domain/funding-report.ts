import type { DecimalString } from './decimal-value';

export const PERIOD_IDS = [
  'snapshot0830',
  'snapshot1130',
  'snapshot1330',
  'live',
  'opportunityFunding',
] as const;

export const SNAPSHOT_PERIOD_IDS = ['snapshot0830', 'snapshot1130', 'snapshot1330'] as const;

export type PeriodId = (typeof PERIOD_IDS)[number];
export type SnapshotPeriodId = (typeof SNAPSHOT_PERIOD_IDS)[number];
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

export type SnapshotValueMap = Readonly<Record<SnapshotPeriodId, DecimalString>>;

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
  readonly reportId: string;
  readonly panelCode: string;
  readonly businessDate: string;
  readonly expectedVersion: number;
  readonly snapshotValues: Readonly<Record<string, SnapshotValueMap>>;
}

export function selectSnapshotValues(
  report: FundingReport,
): Readonly<Record<string, SnapshotValueMap>> {
  return Object.fromEntries(
    report.rows
      .filter((row) => row.valueMode === 'input')
      .map((row) => [
        row.id,
        {
          snapshot0830: requireDecimalValue(row, 'snapshot0830'),
          snapshot1130: requireDecimalValue(row, 'snapshot1130'),
          snapshot1330: requireDecimalValue(row, 'snapshot1330'),
        },
      ]),
  );
}

function requireDecimalValue(row: FundingRow, periodId: SnapshotPeriodId): DecimalString {
  const value = row.values[periodId];

  if (value === null) {
    throw new Error(`Input row ${row.id} has no value for ${periodId}.`);
  }

  return value;
}
