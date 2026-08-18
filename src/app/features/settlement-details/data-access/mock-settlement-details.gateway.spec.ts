import {
  MOCK_SETTLEMENT_DETAIL_COUNT,
  searchMockSettlementDetails,
} from './mock-settlement-details.gateway';

describe('searchMockSettlementDetails', () => {
  it('returns only the requested page while reporting the 500,000-row logical dataset', () => {
    const result = searchMockSettlementDetails({
      schemaVersion: 1,
      userId: 'e70165',
      businessDate: '2026-08-10',
      offset: 1_000,
      limit: 1_000,
      filters: [],
      sort: [],
    });

    expect(result.totalCount).toBe(MOCK_SETTLEMENT_DETAIL_COUNT);
    expect(result.rows).toHaveLength(1_000);
    expect(result.rows[0]?.recordId).toBe('settlement-00001001');
    expect(result.rows[999]?.recordId).toBe('settlement-00002000');
    expect(result.rows[0]).toMatchObject({
      settlementCurrency: expect.stringMatching(/^[A-Z]{3}$/),
      settledQuantity: expect.any(Number),
      settlementNetAmount: expect.any(Number),
      tradedQuantity: expect.any(Number),
      tradeNetAmount: expect.any(Number),
    });
  });

  it('applies filters before pagination', () => {
    const result = searchMockSettlementDetails({
      schemaVersion: 1,
      userId: 'e70165',
      businessDate: '2026-08-10',
      offset: 0,
      limit: 25,
      filters: [{ field: 'settlementStatus', operator: 'equals', value: 'Failed' }],
      sort: [],
    });

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.totalCount).toBeLessThan(MOCK_SETTLEMENT_DETAIL_COUNT);
    expect(result.rows).toHaveLength(25);
    expect(result.rows.every(({ settlementStatus }) => settlementStatus === 'Failed')).toBe(true);
  });
});
