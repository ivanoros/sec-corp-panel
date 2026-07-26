import { decimalValuesEqual, sumDecimals, type DecimalString } from './decimal-value';
import {
  PERIOD_IDS,
  type FundingReport,
  type FundingValueMap,
  type PeriodId,
} from './funding-report';

export interface CalculationMismatch {
  readonly actual: DecimalString;
  readonly expected: DecimalString;
  readonly periodId: PeriodId;
  readonly rowId: string;
}

export function recalculateFundingReport(report: FundingReport): FundingReport {
  const rowById = new Map(report.rows.map((row) => [row.id, row]));
  const calculatedValues = new Map<string, FundingValueMap>();
  const visiting = new Set<string>();

  const resolveValues = (rowId: string): FundingValueMap => {
    const memoizedValues = calculatedValues.get(rowId);

    if (memoizedValues !== undefined) {
      return memoizedValues;
    }

    const row = rowById.get(rowId);

    if (row === undefined) {
      throw new FundingCalculationError(`Unknown calculation row: ${rowId}`);
    }

    if (row.valueMode !== 'calculated') {
      return row.values;
    }

    if (row.calculation === null) {
      throw new FundingCalculationError(`Calculated row ${row.id} has no calculation.`);
    }

    const calculation = row.calculation;

    if (visiting.has(row.id)) {
      throw new FundingCalculationError(`Calculation cycle detected at row ${row.id}.`);
    }

    visiting.add(row.id);

    const values = Object.fromEntries(
      PERIOD_IDS.map((periodId) => [
        periodId,
        sumDecimals(
          calculation.rowIds.map((operandRowId) =>
            requireValue(resolveValues(operandRowId), operandRowId, periodId),
          ),
        ),
      ]),
    ) as FundingValueMap;

    visiting.delete(row.id);
    calculatedValues.set(row.id, values);

    return values;
  };

  const rows = report.rows.map((row) =>
    row.valueMode === 'calculated'
      ? {
          ...row,
          values: resolveValues(row.id),
        }
      : row,
  );

  return {
    ...report,
    rows,
  };
}

export function findCalculationMismatches(report: FundingReport): readonly CalculationMismatch[] {
  const recalculatedReport = recalculateFundingReport(report);
  const originalRows = new Map(report.rows.map((row) => [row.id, row]));

  return recalculatedReport.rows.flatMap((recalculatedRow) => {
    if (recalculatedRow.valueMode !== 'calculated') {
      return [];
    }

    const originalRow = originalRows.get(recalculatedRow.id);

    if (originalRow === undefined) {
      throw new FundingCalculationError(`Original row ${recalculatedRow.id} is missing.`);
    }

    return PERIOD_IDS.flatMap((periodId) => {
      const actual = requireValue(originalRow.values, originalRow.id, periodId);
      const expected = requireValue(recalculatedRow.values, recalculatedRow.id, periodId);

      return decimalValuesEqual(actual, expected)
        ? []
        : [
            {
              actual,
              expected,
              periodId,
              rowId: originalRow.id,
            },
          ];
    });
  });
}

function requireValue(values: FundingValueMap, rowId: string, periodId: PeriodId): DecimalString {
  const value = values[periodId];

  if (value === null) {
    throw new FundingCalculationError(`Row ${rowId} has no numeric value for ${periodId}.`);
  }

  return value;
}

export class FundingCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FundingCalculationError';
  }
}
