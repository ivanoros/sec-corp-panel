import secCorpReportFixture from './sec-corp-report.fixture.json';

import type { FundingReport } from '../../../domain/funding-report';
import { parseFundingReportResponse } from '../../../data-access/funding-report.mapper';

export const SEC_CORP_REPORT_FIXTURE: unknown = secCorpReportFixture;

export function createSecCorpReportFixture(): FundingReport {
  return parseFundingReportResponse(structuredClone(SEC_CORP_REPORT_FIXTURE));
}
