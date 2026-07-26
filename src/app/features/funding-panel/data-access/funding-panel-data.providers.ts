import { inject, type Provider } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import type { FundingPanelGateway } from './funding-panel.gateway';
import { FUNDING_PANEL_GATEWAY } from './funding-panel.gateway';
import { HttpFundingPanelGateway } from './http-funding-panel.gateway';
import { MockFundingPanelGateway } from './mock-funding-panel.gateway';

export const FUNDING_PANEL_DATA_ACCESS_PROVIDERS: Provider[] = [
  HttpFundingPanelGateway,
  MockFundingPanelGateway,
  {
    provide: FUNDING_PANEL_GATEWAY,
    useFactory: createFundingPanelGateway,
  },
];

export function createFundingPanelGateway(): FundingPanelGateway {
  const runtimeConfig = inject(APP_RUNTIME_CONFIG);

  return runtimeConfig.fundingPanelDataSource === 'http'
    ? inject(HttpFundingPanelGateway)
    : inject(MockFundingPanelGateway);
}
