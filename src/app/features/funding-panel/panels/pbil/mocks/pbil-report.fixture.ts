import pbilReportFixture from './pbil-report.fixture.json';

import { parseFundingReportResponse } from '../../../data-access/funding-report.mapper';
import type { FundingReport } from '../../../domain/funding-report';

export const PBIL_REPORT_FIXTURE: unknown = pbilReportFixture;

export function createPbilReportFixture(): FundingReport {
  return parseFundingReportResponse(structuredClone(PBIL_REPORT_FIXTURE));
}
