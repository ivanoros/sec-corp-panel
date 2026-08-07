import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { APP_RUNTIME_CONFIG, type RuntimeConfig } from '../../../core/config/runtime-config';
import { FUNDING_PANEL_GATEWAY } from './funding-panel.gateway';
import {
  FUNDING_PANEL_DATA_ACCESS_PROVIDERS,
  createFundingPanelGateway,
} from './funding-panel-data.providers';
import { HttpFundingPanelGateway } from './http-funding-panel.gateway';
import { MockFundingPanelGateway } from './mock-funding-panel.gateway';
import { provideFundingPanelMockReport } from './funding-panel-mock-report';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';

describe('funding panel data providers', () => {
  it('selects the self-contained mock gateway when configured', () => {
    configureDataAccess('mock');

    expect(TestBed.inject(FUNDING_PANEL_GATEWAY)).toBeInstanceOf(MockFundingPanelGateway);
  });

  it('selects the REST gateway for an integrated environment', () => {
    configureDataAccess('http');

    expect(TestBed.inject(FUNDING_PANEL_GATEWAY)).toBeInstanceOf(HttpFundingPanelGateway);
  });

  it('creates the same configured gateway through the provider factory', () => {
    configureDataAccess('mock');

    expect(TestBed.runInInjectionContext(createFundingPanelGateway)).toBeInstanceOf(
      MockFundingPanelGateway,
    );
  });
});

function configureDataAccess(
  fundingPanelDataSource: RuntimeConfig['fundingPanelDataSource'],
): void {
  const runtimeConfig: RuntimeConfig = {
    agGridEnterpriseLicenseKey: null,
    apiBaseUrl: '/api',
    businessDate: '2026-07-25',
    fundingPanelDataSource,
    userId: 'test-user',
  };

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      ...FUNDING_PANEL_DATA_ACCESS_PROVIDERS,
      provideFundingPanelMockReport(createSecCorpReportFixture),
      {
        provide: APP_RUNTIME_CONFIG,
        useValue: runtimeConfig,
      },
    ],
  });
}
