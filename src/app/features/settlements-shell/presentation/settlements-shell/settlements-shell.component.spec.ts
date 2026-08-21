import { TestBed } from '@angular/core/testing';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { SettlementsLayoutStore } from '../../application/settlements-layout.store';
import { SettlementsShellComponent } from './settlements-shell.component';

describe('SettlementsShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettlementsShellComponent],
      providers: [
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            agGridEnterpriseLicenseKey: null,
            apiBaseUrl: '/api',
            businessDate: '2026-07-25',
            fundingPanelDataSource: 'mock',
            settlementsPollingEnabled: false,
            settlementsPollingIntervalMs: 60_000,
            userId: 'test-user',
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the two summary panels and expanded Settlement Details panel', async () => {
    const fixture = TestBed.createComponent(SettlementsShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 100));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-fail-projection-panel')).not.toBeNull();
    expect(element.querySelector('app-net-cash-position-panel')).toBeNull();
    expect(element.querySelector('app-cash-positions-over-time-panel')).not.toBeNull();
    expect(element.querySelector('app-settlement-details-panel')).not.toBeNull();
    expect(element.querySelector('app-end-of-day-movement-panel')).toBeNull();
    expect(element.querySelector('app-projections-panel')).toBeNull();
    expect(element.querySelector('app-settlement-totals-panel')).toBeNull();
    expect(element.querySelector('[data-testid="resize-right-summary"]')).toBeNull();
    expect(element.querySelector('[data-testid="resize-totals-row"]')).toBeNull();
    expect(element.querySelector('.settlements-shell__masthead')).toBeNull();
    expect(element.querySelector('.settlements-shell__navigation')).toBeNull();
  });

  it('renders keyboard-accessible resize handles and resets the layout', async () => {
    const fixture = TestBed.createComponent(SettlementsShellComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 100));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const leftHandle = element.querySelector<HTMLElement>('[data-testid="resize-left-rail"]');
    const reset = element.querySelector<HTMLButtonElement>(
      '[data-testid="reset-settlements-layout"]',
    );
    const layoutStore = fixture.debugElement.injector.get(SettlementsLayoutStore);

    expect(leftHandle?.getAttribute('role')).toBe('separator');
    expect(leftHandle?.getAttribute('aria-orientation')).toBe('vertical');

    leftHandle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(layoutStore.layout().leftRailPercent).toBe(32);

    reset?.click();
    expect(layoutStore.layout().leftRailPercent).toBe(30);
  });
});
