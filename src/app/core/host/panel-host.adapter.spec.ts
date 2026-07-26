import { TestBed } from '@angular/core/testing';

import { PANEL_HOST_ADAPTER, StandalonePanelHostAdapter } from './panel-host.adapter';

describe('StandalonePanelHostAdapter', () => {
  it('publishes refresh requests without exposing writable state', () => {
    const adapter = TestBed.inject(StandalonePanelHostAdapter);

    adapter.requestRefresh();

    expect(adapter.refreshRevision()).toBe(1);
  });

  it('is the default panel host implementation', () => {
    const adapter = TestBed.inject(PANEL_HOST_ADAPTER);

    expect(adapter).toBeInstanceOf(StandalonePanelHostAdapter);
  });
});
