import { InjectionToken, type Provider } from '@angular/core';

import type { FundingReport } from '../domain/funding-report';

export const FUNDING_PANEL_MOCK_REPORT = new InjectionToken<FundingReport>(
  'FUNDING_PANEL_MOCK_REPORT',
);

export function provideFundingPanelMockReport(reportFactory: () => FundingReport): Provider {
  return {
    provide: FUNDING_PANEL_MOCK_REPORT,
    useFactory: reportFactory,
  };
}
