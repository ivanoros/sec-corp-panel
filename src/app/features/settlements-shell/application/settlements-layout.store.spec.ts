import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import {
  DEFAULT_SETTLEMENTS_LAYOUT,
  SETTLEMENTS_LAYOUT_STORAGE_KEY,
  SettlementsLayoutStore,
  resizeLayout,
} from './settlements-layout.store';

describe('SettlementsLayoutStore', () => {
  beforeEach(() => localStorage.removeItem(SETTLEMENTS_LAYOUT_STORAGE_KEY));

  afterEach(() => localStorage.removeItem(SETTLEMENTS_LAYOUT_STORAGE_KEY));

  it('persists and restores a user-adjusted layout', () => {
    TestBed.configureTestingModule({
      providers: [SettlementsLayoutStore, { provide: DOCUMENT, useValue: document }],
    });
    const store = TestBed.inject(SettlementsLayoutStore);

    store.adjust('leftRail', 4);

    expect(store.layout().leftRailPercent).toBe(18);
    expect(JSON.parse(localStorage.getItem(SETTLEMENTS_LAYOUT_STORAGE_KEY) ?? '{}')).toMatchObject({
      leftRailPercent: 18,
    });
  });

  it('constrains resizes so the central workspace remains usable', () => {
    expect(resizeLayout(DEFAULT_SETTLEMENTS_LAYOUT, 'leftRail', 100).leftRailPercent).toBe(32);
    expect(resizeLayout(DEFAULT_SETTLEMENTS_LAYOUT, 'topRow', -100).topRowPercent).toBe(16);
    expect(resizeLayout(DEFAULT_SETTLEMENTS_LAYOUT, 'totalsRow', -100).totalsRowPercent).toBe(32);
  });

  it('removes the persisted layout when reset', () => {
    TestBed.configureTestingModule({
      providers: [SettlementsLayoutStore, { provide: DOCUMENT, useValue: document }],
    });
    const store = TestBed.inject(SettlementsLayoutStore);
    store.adjust('rightSummary', -4);

    store.reset();

    expect(store.layout()).toEqual(DEFAULT_SETTLEMENTS_LAYOUT);
    expect(localStorage.getItem(SETTLEMENTS_LAYOUT_STORAGE_KEY)).toBeNull();
  });
});
