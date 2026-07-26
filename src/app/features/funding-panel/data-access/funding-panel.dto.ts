import type { z } from 'zod';

import type {
  fundingReportSchema,
  saveFundingReportRequestSchema,
  versionConflictResponseSchema,
} from './funding-panel.schema';

export type FundingReportDto = z.infer<typeof fundingReportSchema>;
export type SaveFundingReportRequestDto = z.infer<typeof saveFundingReportRequestSchema>;
export type VersionConflictResponseDto = z.infer<typeof versionConflictResponseSchema>;
