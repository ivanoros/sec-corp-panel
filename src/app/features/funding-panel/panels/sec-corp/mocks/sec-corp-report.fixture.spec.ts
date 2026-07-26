import { findCalculationMismatches } from '../../../domain/report-calculator';
import { parseFundingReportResponse } from '../../../data-access/funding-report.mapper';
import { FundingPanelContractError } from '../../../domain/report-validator';
import { SEC_CORP_ROW_CATALOG } from '../sec-corp-row-catalog';
import { createSecCorpReportFixture, SEC_CORP_REPORT_FIXTURE } from './sec-corp-report.fixture';

describe('Sec Corp report fixture', () => {
  it('contains the complete ordered target catalog', () => {
    const report = createSecCorpReportFixture();

    expect(report.rows).toHaveLength(37);
    expect(report.rows.map(({ id, label }) => ({ id, label }))).toEqual(
      SEC_CORP_ROW_CATALOG.map(({ id, label }) => ({ id, label })),
    );
    expect(report.rows.every((row) => !row.label.includes('?'))).toBe(true);
  });

  it('records all six placeholder mappings from the source panel', () => {
    const mappedRows = SEC_CORP_ROW_CATALOG.filter((row) => 'sourceLabel' in row);

    expect(mappedRows).toHaveLength(6);
  });

  it('uses the approved period labels and editability', () => {
    const report = createSecCorpReportFixture();

    expect(report.periods.map(({ label, editable }) => ({ label, editable }))).toEqual([
      { label: '8:30', editable: true },
      { label: '11:30', editable: true },
      { label: '1:30', editable: true },
      { label: 'LIVE', editable: false },
      { label: 'Opps funding', editable: false },
    ]);
  });

  it('reconciles every calculated value and the source end-of-day total', () => {
    const report = createSecCorpReportFixture();
    const endOfDay = report.rows.find((row) => row.id === 'end-of-day');

    expect(findCalculationMismatches(report)).toEqual([]);
    expect(endOfDay?.values.snapshot0830).toBe('4802238823.83');
  });

  it('rejects a malformed runtime payload', () => {
    const malformedFixture = structuredClone(SEC_CORP_REPORT_FIXTURE);

    if (!isRecord(malformedFixture)) {
      throw new Error('Expected the fixture to be an object.');
    }

    malformedFixture['version'] = 0;

    expect(() => parseFundingReportResponse(malformedFixture)).toThrow(FundingPanelContractError);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
