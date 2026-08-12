import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import { createMockSettlementsDashboard } from './mock-settlements-dashboard.gateway';
import { HttpSettlementsDashboardGateway } from './http-settlements-dashboard.gateway';

describe('HttpSettlementsDashboardGateway', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpSettlementsDashboardGateway,
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            agGridEnterpriseLicenseKey: null,
            apiBaseUrl: '/api/',
            businessDate: '2026-07-25',
            fundingPanelDataSource: 'http',
            userId: 'e70165',
          },
        },
      ],
    });
  });

  it('loads the coherent dashboard snapshot with date and user identity', () => {
    const gateway = TestBed.inject(HttpSettlementsDashboardGateway);
    const http = TestBed.inject(HttpTestingController);
    let receivedRequestId: string | null = null;

    gateway
      .load({ businessDate: '2026-07-25', userId: 'e70165' })
      .subscribe((dashboard) => (receivedRequestId = dashboard.requestId));

    const request = http.expectOne(
      ({ url, params }) =>
        url === '/api/v1/settlements/dashboard' &&
        params.get('businessDate') === '2026-07-25' &&
        params.get('userId') === 'e70165',
    );
    expect(request.request.method).toBe('GET');
    request.flush(createMockSettlementsDashboard('2026-07-25'));

    expect(receivedRequestId).toBe('mock-settlements-dashboard-2026-07-25');
    http.verify();
  });
});
