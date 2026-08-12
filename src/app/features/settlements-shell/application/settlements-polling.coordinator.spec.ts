import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import { SettlementsPollingCoordinator } from './settlements-polling.coordinator';

describe('SettlementsPollingCoordinator', () => {
  afterEach(() => vi.useRealTimers());

  it('refreshes both data sources from one 60-second timer', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        SettlementsPollingCoordinator,
        { provide: DOCUMENT, useValue: { visibilityState: 'visible' } },
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            settlementsPollingEnabled: true,
            settlementsPollingIntervalMs: 60_000,
          },
        },
      ],
    });
    const coordinator = TestBed.inject(SettlementsPollingCoordinator);
    const refreshDashboard = vi.fn();
    const refreshSettlementDetails = vi.fn();

    coordinator.start({ refreshDashboard, refreshSettlementDetails });
    vi.advanceTimersByTime(59_999);
    expect(refreshDashboard).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refreshDashboard).toHaveBeenCalledOnce();
    expect(refreshSettlementDetails).toHaveBeenCalledOnce();
  });

  it('pauses polling while the browser document is hidden', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        SettlementsPollingCoordinator,
        { provide: DOCUMENT, useValue: { visibilityState: 'hidden' } },
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            settlementsPollingEnabled: true,
            settlementsPollingIntervalMs: 60_000,
          },
        },
      ],
    });
    const coordinator = TestBed.inject(SettlementsPollingCoordinator);
    const refreshDashboard = vi.fn();
    const refreshSettlementDetails = vi.fn();

    coordinator.start({ refreshDashboard, refreshSettlementDetails });
    vi.advanceTimersByTime(60_000);

    expect(refreshDashboard).not.toHaveBeenCalled();
    expect(refreshSettlementDetails).not.toHaveBeenCalled();
  });
});
