import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type { FundingReport, SaveFundingReportCommand } from '../domain/funding-report';

export interface FundingPanelGateway {
  getReport(panelCode: string, businessDate: string): Observable<FundingReport>;
  putReport(command: SaveFundingReportCommand): Observable<FundingReport>;
}

export const FUNDING_PANEL_GATEWAY = new InjectionToken<FundingPanelGateway>(
  'FUNDING_PANEL_GATEWAY',
);

export class FundingPanelVersionConflictError extends Error {
  constructor(
    readonly expectedVersion: number,
    readonly currentVersion: number | null,
  ) {
    super(
      currentVersion === null
        ? `Report version ${expectedVersion} is stale.`
        : `Report version ${expectedVersion} is stale; current version is ${currentVersion}.`,
    );
    this.name = 'FundingPanelVersionConflictError';
  }
}
