import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type {
  SettlementsDashboard,
  SettlementsDashboardQuery,
} from '../domain/settlements-dashboard';

export interface SettlementsDashboardGateway {
  load(query: SettlementsDashboardQuery): Observable<SettlementsDashboard>;
}

export const SETTLEMENTS_DASHBOARD_GATEWAY = new InjectionToken<SettlementsDashboardGateway>(
  'SETTLEMENTS_DASHBOARD_GATEWAY',
);
