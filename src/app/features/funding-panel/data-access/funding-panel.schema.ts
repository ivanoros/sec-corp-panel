import { z } from 'zod';

import { PERIOD_IDS, SNAPSHOT_PERIOD_IDS } from '../domain/funding-report';

const canonicalDecimalSchema = z.string().regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/);
const identifierSchema = z.string().trim().min(1).max(120);
const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidBusinessDate, {
    message: 'Invalid business date.',
  });

export const fundingValueMapSchema = z
  .object({
    snapshot0830: canonicalDecimalSchema.nullable(),
    snapshot1130: canonicalDecimalSchema.nullable(),
    snapshot1330: canonicalDecimalSchema.nullable(),
    live: canonicalDecimalSchema.nullable(),
    opportunityFunding: canonicalDecimalSchema.nullable(),
  })
  .strict();

export const snapshotValueMapSchema = z
  .object({
    snapshot0830: canonicalDecimalSchema,
    snapshot1130: canonicalDecimalSchema,
    snapshot1330: canonicalDecimalSchema,
  })
  .strict();

const periodSchema = z
  .object({
    id: z.enum(PERIOD_IDS),
    label: z.string().trim().min(1).max(40),
    kind: z.enum(['snapshot', 'live', 'opportunity']),
    editable: z.boolean(),
  })
  .strict();

const calculationSchema = z
  .object({
    kind: z.literal('sum'),
    rowIds: z.array(identifierSchema).min(1),
  })
  .strict();

const fundingRowSchema = z
  .object({
    id: identifierSchema,
    code: identifierSchema,
    label: z.string().trim().min(1).max(160),
    displayOrder: z.number().int().positive(),
    depth: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    kind: z.enum(['opening-balance', 'section', 'detail', 'subtotal', 'closing-balance']),
    valueMode: z.enum(['input', 'calculated', 'section']),
    calculation: calculationSchema.nullable(),
    values: fundingValueMapSchema,
  })
  .strict();

export const fundingReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    reportId: identifierSchema,
    panelCode: identifierSchema,
    title: z.string().trim().min(1).max(80),
    businessDate: businessDateSchema,
    currency: z.string().regex(/^[A-Z]{3}$/),
    timezone: z.string().trim().min(1).max(80),
    asOf: z.iso.datetime({ offset: true }),
    version: z.number().int().positive(),
    permissions: z
      .object({
        canEdit: z.boolean(),
        canSave: z.boolean(),
      })
      .strict(),
    periods: z.array(periodSchema).length(PERIOD_IDS.length),
    rows: z.array(fundingRowSchema).min(1).max(500),
  })
  .strict();

export const saveFundingReportRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    expectedVersion: z.number().int().positive(),
    businessDate: businessDateSchema,
    snapshotValues: z.record(identifierSchema, snapshotValueMapSchema),
  })
  .strict();

export const versionConflictResponseSchema = z
  .object({
    code: z.literal('VERSION_CONFLICT'),
    message: z.string().trim().min(1),
    expectedVersion: z.number().int().positive(),
    currentVersion: z.number().int().positive(),
  })
  .strict();

export const contractPeriodIds = PERIOD_IDS;
export const contractSnapshotPeriodIds = SNAPSHOT_PERIOD_IDS;

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
