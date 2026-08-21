import { z } from 'zod';

const amountSchema = z.string().regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/);

const businessUnitValuesSchema = z.object({
  pbil: amountSchema,
  secCorp: amountSchema,
});

export const settlementsDashboardQuerySchema = z.object({
  businessDate: z.iso.date(),
  userId: z.string().trim().min(1).max(128),
});

export const settlementsDashboardSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.string().trim().min(1),
  businessDate: z.iso.date(),
  asOf: z.iso.datetime({ offset: true }),
  failProjection: z.object({
    settled: z.object({ sellTrades: amountSchema, buyTrades: amountSchema }),
    pending: z.object({ sellTrades: amountSchema, buyTrades: amountSchema }),
    fails: z.object({ sellTrades: amountSchema, buyTrades: amountSchema }),
  }),
  cashPositionsOverTime: z
    .array(
      businessUnitValuesSchema.extend({
        time: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .min(2),
  projections: z.object({
    live: businessUnitValuesSchema,
    snapshot0830: businessUnitValuesSchema,
    snapshot1130: businessUnitValuesSchema,
    snapshot1330: businessUnitValuesSchema,
    endOfDay: businessUnitValuesSchema,
  }),
  endOfDayMovement: z.object({
    secCorp4Pm: amountSchema,
    netSettledSecuritiesIntoMarginFacility: amountSchema,
    netSettledCashIntoMarginFacility: amountSchema,
    secCorpCash: amountSchema,
    target: amountSchema,
    difference: amountSchema,
    securitiesToMove: amountSchema,
  }),
  totals: z.object({
    dailyNetCash: businessUnitValuesSchema,
    netEndOfDayBalance: businessUnitValuesSchema,
  }),
});
