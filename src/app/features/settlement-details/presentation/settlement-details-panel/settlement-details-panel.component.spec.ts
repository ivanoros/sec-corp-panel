import { TestBed } from '@angular/core/testing';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import {
  createSettlementColumnDefs,
  SETTLEMENT_COLUMNS_SIDE_BAR,
  SettlementDetailsPanelComponent,
} from './settlement-details-panel.component';

describe('SettlementDetailsPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettlementDetailsPanelComponent],
      providers: [
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: {
            agGridEnterpriseLicenseKey: null,
            apiBaseUrl: '/api',
            businessDate: '2026-08-10',
            fundingPanelDataSource: 'mock',
            userId: 'test-user',
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the server-backed grid and compact controls', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="settlement-details-grid"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="refresh-settlement-details"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="clear-settlement-filters"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="choose-settlement-columns"]')).not.toBeNull();
    expect(element.querySelector('.settlement-details-panel__title')?.textContent).toContain(
      'Cash and Settlement Details',
    );
    expect(
      element.querySelector<HTMLInputElement>('[aria-label="Settlement Date filter"]')?.value,
    ).toBe('2026-08-10');
  });

  it('renders the screenshot-derived search criteria', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const expectedFilters = [
      'Manager filter',
      'Settlement Date filter',
      'Settlement Mode filter',
      'Activity Type filter',
      'Settlement Status filter',
      'Blotter Code filter',
      'Source filter',
      'Trade Type filter',
      'Trade ID filter',
      'Product filter',
    ];

    for (const label of expectedFilters) {
      expect(element.querySelector(`[aria-label="${label}"]`)).not.toBeNull();
    }
  });

  it('updates the server-side business date and toolbar criteria', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    const dateInput = element.querySelector<HTMLInputElement>(
      '[aria-label="Settlement Date filter"]',
    );
    const statusSelect = element.querySelector<HTMLSelectElement>(
      '[aria-label="Settlement Status filter"]',
    );

    expect(dateInput).not.toBeNull();
    expect(statusSelect).not.toBeNull();

    if (dateInput === null || statusSelect === null) {
      return;
    }

    dateInput.value = '2026-08-11';
    dateInput.dispatchEvent(new Event('change'));
    statusSelect.value = 'Failed';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.settlementDate()).toBe('2026-08-11');
    expect(component.toolbarFilters().settlementStatus).toBe('Failed');
  });

  it('configures a collapsed visibility-and-order-only columns chooser', () => {
    expect(SETTLEMENT_COLUMNS_SIDE_BAR).toMatchObject({
      hiddenByDefault: true,
      hideButtons: true,
      position: 'left',
      toolPanels: [
        {
          id: 'columns',
          toolPanel: 'agColumnsToolPanel',
          toolPanelParams: {
            suppressColumnFilter: true,
            suppressPivots: true,
            suppressPivotMode: true,
            suppressRowGroups: true,
            suppressValues: true,
          },
        },
      ],
    });
  });

  it('places the column chooser at the left edge of the toolbar', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const toolbar = (fixture.nativeElement as HTMLElement).querySelector(
      '.settlement-details-panel__toolbar',
    );

    expect(toolbar?.firstElementChild?.getAttribute('data-testid')).toBe(
      'choose-settlement-columns',
    );
  });

  it('defines the complete screenshot-derived read-only column set', () => {
    const columns = createSettlementColumnDefs();

    expect(columns).toHaveLength(20);
    expect(columns.map(({ colId }) => colId)).toEqual(
      expect.arrayContaining([
        'settlementMode',
        'activityType',
        'settlementStatus',
        'managerName',
        'securityDescription',
        'bookingReferenceId',
        'tradeType',
      ]),
    );
    expect(columns.every(({ editable }) => editable !== true)).toBe(true);
  });
});
