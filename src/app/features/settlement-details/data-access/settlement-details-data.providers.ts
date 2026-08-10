import { inject, type Provider } from '@angular/core';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import { HttpSettlementDetailsGateway } from './http-settlement-details.gateway';
import { MockSettlementDetailsGateway } from './mock-settlement-details.gateway';
import {
  SETTLEMENT_DETAILS_GATEWAY,
  type SettlementDetailsGateway,
} from './settlement-details.gateway';

export const SETTLEMENT_DETAILS_DATA_ACCESS_PROVIDERS: Provider[] = [
  HttpSettlementDetailsGateway,
  MockSettlementDetailsGateway,
  {
    provide: SETTLEMENT_DETAILS_GATEWAY,
    useFactory: createSettlementDetailsGateway,
  },
];

export function createSettlementDetailsGateway(): SettlementDetailsGateway {
  const runtimeConfig = inject(APP_RUNTIME_CONFIG);

  return runtimeConfig.fundingPanelDataSource === 'http'
    ? inject(HttpSettlementDetailsGateway)
    : inject(MockSettlementDetailsGateway);
}
