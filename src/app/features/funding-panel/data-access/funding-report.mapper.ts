import { asDecimalString } from '../domain/decimal-value';
import {
  type FundingReport,
  type FundingRow,
  type FundingValueMap,
  type PeriodId,
} from '../domain/funding-report';
import { assertValidFundingReport, FundingPanelContractError } from '../domain/report-validator';
import type { FundingReportDto } from './funding-panel.dto';
import { fundingReportSchema } from './funding-panel.schema';

export function parseFundingReportResponse(candidate: unknown): FundingReport {
  const result = fundingReportSchema.safeParse(candidate);

  if (!result.success) {
    throw new FundingPanelContractError(
      result.error.issues.map((issue) => ({
        code: 'INVALID_RESPONSE_SCHEMA',
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return mapFundingReportDto(result.data);
}

export function mapFundingReportDto(dto: FundingReportDto): FundingReport {
  const report: FundingReport = {
    ...dto,
    periods: dto.periods.map((period) => ({ ...period })),
    rows: dto.rows.map(mapRow),
  };

  assertValidFundingReport(report);

  return report;
}

function mapRow(row: FundingReportDto['rows'][number]): FundingRow {
  return {
    ...row,
    calculation:
      row.calculation === null
        ? null
        : {
            ...row.calculation,
            rowIds: [...row.calculation.rowIds],
          },
    values: mapValues(row.values),
  };
}

function mapValues(values: FundingReportDto['rows'][number]['values']): FundingValueMap {
  return Object.fromEntries(
    Object.entries(values).map(([periodId, value]) => [
      periodId as PeriodId,
      value === null ? null : asDecimalString(value),
    ]),
  ) as FundingValueMap;
}
