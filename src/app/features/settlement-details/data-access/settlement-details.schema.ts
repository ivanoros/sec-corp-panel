import { z } from 'zod';

import { SETTLEMENT_DATE_OPERATORS, SETTLEMENT_DETAIL_FIELDS } from '../domain/settlement-detail';

const settlementDateValueSchema = z.iso.date();
const identifierSchema = z.string().trim().min(1).max(160);
const settlementDetailFieldSchema = z.enum(SETTLEMENT_DETAIL_FIELDS);
const settlementDetailSchema = z
  .object({
    recordId: identifierSchema,
    settlementMode: z.string().max(40),
    activityType: z.string().max(120),
    settlementStatus: z.string().max(40),
    managerCode: z.string().max(30),
    managerName: z.string().max(160),
    lineOfBusiness: z.string().max(30),
    accountId: z.string().max(60),
    accountName: z.string().max(180),
    cusip: z.string().max(20),
    productId: z.string().max(60),
    securityDescription: z.string().max(240),
    isin: z.string().max(20),
    sedol: z.string().max(20),
    assetType: z.string().max(60),
    assetSubClass: z.string().max(80),
    blotterCode: z.string().max(30),
    bookingReferenceId: z.string().max(180),
    source: z.string().max(60),
    tradeType: z.string().max(60),
    tradeId: z.string().max(80),
    tradedQuantity: z.number(),
    tradeNetAmount: z.number(),
    settledQuantity: z.number(),
    settlementNetAmount: z.number(),
    settlementCurrency: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();

export const settlementDetailsSearchRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    userId: identifierSchema,
    settlementDate: z
      .object({
        operator: z.enum(SETTLEMENT_DATE_OPERATORS),
        value: settlementDateValueSchema,
      })
      .strict(),
    offset: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(1_000),
    filters: z.array(
      z
        .object({
          field: settlementDetailFieldSchema,
          operator: z.enum([
            'blank',
            'contains',
            'endsWith',
            'equals',
            'notBlank',
            'notContains',
            'notEqual',
            'startsWith',
          ]),
          value: z.string().max(240).nullable(),
        })
        .strict(),
    ),
    sort: z
      .array(
        z
          .object({
            field: settlementDetailFieldSchema,
            direction: z.enum(['asc', 'desc']),
          })
          .strict(),
      )
      .max(3),
  })
  .strict();

export const settlementDetailsSearchResponseSchema = z
  .object({
    schemaVersion: z.literal(1),
    requestId: identifierSchema,
    asOf: z.iso.datetime({ offset: true }),
    totalCount: z.number().int().nonnegative(),
    rows: z.array(settlementDetailSchema).max(1_000),
  })
  .strict()
  .superRefine(({ rows, totalCount }, context) => {
    if (rows.length > totalCount) {
      context.addIssue({
        code: 'custom',
        message: 'A response cannot contain more rows than totalCount.',
        path: ['rows'],
      });
    }
  });
