import { findCalculationMismatches, FundingCalculationError } from './report-calculator';
import {
  EDITABLE_PERIOD_IDS,
  PERIOD_IDS,
  type FundingReport,
  type FundingRow,
} from './funding-report';

export interface FundingContractIssue {
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export function validateFundingReport(report: FundingReport): readonly FundingContractIssue[] {
  const issues: FundingContractIssue[] = [];
  const periodIds = new Set<string>();
  const rowIds = new Set<string>();
  const rowsById = new Map(report.rows.map((row) => [row.id, row]));
  const displayOrders = new Set<number>();

  if (!Number.isSafeInteger(report.version) || report.version < 1) {
    issues.push(issue('INVALID_VERSION', 'version', 'Version must be a positive integer.'));
  }

  for (const [periodIndex, period] of report.periods.entries()) {
    const path = `periods[${periodIndex}]`;

    if (periodIds.has(period.id)) {
      issues.push(issue('DUPLICATE_PERIOD_ID', `${path}.id`, `Duplicate period ${period.id}.`));
    }

    periodIds.add(period.id);

    const shouldBeEditable = EDITABLE_PERIOD_IDS.includes(
      period.id as (typeof EDITABLE_PERIOD_IDS)[number],
    );

    if (period.editable !== shouldBeEditable) {
      issues.push(
        issue(
          'INVALID_PERIOD_EDITABILITY',
          `${path}.editable`,
          `${period.id} has invalid editability.`,
        ),
      );
    }
  }

  if (!sameMembers(periodIds, new Set(PERIOD_IDS))) {
    issues.push(
      issue('INVALID_PERIOD_SET', 'periods', `Periods must be exactly: ${PERIOD_IDS.join(', ')}.`),
    );
  }

  for (const [rowIndex, row] of report.rows.entries()) {
    const path = `rows[${rowIndex}]`;

    if (rowIds.has(row.id)) {
      issues.push(issue('DUPLICATE_ROW_ID', `${path}.id`, `Duplicate row ${row.id}.`));
    }

    rowIds.add(row.id);

    if (displayOrders.has(row.displayOrder)) {
      issues.push(
        issue(
          'DUPLICATE_DISPLAY_ORDER',
          `${path}.displayOrder`,
          `Duplicate display order ${row.displayOrder}.`,
        ),
      );
    }

    displayOrders.add(row.displayOrder);

    if (row.label.includes('?')) {
      issues.push(
        issue('UNRESOLVED_ROW_LABEL', `${path}.label`, 'Placeholder row labels are not allowed.'),
      );
    }

    validateRowShape(row, path, issues);
  }

  for (const [rowIndex, row] of report.rows.entries()) {
    if (row.calculation === null) {
      continue;
    }

    const path = `rows[${rowIndex}].calculation.rowIds`;
    const operandIds = new Set<string>();

    for (const operandRowId of row.calculation.rowIds) {
      if (!rowIds.has(operandRowId)) {
        issues.push(
          issue(
            'UNKNOWN_CALCULATION_OPERAND',
            path,
            `${row.id} references unknown row ${operandRowId}.`,
          ),
        );
      }

      if (rowsById.get(operandRowId)?.valueMode === 'section') {
        issues.push(
          issue(
            'SECTION_CALCULATION_OPERAND',
            path,
            `${row.id} cannot calculate from section row ${operandRowId}.`,
          ),
        );
      }

      if (operandRowId === row.id) {
        issues.push(
          issue('SELF_REFERENCING_CALCULATION', path, `${row.id} cannot reference itself.`),
        );
      }

      if (operandIds.has(operandRowId)) {
        issues.push(
          issue(
            'DUPLICATE_CALCULATION_OPERAND',
            path,
            `${row.id} references ${operandRowId} more than once.`,
          ),
        );
      }

      operandIds.add(operandRowId);
    }
  }

  if (issues.length === 0) {
    try {
      for (const mismatch of findCalculationMismatches(report)) {
        issues.push(
          issue(
            'CALCULATION_MISMATCH',
            `rows.${mismatch.rowId}.values.${mismatch.periodId}`,
            `Expected ${mismatch.expected} but received ${mismatch.actual}.`,
          ),
        );
      }
    } catch (error: unknown) {
      if (error instanceof FundingCalculationError) {
        issues.push(issue('INVALID_CALCULATION_GRAPH', 'rows', error.message));
      } else {
        throw error;
      }
    }
  }

  return issues;
}

export function assertValidFundingReport(report: FundingReport): void {
  const issues = validateFundingReport(report);

  if (issues.length > 0) {
    throw new FundingPanelContractError(issues);
  }
}

function validateRowShape(row: FundingRow, path: string, issues: FundingContractIssue[]): void {
  const values = PERIOD_IDS.map((periodId) => row.values[periodId]);

  if (row.valueMode === 'section') {
    if (row.kind !== 'section' || row.calculation !== null) {
      issues.push(
        issue('INVALID_SECTION_ROW', path, `${row.id} must use section kind with no calculation.`),
      );
    }

    if (values.some((value) => value !== null)) {
      issues.push(
        issue('SECTION_HAS_VALUES', `${path}.values`, `${row.id} must have null values.`),
      );
    }

    return;
  }

  if (values.some((value) => value === null)) {
    issues.push(
      issue(
        'NUMERIC_ROW_HAS_NULL',
        `${path}.values`,
        `${row.id} must provide explicit numeric values for every period.`,
      ),
    );
  }

  if (row.valueMode === 'calculated' && row.calculation === null) {
    issues.push(
      issue('MISSING_CALCULATION', `${path}.calculation`, `${row.id} requires a calculation.`),
    );
  }

  if (row.valueMode === 'input' && row.calculation !== null) {
    issues.push(
      issue(
        'INPUT_HAS_CALCULATION',
        `${path}.calculation`,
        `${row.id} cannot declare a calculation.`,
      ),
    );
  }
}

function sameMembers<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function issue(code: string, path: string, message: string): FundingContractIssue {
  return { code, path, message };
}

export class FundingPanelContractError extends Error {
  constructor(readonly issues: readonly FundingContractIssue[]) {
    super(issues.map(({ path, message }) => `${path}: ${message}`).join('\n'));
    this.name = 'FundingPanelContractError';
  }
}
