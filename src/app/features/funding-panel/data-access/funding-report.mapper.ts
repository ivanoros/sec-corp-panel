import type { z } from 'zod';

import { asDecimalString } from '../domain/decimal-value';
import {
  createEmptyPeriodValues,
  type FundingPanelDefinition,
  type FundingRowDefinition,
} from '../domain/funding-panel-definition';
import {
  PERIOD_IDS,
  type FundingReport,
  type FundingRow,
  type FundingValueMap,
  type PeriodId,
  type SaveFundingReportCommand,
} from '../domain/funding-report';
import {
  assertValidFundingReport,
  type FundingContractIssue,
  FundingPanelContractError,
} from '../domain/report-validator';
import type {
  FundingReportDto,
  FundingReportPayloadDto,
  SaveFundingReportRequestDto,
} from './funding-panel.dto';
import { fundingReportSchema, saveFundingReportRequestSchema } from './funding-panel.schema';

export function parseFundingReportResponse(
  candidate: unknown,
  definition: FundingPanelDefinition,
): FundingReport {
  const result = fundingReportSchema.safeParse(candidate);

  if (!result.success) {
    throw schemaError(result.error.issues);
  }

  return assembleFundingReport(result.data, definition);
}

export function assembleFundingReport(
  dto: FundingReportDto,
  definition: FundingPanelDefinition,
): FundingReport {
  const issues = validateMatrix(dto, definition);

  if (issues.length > 0) {
    throw new FundingPanelContractError(issues);
  }

  const columns = new Map(
    dto.columns.map((column) => [
      column.snapshotId,
      new Map(
        Object.entries(column)
          .filter(([key]) => key !== 'snapshotId')
          .map(([rowId, value]) => [rowId, asDecimalString(value)]),
      ),
    ]),
  );
  const report: FundingReport = {
    schemaVersion: 1,
    reportId: dto.reportId,
    panelCode: dto.panelCode,
    title: definition.title,
    businessDate: dto.businessDate,
    currency: dto.currency,
    timezone: dto.timezone,
    asOf: dto.asOf,
    version: dto.version,
    userId: dto.userId,
    permissions: { ...dto.permissions },
    periods: definition.periods.map((period) => ({ ...period })),
    rows: definition.rows.map((row) => assembleRow(row, columns)),
  };

  assertValidFundingReport(report);
  return report;
}

export function serializeFundingReportResponse(
  report: FundingReport,
  definition: FundingPanelDefinition,
): FundingReportDto {
  return fundingReportSchema.parse({
    schemaVersion: 2,
    definitionVersion: definition.definitionVersion,
    ...serializeFundingReportPayload(report, definition),
  });
}

export function serializeSaveFundingReportRequest(
  command: SaveFundingReportCommand,
  definition: FundingPanelDefinition,
): SaveFundingReportRequestDto {
  return saveFundingReportRequestSchema.parse({
    schemaVersion: 2,
    definitionVersion: definition.definitionVersion,
    expectedVersion: command.expectedVersion,
    userId: command.userId,
    report: serializeFundingReportPayload(command.report, definition),
  });
}

function serializeFundingReportPayload(
  report: FundingReport,
  definition: FundingPanelDefinition,
): FundingReportPayloadDto {
  assertDefinitionMatchesReport(report, definition);
  assertValidFundingReport(report);
  const rows = new Map(report.rows.map((row) => [row.id, row]));

  return {
    reportId: report.reportId,
    panelCode: report.panelCode,
    businessDate: report.businessDate,
    currency: report.currency,
    timezone: report.timezone,
    asOf: report.asOf,
    version: report.version,
    userId: report.userId,
    permissions: { ...report.permissions },
    columns: definition.periods.map((period) => ({
      snapshotId: period.id,
      ...Object.fromEntries(
        definition.rows.flatMap((rowDefinition) => {
          if (rowDefinition.valueMode === 'section') {
            return [];
          }

          const value = rows.get(rowDefinition.id)?.values[period.id];

          if (value === undefined || value === null) {
            throw new FundingPanelContractError([
              issue(
                'MISSING_SERIALIZED_VALUE',
                `rows.${rowDefinition.id}.values.${period.id}`,
                `Cannot serialize missing value for ${rowDefinition.id}.${period.id}.`,
              ),
            ]);
          }

          return [[rowDefinition.id, value]];
        }),
      ),
    })),
  };
}

function assembleRow(
  definition: FundingRowDefinition,
  columns: ReadonlyMap<PeriodId, ReadonlyMap<string, ReturnType<typeof asDecimalString>>>,
): FundingRow {
  if (definition.valueMode === 'section') {
    return {
      ...definition,
      calculation: null,
      values: createEmptyPeriodValues(),
    };
  }

  const values = Object.fromEntries(
    PERIOD_IDS.map((periodId) => [periodId, columns.get(periodId)?.get(definition.id)]),
  ) as Partial<FundingValueMap>;

  return {
    ...definition,
    calculation:
      definition.calculation === null
        ? null
        : {
            ...definition.calculation,
            rowIds: [...definition.calculation.rowIds],
          },
    values: values as FundingValueMap,
  };
}

function validateMatrix(
  dto: FundingReportDto,
  definition: FundingPanelDefinition,
): readonly FundingContractIssue[] {
  const issues: FundingContractIssue[] = [];

  if (dto.panelCode !== definition.panelCode) {
    issues.push(
      issue(
        'PANEL_DEFINITION_MISMATCH',
        'panelCode',
        `Expected panel ${definition.panelCode} but received ${dto.panelCode}.`,
      ),
    );
  }

  if (dto.definitionVersion !== definition.definitionVersion) {
    issues.push(
      issue(
        'DEFINITION_VERSION_MISMATCH',
        'definitionVersion',
        `Expected definition version ${definition.definitionVersion} but received ${dto.definitionVersion}.`,
      ),
    );
  }

  const rowDefinitions = new Map<string, FundingRowDefinition>();

  for (const row of definition.rows) {
    if (rowDefinitions.has(row.id)) {
      issues.push(issue('DUPLICATE_DEFINITION_ROW', 'definition.rows', `Duplicate row ${row.id}.`));
    }

    rowDefinitions.set(row.id, row);
  }

  const columns = new Map<PeriodId, FundingReportDto['columns'][number]>();

  for (const [columnIndex, column] of dto.columns.entries()) {
    if (columns.has(column.snapshotId)) {
      issues.push(
        issue(
          'DUPLICATE_COLUMN',
          `columns[${columnIndex}].snapshotId`,
          `Duplicate snapshot ${column.snapshotId}.`,
        ),
      );
    }

    columns.set(column.snapshotId, column);
    const valueIds = new Set(Object.keys(column).filter((key) => key !== 'snapshotId'));

    for (const rowId of valueIds) {
      const path = `columns[${columnIndex}].${rowId}`;
      const rowDefinition = rowDefinitions.get(rowId);

      if (rowDefinition === undefined) {
        issues.push(issue('UNKNOWN_ROW_ID', path, `Unsupported row ID ${rowId}.`));
      } else if (rowDefinition.valueMode === 'section') {
        issues.push(issue('SECTION_HAS_BACKEND_VALUE', path, `${rowId} is a section row.`));
      }
    }

    for (const rowDefinition of definition.rows) {
      if (rowDefinition.valueMode !== 'section' && !valueIds.has(rowDefinition.id)) {
        issues.push(
          issue(
            'MISSING_ROW_VALUE',
            `columns[${columnIndex}]`,
            `Missing ${rowDefinition.id} value for ${column.snapshotId}.`,
          ),
        );
      }
    }
  }

  for (const periodId of PERIOD_IDS) {
    if (!columns.has(periodId)) {
      issues.push(issue('MISSING_COLUMN', 'columns', `Missing column ${periodId}.`));
    }
  }

  return issues;
}

function assertDefinitionMatchesReport(
  report: FundingReport,
  definition: FundingPanelDefinition,
): void {
  const reportIds = new Set(report.rows.map(({ id }) => id));
  const definitionIds = new Set(definition.rows.map(({ id }) => id));
  const issues: FundingContractIssue[] = [];

  if (report.panelCode !== definition.panelCode) {
    issues.push(
      issue(
        'PANEL_DEFINITION_MISMATCH',
        'panelCode',
        `Expected panel ${definition.panelCode} but received ${report.panelCode}.`,
      ),
    );
  }

  for (const rowId of reportIds) {
    if (!definitionIds.has(rowId)) {
      issues.push(issue('UNKNOWN_REPORT_ROW', 'rows', `Report contains unsupported row ${rowId}.`));
    }
  }

  for (const rowId of definitionIds) {
    if (!reportIds.has(rowId)) {
      issues.push(issue('MISSING_REPORT_ROW', 'rows', `Report is missing row ${rowId}.`));
    }
  }

  if (issues.length > 0) {
    throw new FundingPanelContractError(issues);
  }
}

function schemaError(issues: readonly z.ZodIssue[]): FundingPanelContractError {
  return new FundingPanelContractError(
    issues.map((schemaIssue) =>
      issue('INVALID_RESPONSE_SCHEMA', schemaIssue.path.join('.'), schemaIssue.message),
    ),
  );
}

function issue(code: string, path: string, message: string): FundingContractIssue {
  return { code, path, message };
}
