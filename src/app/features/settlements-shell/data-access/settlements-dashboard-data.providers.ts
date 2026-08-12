import { inject, type Provider } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import { HttpSettlementsDashboardGateway } from './http-settlements-dashboard.gateway';
import { MockSettlementsDashboardGateway } from './mock-settlements-dashboard.gateway';
import {
  SETTLEMENTS_DASHBOARD_GATEWAY,
  type SettlementsDashboardGateway,
} from './settlements-dashboard.gateway';

export const SETTLEMENTS_DASHBOARD_DATA_PROVIDERS: Provider[] = [
  HttpSettlementsDashboardGateway,
  MockSettlementsDashboardGateway,
  {
    provide: SETTLEMENTS_DASHBOARD_GATEWAY,
    useFactory: createSettlementsDashboardGateway,
  },
];

export function createSettlementsDashboardGateway(): SettlementsDashboardGateway {
  const runtimeConfig = inject(APP_RUNTIME_CONFIG);

  return runtimeConfig.fundingPanelDataSource === 'http'
    ? inject(HttpSettlementsDashboardGateway)
    : inject(MockSettlementsDashboardGateway);
}
