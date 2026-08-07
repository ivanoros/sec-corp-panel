import { inject, Injectable } from '@angular/core';
import { defer, of, type Observable } from 'rxjs';

import type { FundingReport, SaveFundingReportCommand } from '../domain/funding-report';
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

  getReport(panelCode: string, businessDate: string, userId: string): Observable<FundingReport> {
    return defer(() => {
      assertActualUserId(userId);

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

      if (command.report.version !== command.expectedVersion) {
        throw new FundingPanelContractError([
          {
            code: 'VERSION_MISMATCH',
            path: 'report.version',
            message: 'Report version must match expectedVersion.',
          },
        ]);
      }

      assertValidFundingReport(command.report);
      assertActualUserId(command.userId);

      const nextReport = recalculateFundingReport({
        ...structuredClone(command.report),
        asOf: new Date().toISOString(),
        version: this.currentReport.version + 1,
        userId: command.userId,
      });

      assertValidFundingReport(nextReport);
      this.currentReport = nextReport;

      return of(structuredClone(nextReport));
    });
  }

  private assertCommandTargetsCurrentReport(command: SaveFundingReportCommand): void {
    if (
      command.report.reportId !== this.currentReport.reportId ||
      command.report.panelCode !== this.currentReport.panelCode ||
      command.report.businessDate !== this.currentReport.businessDate
    ) {
      throw new FundingPanelMockNotFoundError(
        command.report.panelCode,
        command.report.businessDate,
      );
    }
  }
}

function assertActualUserId(userId: string): void {
  if (userId.trim().length === 0 || userId.length > 128 || userId === 'system') {
    throw new FundingPanelContractError([
      {
        code: 'INVALID_REQUEST_USER_ID',
        path: 'userId',
        message: 'Request userId must identify an actual user.',
      },
    ]);
  }
}

export class FundingPanelMockNotFoundError extends Error {
  constructor(panelCode: string, businessDate: string) {
    super(`No mock report for ${panelCode} on ${businessDate}.`);
    this.name = 'FundingPanelMockNotFoundError';
  }
}
