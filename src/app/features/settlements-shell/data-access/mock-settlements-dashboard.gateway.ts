import { Injectable } from '@angular/core';
import { defer, delay, of, type Observable } from 'rxjs';

import type {
  SettlementsDashboard,
  SettlementsDashboardQuery,
} from '../domain/settlements-dashboard';
import type { SettlementsDashboardGateway } from './settlements-dashboard.gateway';
import {
  settlementsDashboardQuerySchema,
  settlementsDashboardSchema,
} from './settlements-dashboard.schema';

@Injectable()
export class MockSettlementsDashboardGateway implements SettlementsDashboardGateway {
  load(query: SettlementsDashboardQuery): Observable<SettlementsDashboard> {
    const request = settlementsDashboardQuerySchema.parse(query);

    return defer(() => of(createMockSettlementsDashboard(request.businessDate))).pipe(delay(80));
  }
}

export function createMockSettlementsDashboard(businessDate: string): SettlementsDashboard {
  return settlementsDashboardSchema.parse({
    schemaVersion: 1,
    requestId: `mock-settlements-dashboard-${businessDate}`,
    businessDate,
    asOf: `${businessDate}T14:00:00-04:00`,
    netCashPositions: {
      pbil: '9705.00',
      secCorp: '-2797.00',
    },
    cashPositionsOverTime: [
      { time: '08:00', pbil: '10240.00', secCorp: '-1460.00' },
      { time: '08:30', pbil: '9705.00', secCorp: '-1779.00' },
      { time: '09:30', pbil: '9680.00', secCorp: '-1850.00' },
      { time: '10:30', pbil: '9605.00', secCorp: '-2250.00' },
      { time: '11:30', pbil: '9358.00', secCorp: '-2528.00' },
      { time: '12:30', pbil: '9220.00', secCorp: '-2528.00' },
      { time: '13:30', pbil: '9058.00', secCorp: '-2528.00' },
      { time: '14:00', pbil: '9058.00', secCorp: '-2797.00' },
    ],
    projections: {
      live: { pbil: '9705.00', secCorp: '-2797.00' },
      snapshot0830: { pbil: '9705.00', secCorp: '-2797.00' },
      snapshot1130: { pbil: '9358.00', secCorp: '-2528.00' },
      snapshot1330: { pbil: '9058.00', secCorp: '-2528.00' },
      endOfDay: { pbil: '9058.00', secCorp: '-2528.00' },
    },
    endOfDayMovement: {
      secCorp4Pm: '-933108802.00',
      netSettledSecuritiesIntoMarginFacility: '520000000.00',
      netSettledCashIntoMarginFacility: '-442000000.00',
      secCorpCash: '-1375108802.00',
      target: '-1500000000.00',
      difference: '-124891198.00',
      securitiesToMove: '-146930821.00',
    },
    totals: {
      dailyNetCash: { pbil: '766.00', secCorp: '388.00' },
      netEndOfDayBalance: { pbil: '6908.00', secCorp: '6530.00' },
    },
  });
}
