import { parseFundingReportResponse } from '../../../data-access/funding-report.mapper';
import { findCalculationMismatches } from '../../../domain/report-calculator';
import { FundingPanelContractError } from '../../../domain/report-validator';
import { PBIL_ROW_CATALOG } from '../pbil-row-catalog';
import { PBIL_PANEL_DEFINITION } from '../pbil-panel.definition';
import { createPbilReportFixture, PBIL_REPORT_FIXTURE } from './pbil-report.fixture';

describe('PBIL report fixture', () => {
  it('contains the complete ordered target catalog', () => {
    const report = createPbilReportFixture();

    expect(report.rows).toHaveLength(27);
    expect(report.rows.map(({ id, label }) => ({ id, label }))).toEqual(
      PBIL_ROW_CATALOG.map(({ id, label }) => ({ id, label })),
    );
    expect(report.rows.every((row) => !row.label.includes('?'))).toBe(true);
  });

  it('uses the confirmed PBIL row names', () => {
    const labels = createPbilReportFixture().rows.map(({ label }) => label);

    expect(labels).toContain('Slab activity (2147)');
    expect(labels).toContain('Prime reserve requirement');
    expect(labels).toContain('15C3 Withdrawal');
    expect(labels).toContain('PBIL EOD Balance');
    expect(labels).toContain('PBIL/ARB Margin');
    expect(labels).toContain('Credit prime repo activity');
    expect(labels).toContain('Client activity / Cash wires');
  });

  it('documents every provisional source allocation in the row catalog', () => {
    const provisionalRows = PBIL_ROW_CATALOG.filter((row) => 'assumption' in row);

    expect(provisionalRows.map(({ id }) => id)).toEqual([
      'slabActivity2884',
      'slabActivity2147',
      'arbMtmWires',
      'fxSwaps',
      'usTreasuryRepoPnv',
      'equityJpm',
      'equityDis',
      'equityE87',
    ]);
  });

  it('reconciles the source PBIL projected balances exactly', () => {
    const report = createPbilReportFixture();
    const endOfDay = report.rows.find(({ id }) => id === 'endOfDay');

    expect(findCalculationMismatches(report)).toEqual([]);
    expect(endOfDay?.values).toEqual({
      snapshot0830: '9705000000.00',
      snapshot1130: '9358000000.00',
      snapshot1330: '9058000000.00',
      live: '0.00',
      opportunityFunding: '0.00',
    });
  });

  it('rejects a malformed PBIL runtime payload', () => {
    const malformedFixture = structuredClone(PBIL_REPORT_FIXTURE);

    if (!isRecord(malformedFixture)) {
      throw new Error('Expected the fixture to be an object.');
    }

    malformedFixture['version'] = -1;

    expect(() => parseFundingReportResponse(malformedFixture, PBIL_PANEL_DEFINITION)).toThrow(
      FundingPanelContractError,
    );
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
