import type { DecimalString } from '../domain/decimal-value';
import {
  isEditablePeriodId,
  PERIOD_IDS,
  type EditablePeriodId,
  type FundingReport,
  type FundingRowKind,
  type FundingRowValueMode,
  type PeriodId,
  type ReportPeriod,
} from '../domain/funding-report';

export type FundingGridValue = DecimalString | null;

export interface FundingGridCellViewModel {
  readonly dirty: boolean;
  readonly editable: boolean;
  readonly preview: boolean;
  readonly validationMessage: string | null;
  readonly value: FundingGridValue;
}

export type FundingGridCellMap = Readonly<Record<PeriodId, FundingGridCellViewModel>>;

export interface FundingGridRowViewModel {
  readonly cells: FundingGridCellMap;
  readonly code: string;
  readonly depth: 0 | 1 | 2;
  readonly displayOrder: number;
  readonly id: string;
  readonly kind: FundingRowKind;
  readonly label: string;
  readonly valueMode: FundingRowValueMode;
}

export interface FundingGridViewModel {
  readonly asOf: string;
  readonly businessDate: string;
  readonly currency: string;
  readonly panelCode: string;
  readonly periods: readonly ReportPeriod[];
  readonly rows: readonly FundingGridRowViewModel[];
  readonly timezone: string;
  readonly title: string;
  readonly version: number;
}

export type DirtyFundingCells = Readonly<
  Record<string, Readonly<Partial<Record<EditablePeriodId, DecimalString>>>>
>;

export interface ActiveFundingCell {
  readonly periodId: EditablePeriodId;
  readonly rowId: string;
  readonly validationMessage: string | null;
}

export function toFundingGridViewModel(
  report: FundingReport,
  dirtyCells: DirtyFundingCells,
  activeCell: ActiveFundingCell | null,
): FundingGridViewModel {
  return {
    asOf: report.asOf,
    businessDate: report.businessDate,
    currency: report.currency,
    panelCode: report.panelCode,
    periods: report.periods,
    rows: report.rows.map((row) => ({
      cells: Object.fromEntries(
        PERIOD_IDS.map((periodId) => {
          const isActive = activeCell?.rowId === row.id && activeCell.periodId === periodId;
          const isEditablePeriod = isEditablePeriodId(periodId);

          return [
            periodId,
            {
              dirty: isEditablePeriod && dirtyCells[row.id]?.[periodId] !== undefined,
              editable:
                isEditablePeriod &&
                report.periods.find(({ id }) => id === periodId)?.editable === true &&
                row.valueMode === 'input' &&
                report.permissions.canEdit &&
                report.permissions.canSave,
              preview: isActive,
              validationMessage: isActive ? activeCell.validationMessage : null,
              value: row.values[periodId],
            },
          ];
        }),
      ) as FundingGridCellMap,
      code: row.code,
      depth: row.depth,
      displayOrder: row.displayOrder,
      id: row.id,
      kind: row.kind,
      label: row.label,
      valueMode: row.valueMode,
    })),
    timezone: report.timezone,
    title: report.title,
    version: report.version,
  };
}
