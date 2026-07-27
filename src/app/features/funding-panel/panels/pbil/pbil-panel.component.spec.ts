import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { FundingGridComponent } from '../../presentation/funding-grid/funding-grid.component';
import { PbilPanelComponent } from './pbil-panel.component';

describe('PbilPanelComponent', () => {
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

  it('loads the PBIL report through the reusable funding surface', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);

    fixture.detectChanges();

    await vi.waitFor(() => {
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector(
        '[data-testid="pbil-panel"]',
      ) as HTMLElement | null;

      expect(panel?.getAttribute('aria-label')).toBe('PBIL funding panel');
      expect(panel?.dataset['loadStatus']).toBe('ready');
      expect(fixture.componentInstance.store.viewModel()?.rows).toHaveLength(27);
      expect(fixture.debugElement.query(By.directive(FundingGridComponent))).not.toBeNull();
    });
  });

  it('keeps LIVE and Opps funding read-only while snapshot inputs are editable', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);

    fixture.detectChanges();

    await vi.waitFor(() => {
      const viewModel = fixture.componentInstance.store.viewModel();
      expect(viewModel).not.toBeNull();

      const arrangedFunding = viewModel?.rows.find(({ id }) => id === 'arranged-funding');
      expect(arrangedFunding?.cells.snapshot0830.editable).toBe(true);
      expect(arrangedFunding?.cells.snapshot1130.editable).toBe(true);
      expect(arrangedFunding?.cells.snapshot1330.editable).toBe(true);
      expect(arrangedFunding?.cells.live.editable).toBe(false);
      expect(arrangedFunding?.cells.opportunityFunding.editable).toBe(false);
    });
  });

  it('autosaves a PBIL snapshot edit with versioning and recalculates EOD', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);
    const store = fixture.componentInstance.store;

    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(store.loadStatus()).toBe('ready');
    });

    expect(store.report()?.version).toBe(7);
    store.beginEdit('pbil-arb-margin', 'snapshot0830', '-800000000');
    expect(store.report()?.rows.find(({ id }) => id === 'end-of-day')?.values.snapshot0830).toBe(
      '9740000000.00',
    );
    expect(store.commitEdit()).toBe(true);

    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('saved');
      expect(store.report()?.version).toBe(8);
      expect(store.isDirty()).toBe(false);
    });
  });
});
