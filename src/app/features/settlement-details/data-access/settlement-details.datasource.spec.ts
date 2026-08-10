import type { IServerSideGetRowsRequest } from 'ag-grid-community';

import { mapServerSideRequest } from './settlement-details.datasource';

describe('mapServerSideRequest', () => {
  it('maps pagination, sorting, and supported filters into a backend-neutral query', () => {
    const request = createRequest({
      startRow: 200,
      endRow: 300,
      filterModel: {
        managerName: {
          filterType: 'text',
          type: 'contains',
          filter: ' Capital ',
        },
        settlementMode: {
          filterType: 'text',
          type: 'equals',
          filter: 'CNS',
        },
      },
      sortModel: [
        { colId: 'managerName', sort: 'asc' },
        { colId: 'tradeId', sort: 'desc' },
      ],
    });

    expect(
      mapServerSideRequest(request, {
        businessDate: '2026-08-10',
        userId: 'e70165',
      }),
    ).toEqual({
      schemaVersion: 1,
      userId: 'e70165',
      businessDate: '2026-08-10',
      offset: 200,
      limit: 100,
      filters: [
        { field: 'managerName', operator: 'contains', value: 'Capital' },
        { field: 'settlementMode', operator: 'equals', value: 'CNS' },
      ],
      sort: [
        { field: 'managerName', direction: 'asc' },
        { field: 'tradeId', direction: 'desc' },
      ],
    });
  });

  it('ignores unknown fields and caps a malformed oversized range', () => {
    const request = createRequest({
      startRow: 0,
      endRow: 5_000,
      filterModel: {
        internalOnly: {
          filterType: 'text',
          type: 'contains',
          filter: 'secret',
        },
      },
      sortModel: [{ colId: 'internalOnly', sort: 'asc' }],
    });

    expect(
      mapServerSideRequest(request, {
        businessDate: '2026-08-10',
        userId: 'e70165',
      }),
    ).toMatchObject({ limit: 500, filters: [], sort: [] });
  });
});

function createRequest(overrides: Partial<IServerSideGetRowsRequest>): IServerSideGetRowsRequest {
  return {
    startRow: 0,
    endRow: 100,
    rowGroupCols: [],
    valueCols: [],
    pivotCols: [],
    pivotMode: false,
    groupKeys: [],
    filterModel: {},
    sortModel: [],
    ...overrides,
  };
}
