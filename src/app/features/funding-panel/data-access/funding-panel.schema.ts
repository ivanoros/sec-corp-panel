import { z } from 'zod';

import { PERIOD_IDS } from '../domain/funding-report';

const canonicalDecimalSchema = z.string().regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/);
const identifierSchema = z.string().trim().min(1).max(120);
const rowIdentifierSchema = identifierSchema.regex(/^[a-z0-9][A-Za-z0-9]*$/, {
  message: 'Row IDs must use lower camel case.',
});
const userIdSchema = z.string().trim().min(1).max(128);
export const requestUserIdSchema = userIdSchema.refine((userId) => userId !== 'system', {
  message: 'Update userId must identify an actual user.',
});
const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidBusinessDate, {
    message: 'Invalid business date.',
  });

const permissionsSchema = z
  .object({
    canEdit: z.boolean(),
    canSave: z.boolean(),
  })
  .strict();

const fundingColumnSchema = z
  .object({
    snapshotId: z.enum(PERIOD_IDS),
  })
  .catchall(canonicalDecimalSchema)
  .superRefine((column, context) => {
    const rowIds = Object.keys(column).filter((key) => key !== 'snapshotId');

    if (rowIds.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A snapshot must contain at least one row value.',
      });
    }

    if (rowIds.length > 500) {
      context.addIssue({
        code: 'custom',
        message: 'A snapshot cannot contain more than 500 row values.',
      });
    }

    for (const rowId of rowIds) {
      const result = rowIdentifierSchema.safeParse(rowId);

      if (!result.success) {
        context.addIssue({
          code: 'custom',
          message: 'Row IDs must use lower camel case.',
          path: [rowId],
        });
      }
    }
  });

const fundingReportPayloadShape = {
  reportId: identifierSchema,
  panelCode: identifierSchema,
  businessDate: businessDateSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(1).max(80),
  asOf: z.iso.datetime({ offset: true }),
  version: z.number().int().nonnegative(),
  userId: userIdSchema,
  permissions: permissionsSchema,
  columns: z.array(fundingColumnSchema).length(PERIOD_IDS.length),
} as const;

export const fundingReportPayloadSchema = z.object(fundingReportPayloadShape).strict();

export const fundingReportSchema = z
  .object({
    schemaVersion: z.literal(2),
    definitionVersion: z.number().int().positive(),
    ...fundingReportPayloadShape,
  })
  .strict()
  .superRefine(validateReportIdentity);

export const saveFundingReportRequestSchema = z
  .object({
    schemaVersion: z.literal(2),
    definitionVersion: z.number().int().positive(),
    expectedVersion: z.number().int().nonnegative(),
    userId: requestUserIdSchema,
    report: fundingReportPayloadSchema,
  })
  .strict()
  .superRefine(({ expectedVersion, report }, context) => {
    validateReportIdentity(report, context);

    if (report.version !== expectedVersion) {
      context.addIssue({
        code: 'custom',
        message: 'Report version must match expectedVersion.',
        path: ['report', 'version'],
      });
    }
  });

export const versionConflictResponseSchema = z
  .object({
    code: z.literal('VERSION_CONFLICT'),
    message: z.string().trim().min(1),
    expectedVersion: z.number().int().nonnegative(),
    currentVersion: z.number().int().nonnegative(),
  })
  .strict();

export const contractPeriodIds = PERIOD_IDS;

function validateReportIdentity(
  report: { readonly userId: string; readonly version: number },
  context: z.RefinementCtx,
): void {
  if (report.version === 0 && report.userId !== 'system') {
    context.addIssue({
      code: 'custom',
      message: 'A version-0 report must be owned by system.',
      path: ['userId'],
    });
  }

  if (report.version > 0 && report.userId === 'system') {
    context.addIssue({
      code: 'custom',
      message: 'A versioned report must identify the actual user who last updated it.',
      path: ['userId'],
    });
  }
}

function isValidBusinessDate(value: string): boolean {
  const [yearText, monthText, dayText] = value.split('-');

  if (yearText === undefined || monthText === undefined || dayText === undefined) {
    return false;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
