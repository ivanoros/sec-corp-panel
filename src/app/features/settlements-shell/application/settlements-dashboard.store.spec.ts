import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import type { SettlementsDashboard } from '../domain/settlements-dashboard';
import { createMockSettlementsDashboard } from '../data-access/mock-settlements-dashboard.gateway';
import {
  SETTLEMENTS_DASHBOARD_GATEWAY,
  type SettlementsDashboardGateway,
} from '../data-access/settlements-dashboard.gateway';
import { SettlementsDashboardStore } from './settlements-dashboard.store';

describe('SettlementsDashboardStore', () => {
  it('ignores a stale result after a newer dashboard request', () => {
    const firstResult = new Subject<SettlementsDashboard>();
    const secondResult = new Subject<SettlementsDashboard>();
    const load = vi
      .fn<SettlementsDashboardGateway['load']>()
      .mockReturnValueOnce(firstResult)
      .mockReturnValueOnce(secondResult);

    TestBed.configureTestingModule({
      providers: [
        SettlementsDashboardStore,
        { provide: SETTLEMENTS_DASHBOARD_GATEWAY, useValue: { load } },
      ],
    });
    const store = TestBed.inject(SettlementsDashboardStore);

    store.load({ businessDate: '2026-07-25', userId: 'user-1' });
    store.load({ businessDate: '2026-07-26', userId: 'user-1' });
    firstResult.next(createMockSettlementsDashboard('2026-07-25'));
    secondResult.next(createMockSettlementsDashboard('2026-07-26'));

    expect(store.dashboard()?.businessDate).toBe('2026-07-26');
    expect(store.loadStatus()).toBe('loaded');
  });
});
