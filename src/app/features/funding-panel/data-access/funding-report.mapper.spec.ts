import type { SaveFundingReportCommand } from '../domain/funding-report';
import { FundingPanelContractError } from '../domain/report-validator';
import {
  SEC_CORP_REPORT_FIXTURE,
  createSecCorpReportFixture,
} from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import { SEC_CORP_PANEL_DEFINITION } from '../panels/sec-corp/sec-corp-panel.definition';
import {
  parseFundingReportResponse,
  serializeFundingReportResponse,
  serializeSaveFundingReportRequest,
} from './funding-report.mapper';

describe('compact funding report mapping', () => {
  it('keeps presentation metadata out of the backend fixture', () => {
    const fixture = mutableFixture();

    expect(fixture).toMatchObject({ schemaVersion: 2, definitionVersion: 1 });
    expect(fixture).not.toHaveProperty('title');
    expect(fixture).not.toHaveProperty('periods');
    expect(fixture).not.toHaveProperty('rows');
  });

  it('assembles backend facts with frontend presentation metadata', () => {
    const report = parseFundingReportResponse(
      structuredClone(SEC_CORP_REPORT_FIXTURE),
      SEC_CORP_PANEL_DEFINITION,
    );
    const totalMargin = report.rows.find(({ id }) => id === 'totalMargin');

    expect(report.title).toBe('Sec Corp');
    expect(report.periods.map(({ label }) => label)).toEqual([
      '8:30',
      '11:30',
      '1:30',
      'LIVE',
      'Opps funding',
    ]);
    expect(totalMargin).toMatchObject({
      displayOrder: 110,
      kind: 'subtotal',
      label: 'Total margin',
      valueMode: 'calculated',
    });
    expect(totalMargin?.calculation?.rowIds).toContain('arbMtmWires');
  });

  it('serializes a complete column-oriented PUT without presentation metadata', () => {
    const report = createSecCorpReportFixture();
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: report.version,
      userId: 'e70165',
      report,
    };
    const request = serializeSaveFundingReportRequest(command, SEC_CORP_PANEL_DEFINITION);

    expect(request).toMatchObject({
      schemaVersion: 2,
      definitionVersion: 1,
      expectedVersion: 17,
      userId: 'e70165',
    });
    expect(request.report).not.toHaveProperty('title');
    expect(request.report).not.toHaveProperty('rows');
    expect(request.report).not.toHaveProperty('periods');
    expect(request.report.columns).toHaveLength(5);
    expect(Object.keys(request.report.columns[0] ?? {})).toHaveLength(32);
    expect(request.report.columns[0]).toMatchObject({
      snapshotId: 'snapshot0830',
      arbMtmWires: '0.00',
      endOfDay: '4802238823.83',
    });
    expect(request.report.columns[0]).not.toHaveProperty('id');
    expect(request.report.columns[0]).not.toHaveProperty('values');
  });

  it('round-trips the compact response without changing the domain report', () => {
    const report = createSecCorpReportFixture();
    const response = serializeFundingReportResponse(report, SEC_CORP_PANEL_DEFINITION);

    expect(parseFundingReportResponse(response, SEC_CORP_PANEL_DEFINITION)).toEqual(report);
  });

  it('rejects an unsupported backend row instead of hiding its value', () => {
    const candidate = mutableFixture();
    firstSnapshot(candidate)['newMarginAdjustment'] = '50000000.00';

    expectContractIssue(candidate, 'UNKNOWN_ROW_ID');
  });

  it('rejects a missing numeric value', () => {
    const candidate = mutableFixture();
    delete firstSnapshot(candidate)['occ'];

    expectContractIssue(candidate, 'MISSING_ROW_VALUE');
  });

  it('rejects the superseded nested values structure', () => {
    const candidate = mutableFixture();
    firstSnapshot(candidate)['values'] = { occ: '-1.00' };

    expectContractIssue(candidate, 'INVALID_RESPONSE_SCHEMA');
  });

  it('rejects backend values for presentation-only section rows', () => {
    const candidate = mutableFixture();
    firstSnapshot(candidate)['margin'] = '0.00';

    expectContractIssue(candidate, 'SECTION_HAS_BACKEND_VALUE');
  });

  it('rejects duplicate columns', () => {
    const candidate = mutableFixture();
    const columns = candidate['columns'];

    if (!Array.isArray(columns)) {
      throw new Error('Expected the fixture to contain columns.');
    }

    columns[4] = structuredClone(columns[0]);
    expectContractIssue(candidate, 'DUPLICATE_COLUMN');
  });

  it('rejects an incompatible panel definition version', () => {
    const candidate = mutableFixture();
    candidate['definitionVersion'] = 2;

    expectContractIssue(candidate, 'DEFINITION_VERSION_MISMATCH');
  });
});

function mutableFixture(): Record<string, unknown> {
  const fixture = structuredClone(SEC_CORP_REPORT_FIXTURE);

  if (!isRecord(fixture)) {
    throw new Error('Expected the fixture to be an object.');
  }

  return fixture;
}

function firstSnapshot(candidate: Record<string, unknown>): Record<string, unknown> {
  const columns = candidate['columns'];

  if (!Array.isArray(columns) || !isRecord(columns[0])) {
    throw new Error('Expected the fixture to contain snapshots.');
  }

  return columns[0];
}

function expectContractIssue(candidate: unknown, code: string): void {
  try {
    parseFundingReportResponse(candidate, SEC_CORP_PANEL_DEFINITION);
    throw new Error(`Expected contract issue ${code}.`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(FundingPanelContractError);

    if (!(error instanceof FundingPanelContractError)) {
      throw error;
    }

    expect(error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
