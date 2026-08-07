import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { asDecimalString } from '../domain/decimal-value';
import type { FundingReport, SaveFundingReportCommand } from '../domain/funding-report';
import { recalculateFundingReport } from '../domain/report-calculator';
import { FundingPanelContractError } from '../domain/report-validator';
import type { FundingPanelVersionConflictError } from './funding-panel.gateway';
import { provideFundingPanelMockReport } from './funding-panel-mock-report';
import { MockFundingPanelGateway } from './mock-funding-panel.gateway';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';

describe('MockFundingPanelGateway', () => {
  it('retrieves the versioned Sec Corp report', async () => {
    const gateway = createGateway();

    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'e70165'));

    expect(report.version).toBe(17);
    expect(report.rows).toHaveLength(37);
  });

  it('replaces the complete report dataset, recalculates totals, and advances the version', async () => {
    const gateway = createGateway();
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'e70165'));
    const updatedReport = replaceSnapshotValue(report, 'occ', '-300000000.00');

    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: report.version,
      userId: 'e70165',
      report: updatedReport,
    };

    const savedReport = await firstValueFrom(gateway.putReport(command));

    expect(savedReport.version).toBe(18);
    expect(savedReport.userId).toBe('e70165');
    expect(savedReport.rows.find((row) => row.id === 'totalMargin')?.values.snapshot0830).toBe(
      '-210403134.64',
    );
    expect(savedReport.rows.find((row) => row.id === 'endOfDay')?.values.snapshot0830).toBe(
      '4811063538.31',
    );
  });

  it('rejects a stale save without changing server state', async () => {
    const gateway = createGateway();
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'e70165'));
    const updatedReport = replaceSnapshotValue(report, 'occ', '-1.00');

    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: 16,
      userId: 'e70165',
      report: updatedReport,
    };

    await expect(firstValueFrom(gateway.putReport(command))).rejects.toEqual(
      expect.objectContaining<Partial<FundingPanelVersionConflictError>>({
        expectedVersion: 16,
        currentVersion: 17,
      }),
    );

    const unchangedReport = await firstValueFrom(
      gateway.getReport('sec-corp', '2026-07-25', 'e70165'),
    );

    expect(unchangedReport.version).toBe(17);
    expect(unchangedReport.rows.find(({ id }) => id === 'occ')?.values.snapshot0830).toBe(
      '-308824714.48',
    );
  });

  it('transitions a system-owned version-0 report to the actual updating user', async () => {
    const initialReport: FundingReport = {
      ...createSecCorpReportFixture(),
      version: 0,
      userId: 'system',
    };
    const gateway = createGateway(initialReport);
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'first-user'));

    const savedReport = await firstValueFrom(
      gateway.putReport({
        schemaVersion: 1,
        expectedVersion: 0,
        userId: 'first-user',
        report,
      }),
    );

    expect(report).toMatchObject({ version: 0, userId: 'system' });
    expect(savedReport).toMatchObject({ version: 1, userId: 'first-user' });
  });

  it('rejects system as an update request actor', async () => {
    const gateway = createGateway();
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'e70165'));

    await expect(
      firstValueFrom(
        gateway.putReport({
          schemaVersion: 1,
          expectedVersion: report.version,
          userId: 'system',
          report,
        }),
      ),
    ).rejects.toBeInstanceOf(FundingPanelContractError);
  });
});

function createGateway(
  report: FundingReport = createSecCorpReportFixture(),
): MockFundingPanelGateway {
  TestBed.configureTestingModule({
    providers: [MockFundingPanelGateway, provideFundingPanelMockReport(() => report)],
  });

  return TestBed.inject(MockFundingPanelGateway);
}

function replaceSnapshotValue(report: FundingReport, rowId: string, value: string): FundingReport {
  return recalculateFundingReport({
    ...report,
    rows: report.rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            values: {
              ...row.values,
              snapshot0830: asDecimalString(value),
            },
          }
        : row,
    ),
  });
}
