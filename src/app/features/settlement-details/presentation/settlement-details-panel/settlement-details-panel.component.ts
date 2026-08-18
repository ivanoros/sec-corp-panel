import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  ColDef,
  FilterChangedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ModelUpdatedEvent,
  SideBarDef,
  ToolPanelVisibleChangedEvent,
  ValueFormatterParams,
} from 'ag-grid-community';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { ENTERPRISE_GRID_THEME } from '../../../../core/grid/enterprise-grid.theme';
import { SETTLEMENT_DETAILS_DATA_ACCESS_PROVIDERS } from '../../data-access/settlement-details-data.providers';
import { SettlementDetailsWindowStore } from '../../data-access/settlement-details-window.store';
import type {
  SettlementDetail,
  SettlementDetailField,
  SettlementTextFilter,
} from '../../domain/settlement-detail';

interface SettlementColumn {
  readonly field: SettlementDetailField;
  readonly headerName: string;
  readonly width: number;
  readonly pinned?: 'left';
  readonly numericKind?: 'amount' | 'quantity';
}

type ToolbarFilterField =
  | 'activityType'
  | 'blotterCode'
  | 'managerName'
  | 'productId'
  | 'settlementMode'
  | 'settlementStatus'
  | 'source'
  | 'tradeId'
  | 'tradeType';

export type ToolbarFilterValues = Readonly<Record<ToolbarFilterField, string>>;

const EMPTY_TOOLBAR_FILTERS: ToolbarFilterValues = {
  activityType: '',
  blotterCode: '',
  managerName: '',
  productId: '',
  settlementMode: '',
  settlementStatus: '',
  source: '',
  tradeId: '',
  tradeType: '',
};

const EXACT_MATCH_TOOLBAR_FIELDS = new Set<ToolbarFilterField>([
  'activityType',
  'settlementMode',
  'settlementStatus',
  'source',
  'tradeType',
]);

const SETTLEMENT_COLUMNS: readonly SettlementColumn[] = [
  { field: 'settlementMode', headerName: 'Settlement Mode', width: 132, pinned: 'left' },
  { field: 'activityType', headerName: 'Activity Type', width: 175, pinned: 'left' },
  { field: 'settlementStatus', headerName: 'Settlement Status', width: 132 },
  { field: 'managerCode', headerName: 'Manager Code', width: 112 },
  { field: 'managerName', headerName: 'Manager Name', width: 190 },
  { field: 'lineOfBusiness', headerName: 'Line of Business', width: 118 },
  { field: 'accountId', headerName: 'Account ID', width: 120 },
  { field: 'accountName', headerName: 'Account Name', width: 205 },
  { field: 'cusip', headerName: 'CUSIP', width: 112 },
  { field: 'productId', headerName: 'Product ID', width: 112 },
  { field: 'securityDescription', headerName: 'Security Description', width: 225 },
  { field: 'isin', headerName: 'ISIN', width: 135 },
  { field: 'sedol', headerName: 'SEDOL', width: 105 },
  { field: 'assetType', headerName: 'Asset Type', width: 105 },
  { field: 'assetSubClass', headerName: 'Asset Sub-Class', width: 140 },
  { field: 'blotterCode', headerName: 'Blotter Code', width: 110 },
  { field: 'bookingReferenceId', headerName: 'Booking Reference ID', width: 205 },
  { field: 'source', headerName: 'Source', width: 110 },
  { field: 'tradeType', headerName: 'Trade Type', width: 112 },
  { field: 'tradeId', headerName: 'Trade ID', width: 145 },
  {
    field: 'tradedQuantity',
    headerName: 'Traded Quantity',
    width: 145,
    numericKind: 'quantity',
  },
  {
    field: 'tradeNetAmount',
    headerName: 'Trade Net Amount',
    width: 165,
    numericKind: 'amount',
  },
  {
    field: 'settledQuantity',
    headerName: 'Settled Quantity',
    width: 145,
    numericKind: 'quantity',
  },
  {
    field: 'settlementNetAmount',
    headerName: 'Settlement Net Amount',
    width: 185,
    numericKind: 'amount',
  },
  { field: 'settlementCurrency', headerName: 'Settlement Currency', width: 155 },
] as const;

const QUANTITY_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
});
const AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

export const SETTLEMENT_COLUMNS_SIDE_BAR: SideBarDef = {
  hiddenByDefault: true,
  hideButtons: true,
  position: 'left',
  toolPanels: [
    {
      id: 'columns',
      labelDefault: 'Columns',
      labelKey: 'columns',
      iconKey: 'columns',
      toolPanel: 'agColumnsToolPanel',
      minWidth: 220,
      width: 260,
      maxWidth: 340,
      toolPanelParams: {
        suppressColumnFilter: true,
        suppressColumnMove: false,
        suppressPivots: true,
        suppressPivotMode: true,
        suppressRowGroups: true,
        suppressValues: true,
      },
    },
  ],
};

@Component({
  selector: 'app-settlement-details-panel',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './settlement-details-panel.component.html',
  styleUrl: './settlement-details-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [...SETTLEMENT_DETAILS_DATA_ACCESS_PROVIDERS, SettlementDetailsWindowStore],
})
export class SettlementDetailsPanelComponent {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly windowStore = inject(SettlementDetailsWindowStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly gridApi = signal<GridApi<SettlementDetail> | null>(null);
  private readonly localFilterCount = signal(0);
  private toolbarFilterTimer: ReturnType<typeof setTimeout> | null = null;

  readonly rows = this.windowStore.rows.asReadonly();
  readonly totalCount = this.windowStore.totalCount.asReadonly();
  readonly asOf = this.windowStore.asOf.asReadonly();
  readonly serverPageIndex = this.windowStore.serverPageIndex.asReadonly();
  readonly serverPageCount = this.windowStore.serverPageCount;
  readonly rangeStart = this.windowStore.rangeStart;
  readonly rangeEnd = this.windowStore.rangeEnd;
  readonly isLoading = this.windowStore.isLoading.asReadonly();
  readonly errorMessage = this.windowStore.errorMessage.asReadonly();
  readonly displayedRowCount = signal(0);
  readonly columnChooserOpen = signal(false);
  readonly settlementDate = signal(this.runtimeConfig.businessDate);
  readonly toolbarFilters = signal<ToolbarFilterValues>(EMPTY_TOOLBAR_FILTERS);
  readonly activeServerFilterCount = computed(
    () => Object.values(this.toolbarFilters()).filter((value) => value.length > 0).length,
  );
  readonly activeFilterCount = computed(
    () => this.activeServerFilterCount() + this.localFilterCount(),
  );
  readonly loadedRowCount = computed(() => this.rows().length);
  readonly canGoToPreviousPage = computed(() => !this.isLoading() && this.serverPageIndex() > 0);
  readonly canGoToNextPage = computed(
    () => !this.isLoading() && this.serverPageIndex() + 1 < this.serverPageCount(),
  );
  readonly activityTypeOptions = [
    'Prime Broker',
    'Other Agency and Principal',
    'Cash Equity Client',
    'Transfer as Trade',
    'Other non-CNS Activity',
    'PB Done With',
  ];
  readonly settlementModeOptions = ['CNS', 'DVP/RVP'];
  readonly settlementStatusOptions = ['Pending', 'Failed', 'Partial', 'Full'];
  readonly sourceOptions = ['SOD-Batch', 'Intraday'];
  readonly tradeTypeOptions = ['Buy Long', 'Sell Long', 'Sell Short', 'Cover Short'];
  readonly columnDefs = createSettlementColumnDefs();
  readonly defaultColDef: ColDef<SettlementDetail> = {
    editable: false,
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset'],
      debounceMs: 350,
      maxNumConditions: 1,
      trimInput: true,
    },
    floatingFilter: true,
    resizable: true,
    sortable: true,
    suppressHeaderMenuButton: false,
  };
  readonly sideBar = SETTLEMENT_COLUMNS_SIDE_BAR;
  readonly theme = ENTERPRISE_GRID_THEME;
  readonly getRowId = ({ data }: GetRowIdParams<SettlementDetail>): string => data.recordId;

  constructor() {
    configureAgGrid(this.runtimeConfig);
    this.destroyRef.onDestroy(() => {
      if (this.toolbarFilterTimer !== null) {
        clearTimeout(this.toolbarFilterTimer);
      }
    });
  }

  onGridReady(event: GridReadyEvent<SettlementDetail>): void {
    this.gridApi.set(event.api);
    this.loadServerPage(0);
  }

  onFilterChanged(event: FilterChangedEvent<SettlementDetail>): void {
    const filterModel = event.api.getFilterModel();

    this.localFilterCount.set(Object.keys(filterModel).length);
    this.displayedRowCount.set(event.api.getDisplayedRowCount());
  }

  onModelUpdated(event: ModelUpdatedEvent<SettlementDetail>): void {
    this.displayedRowCount.set(event.api.getDisplayedRowCount());
  }

  clearFilters(): void {
    const hadServerFilters = this.activeServerFilterCount() > 0;

    this.cancelToolbarFilterTimer();
    this.toolbarFilters.set(EMPTY_TOOLBAR_FILTERS);
    this.gridApi()?.setFilterModel(null);

    if (hadServerFilters) {
      this.loadServerPage(0);
    }
  }

  updateSettlementDate(event: Event): void {
    const businessDate = readControlValue(event);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate) || businessDate === this.settlementDate()) {
      return;
    }

    this.cancelToolbarFilterTimer();
    this.settlementDate.set(businessDate);
    this.loadServerPage(0);
  }

  updateToolbarTextFilter(field: ToolbarFilterField, event: Event): void {
    this.updateToolbarFilterValue(field, readControlValue(event));
    this.cancelToolbarFilterTimer();

    this.toolbarFilterTimer = setTimeout(() => {
      this.toolbarFilterTimer = null;
      this.loadServerPage(0);
    }, 350);
  }

  updateToolbarSelectFilter(field: ToolbarFilterField, event: Event): void {
    this.cancelToolbarFilterTimer();
    this.updateToolbarFilterValue(field, readControlValue(event));
    this.loadServerPage(0);
  }

  toggleColumnChooser(): void {
    const api = this.gridApi();

    if (api === null) {
      return;
    }

    if (api.getOpenedToolPanel() === 'columns') {
      api.closeToolPanel();
      api.setSideBarVisible(false);
      return;
    }

    api.setSideBarVisible(true);
    api.openToolPanel('columns');
  }

  onToolPanelVisibleChanged(event: ToolPanelVisibleChangedEvent<SettlementDetail>): void {
    if (event.key !== 'columns') {
      return;
    }

    this.columnChooserOpen.set(event.visible);

    if (!event.visible) {
      event.api.setSideBarVisible(false);
    }
  }

  refresh(): void {
    this.cancelToolbarFilterTimer();
    this.loadServerPage(this.serverPageIndex());
  }

  refreshIfIdle(): void {
    if (!this.isLoading()) {
      this.refresh();
    }
  }

  goToFirstPage(): void {
    this.loadServerPage(0);
  }

  goToPreviousPage(): void {
    if (this.canGoToPreviousPage()) {
      this.loadServerPage(this.serverPageIndex() - 1);
    }
  }

  goToNextPage(): void {
    if (this.canGoToNextPage()) {
      this.loadServerPage(this.serverPageIndex() + 1);
    }
  }

  goToLastPage(): void {
    if (this.canGoToNextPage()) {
      this.loadServerPage(this.serverPageCount() - 1);
    }
  }

  private updateToolbarFilterValue(field: ToolbarFilterField, value: string): void {
    this.toolbarFilters.update((filters) => ({ ...filters, [field]: value }));
  }

  private cancelToolbarFilterTimer(): void {
    if (this.toolbarFilterTimer !== null) {
      clearTimeout(this.toolbarFilterTimer);
      this.toolbarFilterTimer = null;
    }
  }

  private loadServerPage(pageIndex: number): void {
    this.windowStore.loadPage(
      {
        businessDate: this.settlementDate(),
        filters: mapToolbarFilters(this.toolbarFilters()),
      },
      pageIndex,
    );
  }
}

export function createSettlementColumnDefs(): ColDef<SettlementDetail>[] {
  return SETTLEMENT_COLUMNS.map(({ field, headerName, width, pinned, numericKind }) => {
    const numericDefinition: ColDef<SettlementDetail> =
      numericKind === undefined
        ? {}
        : {
            cellStyle: ({ value }) => ({
              color:
                typeof value === 'number' && value < 0
                  ? '#ff7b8c'
                  : numericKind === 'amount'
                    ? '#89c9a6'
                    : '#f1f3f3',
              fontVariantNumeric: 'tabular-nums',
            }),
            filter: 'agNumberColumnFilter',
            type: 'numericColumn',
            valueFormatter: (params: ValueFormatterParams<SettlementDetail, number>) =>
              formatAccountingNumber(params.value, numericKind),
          };

    return {
      colId: field,
      field,
      headerName,
      width,
      ...(pinned === undefined ? {} : { pinned }),
      tooltipField: field,
      ...numericDefinition,
    };
  });
}

export function formatAccountingNumber(
  value: number | null | undefined,
  kind: 'amount' | 'quantity',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }

  const formatted = (kind === 'amount' ? AMOUNT_FORMATTER : QUANTITY_FORMATTER).format(
    Math.abs(value),
  );

  return value < 0 ? `(${formatted})` : formatted;
}

function readControlValue(event: Event): string {
  const target = event.target;

  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value.trim()
    : '';
}

export function mapToolbarFilters(filters: ToolbarFilterValues): SettlementTextFilter[] {
  return (Object.entries(filters) as [ToolbarFilterField, string][]).flatMap(
    ([field, rawValue]) => {
      const value = rawValue.trim();

      return value.length === 0
        ? []
        : [
            {
              field,
              operator: EXACT_MATCH_TOOLBAR_FIELDS.has(field) ? 'equals' : 'contains',
              value,
            } satisfies SettlementTextFilter,
          ];
    },
  );
}
