import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { FUNDING_PANEL_GATEWAY } from '../../data-access/funding-panel.gateway';
import type { SaveFundingReportCommand } from '../../domain/funding-report';
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

  it('allows snapshot and Opps funding inputs while keeping LIVE read-only', async () => {
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
      expect(arrangedFunding?.cells.opportunityFunding.editable).toBe(true);
    });
  });

  it('keeps a committed edit local until Update sends the complete report', async () => {
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
    expect(store.saveStatus()).toBe('idle');
    expect(store.report()?.version).toBe(7);
    expect(store.isDirty()).toBe(true);

    fixture.detectChanges();
    const updateButton = fixture.nativeElement.querySelector(
      '[data-testid="update-report"]',
    ) as HTMLButtonElement | null;

    expect(updateButton?.disabled).toBe(false);
    updateButton?.click();

    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('saved');
      expect(store.report()?.version).toBe(8);
      expect(store.isDirty()).toBe(false);
    });
  });

  it('rejects an outdated save and tells the user to reload because changes were not saved', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);
    const store = fixture.componentInstance.store;
    const gateway = fixture.debugElement.injector.get(FUNDING_PANEL_GATEWAY);

    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(store.loadStatus()).toBe('ready');
    });

    const screenReport = store.report();

    if (screenReport === null) {
      throw new Error('Expected the PBIL report to be loaded.');
    }

    const externalUpdate: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: screenReport.version,
      report: screenReport,
    };
    const externallySavedReport = await firstValueFrom(gateway.putReport(externalUpdate));

    expect(externallySavedReport.version).toBe(8);
    expect(store.report()?.version).toBe(7);

    store.beginEdit('pbil-arb-margin', 'snapshot0830', '-800000000');
    expect(store.commitEdit()).toBe(true);
    expect(store.updateReport()).toBe(true);

    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('conflict');
    });
    fixture.detectChanges();

    const conflictAlert = fixture.nativeElement.querySelector(
      '[data-testid="version-conflict"]',
    ) as HTMLElement | null;
    const conflictText = conflictAlert?.textContent?.replace(/\s+/g, ' ').trim();

    expect(store.conflict()).toEqual({ expectedVersion: 7, currentVersion: 8 });
    expect(store.isDirty()).toBe(true);
    expect(conflictText).toContain('This screen is out of date');
    expect(conflictText).toContain('your changes were not saved');
    expect(conflictText).toContain('Screen version 7; latest version 8');
    expect(conflictText).toContain('Reload latest data');
  });

  it('uses Refresh to retrieve the latest backend report', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);
    const store = fixture.componentInstance.store;
    const gateway = fixture.debugElement.injector.get(FUNDING_PANEL_GATEWAY);

    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(store.loadStatus()).toBe('ready');
    });

    const screenReport = store.report();

    if (screenReport === null) {
      throw new Error('Expected the PBIL report to be loaded.');
    }

    const externallySavedReport = await firstValueFrom(
      gateway.putReport({
        schemaVersion: 1,
        expectedVersion: screenReport.version,
        report: screenReport,
      }),
    );

    expect(externallySavedReport.version).toBe(8);
    expect(store.report()?.version).toBe(7);

    fixture.detectChanges();
    const refreshButton = fixture.nativeElement.querySelector(
      '[data-testid="refresh-report"]',
    ) as HTMLButtonElement | null;

    expect(refreshButton?.disabled).toBe(false);
    refreshButton?.click();

    await vi.waitFor(() => {
      expect(store.report()?.version).toBe(8);
    });
  });

  it('requires confirmation before Refresh discards unsaved edits', async () => {
    const fixture = TestBed.createComponent(PbilPanelComponent);
    const store = fixture.componentInstance.store;

    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(store.loadStatus()).toBe('ready');
    });

    store.beginEdit('pbil-arb-margin', 'snapshot0830', '-800000000');
    store.commitEdit();
    fixture.detectChanges();

    const refreshButton = fixture.nativeElement.querySelector(
      '[data-testid="refresh-report"]',
    ) as HTMLButtonElement | null;
    refreshButton?.click();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="refresh-discard-confirmation"]'),
    ).not.toBeNull();
    expect(store.isDirty()).toBe(true);
  });
});
