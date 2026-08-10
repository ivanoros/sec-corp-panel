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
      offset: 100,
      limit: 50,
      filters: [],
      sort: [],
    });

    expect(result.totalCount).toBe(MOCK_SETTLEMENT_DETAIL_COUNT);
    expect(result.rows).toHaveLength(50);
    expect(result.rows[0]?.recordId).toBe('settlement-00000101');
    expect(result.rows[49]?.recordId).toBe('settlement-00000150');
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
