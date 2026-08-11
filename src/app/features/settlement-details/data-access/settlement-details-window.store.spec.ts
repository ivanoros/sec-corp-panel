import { createSettlementDetailsWindowQuery } from './settlement-details-window.store';

describe('createSettlementDetailsWindowQuery', () => {
  it('requests a 1,000-row backend window with only the top criteria', () => {
    expect(
      createSettlementDetailsWindowQuery(
        {
          businessDate: '2026-08-10',
          filters: [
            { field: 'managerName', operator: 'contains', value: 'Capital' },
            { field: 'settlementStatus', operator: 'equals', value: 'Pending' },
          ],
        },
        2,
        'e70165',
      ),
    ).toEqual({
      schemaVersion: 1,
      userId: 'e70165',
      businessDate: '2026-08-10',
      offset: 2_000,
      limit: 1_000,
      filters: [
        { field: 'managerName', operator: 'contains', value: 'Capital' },
        { field: 'settlementStatus', operator: 'equals', value: 'Pending' },
      ],
      sort: [],
    });
  });

  it('normalizes an invalid page index to the first backend window', () => {
    expect(
      createSettlementDetailsWindowQuery({ businessDate: '2026-08-10', filters: [] }, -4, 'e70165'),
    ).toMatchObject({ offset: 0, limit: 1_000 });
  });
});
