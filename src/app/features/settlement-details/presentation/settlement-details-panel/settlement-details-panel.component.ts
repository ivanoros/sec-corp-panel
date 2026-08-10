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
  FilterModel,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  SideBarDef,
  ToolPanelVisibleChangedEvent,
} from 'ag-grid-community';

import { APP_RUNTIME_CONFIG } from '../../../../core/config/runtime-config';
import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { ENTERPRISE_GRID_THEME } from '../../../../core/grid/enterprise-grid.theme';
import { SETTLEMENT_DETAILS_DATA_ACCESS_PROVIDERS } from '../../data-access/settlement-details-data.providers';
import { SettlementDetailsDataSource } from '../../data-access/settlement-details.datasource';
import { SETTLEMENT_DETAILS_GATEWAY } from '../../data-access/settlement-details.gateway';
import type {
  SettlementDetail,
  SettlementDetailField,
  SettlementDetailsSearchResult,
} from '../../domain/settlement-detail';

interface SettlementColumn {
  readonly field: SettlementDetailField;
  readonly headerName: string;
  readonly width: number;
  readonly pinned?: 'left';
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

type ToolbarFilterValues = Readonly<Record<ToolbarFilterField, string>>;

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
] as const;

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
  providers: SETTLEMENT_DETAILS_DATA_ACCESS_PROVIDERS,
})
export class SettlementDetailsPanelComponent {
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly gateway = inject(SETTLEMENT_DETAILS_GATEWAY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly gridApi = signal<GridApi<SettlementDetail> | null>(null);
  private readonly lastResult = signal<SettlementDetailsSearchResult | null>(null);
  private toolbarFilterTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeFilterCount = signal(0);
  readonly columnChooserOpen = signal(false);
  readonly settlementDate = signal(this.runtimeConfig.businessDate);
  readonly toolbarFilters = signal<ToolbarFilterValues>(EMPTY_TOOLBAR_FILTERS);
  readonly totalCount = computed(() => this.lastResult()?.totalCount ?? null);
  readonly asOf = computed(() => this.lastResult()?.asOf ?? null);
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
  readonly pageSizeOptions = [50, 100, 250, 500];
  readonly sideBar = SETTLEMENT_COLUMNS_SIDE_BAR;
  readonly theme = ENTERPRISE_GRID_THEME;
  readonly dataSource = new SettlementDetailsDataSource(
    this.gateway,
    {
      businessDate: () => this.settlementDate(),
      userId: this.runtimeConfig.userId,
    },
    {
      onError: (message) => this.errorMessage.set(message),
      onLoadingChange: (loading) => this.isLoading.set(loading),
      onResult: (result) => {
        this.errorMessage.set(null);
        this.lastResult.set(result);
      },
    },
  );
  readonly getRowId = ({ data }: GetRowIdParams<SettlementDetail>): string => data.recordId;

  constructor() {
    configureAgGrid(this.runtimeConfig);
    this.destroyRef.onDestroy(() => {
      if (this.toolbarFilterTimer !== null) {
        clearTimeout(this.toolbarFilterTimer);
      }

      this.dataSource.destroy();
    });
  }

  onGridReady(event: GridReadyEvent<SettlementDetail>): void {
    this.gridApi.set(event.api);
  }

  onFilterChanged(event: FilterChangedEvent<SettlementDetail>): void {
    const filterModel = event.api.getFilterModel();

    this.activeFilterCount.set(Object.keys(filterModel).length);
    this.syncToolbarFiltersFromGrid(filterModel);
  }

  clearFilters(): void {
    this.toolbarFilters.set(EMPTY_TOOLBAR_FILTERS);
    this.gridApi()?.setFilterModel(null);
  }

  updateSettlementDate(event: Event): void {
    const businessDate = readControlValue(event);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate) || businessDate === this.settlementDate()) {
      return;
    }

    this.settlementDate.set(businessDate);
    this.refreshFromFirstPage();
  }

  updateToolbarTextFilter(field: ToolbarFilterField, event: Event): void {
    this.updateToolbarFilterValue(field, readControlValue(event));

    if (this.toolbarFilterTimer !== null) {
      clearTimeout(this.toolbarFilterTimer);
    }

    this.toolbarFilterTimer = setTimeout(() => {
      this.toolbarFilterTimer = null;
      this.applyToolbarFilters();
    }, 350);
  }

  updateToolbarSelectFilter(field: ToolbarFilterField, event: Event): void {
    this.updateToolbarFilterValue(field, readControlValue(event));
    this.applyToolbarFilters();
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
    this.errorMessage.set(null);
    this.gridApi()?.refreshServerSide({ purge: true });
  }

  private updateToolbarFilterValue(field: ToolbarFilterField, value: string): void {
    this.toolbarFilters.update((filters) => ({ ...filters, [field]: value }));
  }

  private applyToolbarFilters(): void {
    const api = this.gridApi();

    if (api === null) {
      return;
    }

    const filterModel: FilterModel = { ...api.getFilterModel() };

    for (const [field, value] of Object.entries(this.toolbarFilters()) as [
      ToolbarFilterField,
      string,
    ][]) {
      if (value.length === 0) {
        delete filterModel[field];
      } else {
        filterModel[field] = {
          filterType: 'text',
          type: EXACT_MATCH_TOOLBAR_FIELDS.has(field) ? 'equals' : 'contains',
          filter: value,
        };
      }
    }

    api.setFilterModel(filterModel);
    api.onFilterChanged();
  }

  private syncToolbarFiltersFromGrid(filterModel: FilterModel): void {
    const nextFilters = Object.fromEntries(
      Object.keys(EMPTY_TOOLBAR_FILTERS).map((field) => [
        field,
        readGridFilterValue(filterModel[field]),
      ]),
    ) as Record<ToolbarFilterField, string>;

    this.toolbarFilters.set(nextFilters);
  }

  private refreshFromFirstPage(): void {
    const api = this.gridApi();

    if (api === null) {
      return;
    }

    if (api.paginationGetCurrentPage() === 0) {
      api.refreshServerSide({ purge: true });
    } else {
      api.paginationGoToFirstPage();
    }
  }
}

export function createSettlementColumnDefs(): ColDef<SettlementDetail>[] {
  return SETTLEMENT_COLUMNS.map(({ field, headerName, width, pinned }) => ({
    colId: field,
    field,
    headerName,
    width,
    ...(pinned === undefined ? {} : { pinned }),
    tooltipField: field,
  }));
}

function readControlValue(event: Event): string {
  const target = event.target;

  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value.trim()
    : '';
}

function readGridFilterValue(model: unknown): string {
  if (typeof model !== 'object' || model === null || Array.isArray(model)) {
    return '';
  }

  const filter = (model as Readonly<Record<string, unknown>>)['filter'];
  return typeof filter === 'string' ? filter : '';
}
