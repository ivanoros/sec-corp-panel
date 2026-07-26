import { firstValueFrom } from 'rxjs';

import { asDecimalString } from '../domain/decimal-value';
import { selectSnapshotValues, type SaveFundingReportCommand } from '../domain/funding-report';
import type { FundingPanelVersionConflictError } from './funding-panel.gateway';
import { MockFundingPanelGateway } from './mock-funding-panel.gateway';

describe('MockFundingPanelGateway', () => {
  it('retrieves the versioned Sec Corp report', async () => {
    const gateway = new MockFundingPanelGateway();

    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25'));

    expect(report.version).toBe(17);
    expect(report.rows).toHaveLength(37);
  });

  it('replaces snapshot state, recalculates totals, and advances the version', async () => {
    const gateway = new MockFundingPanelGateway();
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25'));
    const snapshotValues = selectSnapshotValues(report);
    const occSnapshotValues = snapshotValues['occ'];

    if (occSnapshotValues === undefined) {
      throw new Error('Missing OCC snapshot values.');
    }

    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      reportId: report.reportId,
      panelCode: report.panelCode,
      businessDate: report.businessDate,
      expectedVersion: report.version,
      snapshotValues: {
        ...snapshotValues,
        occ: {
          ...occSnapshotValues,
          snapshot0830: asDecimalString('-300000000.00'),
        },
      },
    };

    const savedReport = await firstValueFrom(gateway.putReport(command));

    expect(savedReport.version).toBe(18);
    expect(savedReport.rows.find((row) => row.id === 'total-margin')?.values.snapshot0830).toBe(
      '-210403134.64',
    );
    expect(savedReport.rows.find((row) => row.id === 'end-of-day')?.values.snapshot0830).toBe(
      '4811063538.31',
    );
  });

  it('rejects a stale save without changing server state', async () => {
    const gateway = new MockFundingPanelGateway();
    const report = await firstValueFrom(gateway.getReport('sec-corp', '2026-07-25'));
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      reportId: report.reportId,
      panelCode: report.panelCode,
      businessDate: report.businessDate,
      expectedVersion: 16,
      snapshotValues: selectSnapshotValues(report),
    };

    await expect(firstValueFrom(gateway.putReport(command))).rejects.toEqual(
      expect.objectContaining<Partial<FundingPanelVersionConflictError>>({
        expectedVersion: 16,
        currentVersion: 17,
      }),
    );
  });
});
