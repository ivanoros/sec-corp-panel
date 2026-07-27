import { inject, Injectable } from '@angular/core';
import { defer, of, type Observable } from 'rxjs';

import type { FundingReport, FundingRow, SaveFundingReportCommand } from '../domain/funding-report';
import { recalculateFundingReport } from '../domain/report-calculator';
import { assertValidFundingReport, FundingPanelContractError } from '../domain/report-validator';
import {
  type FundingPanelGateway,
  FundingPanelVersionConflictError,
} from './funding-panel.gateway';
import { FUNDING_PANEL_MOCK_REPORT } from './funding-panel-mock-report';

@Injectable()
export class MockFundingPanelGateway implements FundingPanelGateway {
  private currentReport = structuredClone(inject(FUNDING_PANEL_MOCK_REPORT));

  getReport(panelCode: string, businessDate: string): Observable<FundingReport> {
    return defer(() => {
      if (
        panelCode !== this.currentReport.panelCode ||
        businessDate !== this.currentReport.businessDate
      ) {
        throw new FundingPanelMockNotFoundError(panelCode, businessDate);
      }

      return of(structuredClone(this.currentReport));
    });
  }

  putReport(command: SaveFundingReportCommand): Observable<FundingReport> {
    return defer(() => {
      this.assertCommandTargetsCurrentReport(command);

      if (command.expectedVersion !== this.currentReport.version) {
        throw new FundingPanelVersionConflictError(
          command.expectedVersion,
          this.currentReport.version,
        );
      }

      assertCompleteSnapshotState(this.currentReport, command);

      const nextReport = recalculateFundingReport({
        ...this.currentReport,
        asOf: new Date().toISOString(),
        version: this.currentReport.version + 1,
        rows: this.currentReport.rows.map((row) => applySnapshotValues(row, command)),
      });

      assertValidFundingReport(nextReport);
      this.currentReport = nextReport;

      return of(structuredClone(nextReport));
    });
  }

  private assertCommandTargetsCurrentReport(command: SaveFundingReportCommand): void {
    if (
      command.reportId !== this.currentReport.reportId ||
      command.panelCode !== this.currentReport.panelCode ||
      command.businessDate !== this.currentReport.businessDate
    ) {
      throw new FundingPanelMockNotFoundError(command.panelCode, command.businessDate);
    }
  }
}

function applySnapshotValues(row: FundingRow, command: SaveFundingReportCommand): FundingRow {
  if (row.valueMode !== 'input') {
    return row;
  }

  const snapshotValues = command.snapshotValues[row.id];

  if (snapshotValues === undefined) {
    throw new FundingPanelContractError([
      {
        code: 'MISSING_INPUT_ROW',
        path: `snapshotValues.${row.id}`,
        message: `Snapshot values are required for ${row.id}.`,
      },
    ]);
  }

  return {
    ...row,
    values: {
      ...row.values,
      ...snapshotValues,
    },
  };
}

function assertCompleteSnapshotState(
  report: FundingReport,
  command: SaveFundingReportCommand,
): void {
  const expectedRowIds = new Set(
    report.rows.filter((row) => row.valueMode === 'input').map((row) => row.id),
  );
  const suppliedRowIds = Object.keys(command.snapshotValues);
  const unexpectedRowIds = suppliedRowIds.filter((rowId) => !expectedRowIds.has(rowId));
  const missingRowIds = [...expectedRowIds].filter(
    (rowId) => command.snapshotValues[rowId] === undefined,
  );

  if (unexpectedRowIds.length === 0 && missingRowIds.length === 0) {
    return;
  }

  throw new FundingPanelContractError([
    {
      code: 'INVALID_SNAPSHOT_REPLACEMENT',
      path: 'snapshotValues',
      message: [
        missingRowIds.length > 0 ? `Missing rows: ${missingRowIds.join(', ')}.` : '',
        unexpectedRowIds.length > 0 ? `Unexpected rows: ${unexpectedRowIds.join(', ')}.` : '',
      ]
        .filter((message) => message.length > 0)
        .join(' '),
    },
  ]);
}

export class FundingPanelMockNotFoundError extends Error {
  constructor(panelCode: string, businessDate: string) {
    super(`No mock report for ${panelCode} on ${businessDate}.`);
    this.name = 'FundingPanelMockNotFoundError';
  }
}
