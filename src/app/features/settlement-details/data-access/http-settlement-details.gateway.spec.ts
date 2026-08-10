import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { APP_RUNTIME_CONFIG, type RuntimeConfig } from '../../../core/config/runtime-config';
import { createMockSettlementDetail } from './mock-settlement-details.gateway';
import { HttpSettlementDetailsGateway } from './http-settlement-details.gateway';

describe('HttpSettlementDetailsGateway', () => {
  let gateway: HttpSettlementDetailsGateway;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    const runtimeConfig: RuntimeConfig = {
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/operations-api/',
      businessDate: '2026-08-10',
      fundingPanelDataSource: 'http',
      userId: 'e70165',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpSettlementDetailsGateway,
        { provide: APP_RUNTIME_CONFIG, useValue: runtimeConfig },
      ],
    });

    gateway = TestBed.inject(HttpSettlementDetailsGateway);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts a bounded search command and validates the response', async () => {
    const query = {
      schemaVersion: 1 as const,
      userId: 'e70165',
      businessDate: '2026-08-10',
      offset: 0,
      limit: 100,
      filters: [{ field: 'managerName' as const, operator: 'contains' as const, value: 'Capital' }],
      sort: [{ field: 'tradeId' as const, direction: 'desc' as const }],
    };
    const result = firstValueFrom(gateway.search(query));
    const request = httpTesting.expectOne('/operations-api/v1/settlement-details/search');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(query);

    request.flush({
      schemaVersion: 1,
      requestId: 'request-123',
      asOf: '2026-08-10T14:00:00-04:00',
      totalCount: 1,
      rows: [createMockSettlementDetail(0)],
    });

    await expect(result).resolves.toMatchObject({ totalCount: 1 });
  });

  it('rejects malformed response rows at the boundary', async () => {
    const result = firstValueFrom(
      gateway.search({
        schemaVersion: 1,
        userId: 'e70165',
        businessDate: '2026-08-10',
        offset: 0,
        limit: 100,
        filters: [],
        sort: [],
      }),
    );
    const request = httpTesting.expectOne('/operations-api/v1/settlement-details/search');

    request.flush({
      schemaVersion: 1,
      requestId: 'request-123',
      asOf: '2026-08-10T14:00:00-04:00',
      totalCount: 1,
      rows: [{ recordId: 'incomplete' }],
    });

    await expect(result).rejects.toBeDefined();
  });
});
