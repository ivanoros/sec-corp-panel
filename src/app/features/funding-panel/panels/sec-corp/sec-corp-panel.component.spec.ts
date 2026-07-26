import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { FundingGridComponent } from '../../presentation/funding-grid/funding-grid.component';
import { SecCorpPanelComponent } from './sec-corp-panel.component';

describe('SecCorpPanelComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            agGridEnterpriseLicenseKey: null,
            apiBaseUrl: '/api',
            businessDate: '2026-07-25',
            fundingPanelDataSource: 'mock',
          },
        },
      ],
    });
  });

  it('mounts a shell-owned panel surface and loads its provider-scoped report', async () => {
    const fixture = TestBed.createComponent(SecCorpPanelComponent);

    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector(
      '[data-testid="sec-corp-panel"]',
    ) as HTMLElement | null;

    expect(panel?.getAttribute('aria-label')).toBe('Sec Corp funding panel');

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(panel?.dataset['loadStatus']).toBe('ready');
      expect(fixture.componentInstance.store.viewModel()?.rows).toHaveLength(37);
      expect(fixture.debugElement.query(By.directive(FundingGridComponent))).not.toBeNull();
    });
  });

  it('creates independent store instances for separate docked panel instances', () => {
    const firstFixture = TestBed.createComponent(SecCorpPanelComponent);
    const secondFixture = TestBed.createComponent(SecCorpPanelComponent);

    expect(firstFixture.componentInstance.store).not.toBe(secondFixture.componentInstance.store);
  });
});
