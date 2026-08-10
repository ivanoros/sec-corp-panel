import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  SettlementDetailsSearchQuery,
  SettlementDetailsSearchResult,
} from '../domain/settlement-detail';

export interface SettlementDetailsGateway {
  search(query: SettlementDetailsSearchQuery): Observable<SettlementDetailsSearchResult>;
}

export const SETTLEMENT_DETAILS_GATEWAY = new InjectionToken<SettlementDetailsGateway>(
  'SETTLEMENT_DETAILS_GATEWAY',
);
