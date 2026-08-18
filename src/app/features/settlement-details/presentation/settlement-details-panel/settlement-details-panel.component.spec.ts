import { TestBed } from '@angular/core/testing';
import type { FilterChangedEvent, GridApi } from 'ag-grid-community';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { SettlementDetailsWindowStore } from '../../data-access/settlement-details-window.store';
import type { SettlementDetail } from '../../domain/settlement-detail';
import {
  createSettlementColumnDefs,
  formatAccountingNumber,
  mapToolbarFilters,
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

  it('renders the hybrid grid, server pager, and compact controls', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="settlement-details-grid"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="refresh-settlement-details"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="clear-settlement-filters"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="choose-settlement-columns"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="settlement-next-page"]')).not.toBeNull();
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

  it('places clear filters immediately after the Product criterion', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    fixture.detectChanges();
    const productInput = (fixture.nativeElement as HTMLElement).querySelector(
      '[aria-label="Product filter"]',
    );
    const productCriterion = productInput?.closest('.settlement-details-panel__criterion');

    expect(productCriterion?.nextElementSibling?.getAttribute('data-testid')).toBe(
      'clear-settlement-filters',
    );
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

    expect(columns).toHaveLength(25);
    expect(columns.map(({ colId }) => colId)).toEqual(
      expect.arrayContaining([
        'settlementMode',
        'activityType',
        'settlementStatus',
        'managerName',
        'securityDescription',
        'bookingReferenceId',
        'tradeType',
        'tradedQuantity',
        'tradeNetAmount',
        'settledQuantity',
        'settlementNetAmount',
        'settlementCurrency',
      ]),
    );
    expect(columns.every(({ editable }) => editable !== true)).toBe(true);
    expect(columns.find(({ colId }) => colId === 'tradedQuantity')?.filter).toBe(
      'agNumberColumnFilter',
    );
    expect(columns.find(({ colId }) => colId === 'tradeNetAmount')?.type).toBe('numericColumn');
  });

  it('formats negative quantities and amounts with accounting parentheses', () => {
    expect(formatAccountingNumber(-795_873, 'quantity')).toBe('(795,873)');
    expect(formatAccountingNumber(427_655_785.25, 'amount')).toBe('427,655,785.25');
    expect(formatAccountingNumber(null, 'amount')).toBe('');
  });

  it('maps only top criteria to backend filters with the expected operators', () => {
    expect(
      mapToolbarFilters({
        activityType: 'Prime Broker',
        blotterCode: ' ',
        managerName: ' Capital ',
        productId: '',
        settlementMode: 'CNS',
        settlementStatus: 'Pending',
        source: '',
        tradeId: 'TRD-2026',
        tradeType: '',
      }),
    ).toEqual([
      { field: 'activityType', operator: 'equals', value: 'Prime Broker' },
      { field: 'managerName', operator: 'contains', value: 'Capital' },
      { field: 'settlementMode', operator: 'equals', value: 'CNS' },
      { field: 'settlementStatus', operator: 'equals', value: 'Pending' },
      { field: 'tradeId', operator: 'contains', value: 'TRD-2026' },
    ]);
  });

  it('keeps grid-column filtering local while top criteria reload the backend window', () => {
    const fixture = TestBed.createComponent(SettlementDetailsPanelComponent);
    const store = fixture.debugElement.injector.get(SettlementDetailsWindowStore);
    const loadPage = vi.spyOn(store, 'loadPage');

    fixture.detectChanges();
    loadPage.mockClear();

    const gridApi = {
      getDisplayedRowCount: () => 59,
      getFilterModel: () => ({
        settlementStatus: { filterType: 'text', type: 'contains', filter: 'Failed' },
      }),
    } as unknown as GridApi<SettlementDetail>;

    fixture.componentInstance.onFilterChanged({
      api: gridApi,
    } as FilterChangedEvent<SettlementDetail>);

    expect(loadPage).not.toHaveBeenCalled();
    expect(fixture.componentInstance.displayedRowCount()).toBe(59);

    const statusSelect = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '[aria-label="Settlement Status filter"]',
    );

    expect(statusSelect).not.toBeNull();

    if (statusSelect === null) {
      return;
    }

    statusSelect.value = 'Failed';
    statusSelect.dispatchEvent(new Event('change'));

    expect(loadPage).toHaveBeenCalledOnce();
    expect(loadPage).toHaveBeenCalledWith(
      {
        businessDate: '2026-08-10',
        filters: [{ field: 'settlementStatus', operator: 'equals', value: 'Failed' }],
      },
      0,
    );
  });
});
