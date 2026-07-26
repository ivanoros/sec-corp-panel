import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  CellClassParams,
  ColDef,
  EditableCallbackParams,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowClassParams,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';

import { FundingPanelStore } from '../../application/funding-panel.store';
import type { ReportPeriod } from '../../domain/funding-report';
import {
  type FundingGridCellViewModel,
  type FundingGridRowViewModel,
  type FundingGridViewModel,
} from '../funding-grid.viewmodel';
import {
  FUNDING_GRID_CELL_CLASSES,
  formatFundingAmount,
  formatFundingRowLabel,
  getFundingRowClass,
  getFundingValueCellClasses,
} from './funding-grid-display';
import { FundingAmountCellEditorComponent } from './funding-amount-cell-editor.component';
import { FUNDING_GRID_THEME } from './funding-grid.theme';

type FundingColumnValue = FundingGridCellViewModel | string | null;
type FundingColumnDef = ColDef<FundingGridRowViewModel, FundingColumnValue>;

let fundingGridInstanceSequence = 0;

@Component({
  selector: 'app-funding-grid',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './funding-grid.component.html',
  styleUrl: './funding-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FundingGridComponent {
  private readonly store = inject(FundingPanelStore);
  private readonly gridApi = signal<GridApi<FundingGridRowViewModel> | null>(null);

  readonly viewModel = input.required<FundingGridViewModel>();
  readonly descriptionId = `funding-grid-description-${++fundingGridInstanceSequence}`;

  readonly rowData = computed(() => [...this.viewModel().rows]);
  readonly columnDefs = computed(() => createFundingColumnDefs(this.viewModel().periods), {
    equal: hasSameColumnLayout,
  });
  readonly ariaLabel = computed(() => {
    const viewModel = this.viewModel();
    return `${viewModel.title} funding report for ${viewModel.businessDate}`;
  });
  readonly ariaDescription = computed(() => {
    const viewModel = this.viewModel();
    const periodLabels = viewModel.periods.map(({ label }) => label).join(', ');

    return [
      `Currency ${viewModel.currency}.`,
      `Data as of ${viewModel.asOf} in ${viewModel.timezone}.`,
      `Columns are Bucket, ${periodLabels}.`,
      'Snapshot cells may be edited when permitted; LIVE and Opps funding are read-only.',
    ].join(' ');
  });
  readonly defaultColDef: FundingColumnDef = {
    editable: false,
    filter: false,
    resizable: true,
    sortable: false,
    suppressHeaderMenuButton: true,
  };
  readonly theme = FUNDING_GRID_THEME;
  readonly getRowId = ({ data }: GetRowIdParams<FundingGridRowViewModel>): string => data.id;
  readonly getRowClass = ({ data }: RowClassParams<FundingGridRowViewModel>): string | undefined =>
    data === undefined ? undefined : getFundingRowClass(data);

  constructor() {
    // AG Grid owns the focusable treegrid element, so its imperative API is the
    // appropriate boundary for keeping accessible metadata in sync with signals.
    effect(() => {
      const api = this.gridApi();

      if (api === null) {
        return;
      }

      api.setGridAriaProperty('label', this.ariaLabel());
      api.setGridAriaProperty('describedby', this.descriptionId);
    });
  }

  onGridReady(event: GridReadyEvent<FundingGridRowViewModel>): void {
    this.gridApi.set(event.api);
  }

  onCellEditingStopped(): void {
    this.store.commitEdit();
  }
}

export function createFundingColumnDefs(periods: readonly ReportPeriod[]): FundingColumnDef[] {
  return [
    {
      colId: 'bucket',
      headerName: 'Bucket',
      flex: 2.2,
      minWidth: 230,
      valueGetter: ({ data }: ValueGetterParams<FundingGridRowViewModel, FundingColumnValue>) =>
        data === undefined ? '' : formatFundingRowLabel(data),
      cellClass: 'funding-grid__cell--bucket',
      headerClass: 'funding-grid__header--bucket',
      tooltipValueGetter: ({ data }) => data?.label ?? '',
    },
    ...periods.map((period) => createPeriodColumn(period)),
  ];
}

function createPeriodColumn(period: ReportPeriod): FundingColumnDef {
  return {
    colId: period.id,
    headerName: period.label,
    flex: 1,
    minWidth: period.id === 'opportunityFunding' ? 124 : 108,
    valueGetter: ({
      data,
    }: ValueGetterParams<FundingGridRowViewModel, FundingColumnValue>): FundingColumnValue =>
      data?.cells[period.id] ?? null,
    valueFormatter: ({
      value,
    }: ValueFormatterParams<FundingGridRowViewModel, FundingColumnValue>): string =>
      isFundingCell(value) ? formatFundingAmount(value.value) : '',
    editable: ({
      data,
    }: EditableCallbackParams<FundingGridRowViewModel, FundingColumnValue>): boolean =>
      data === undefined ? false : isFundingGridCellEditable(data, period),
    cellClass: ({
      value,
    }: CellClassParams<FundingGridRowViewModel, FundingColumnValue>): string[] =>
      isFundingCell(value)
        ? getFundingValueCellClasses(value)
        : [FUNDING_GRID_CELL_CLASSES.numeric],
    headerClass: 'funding-grid__header--numeric',
    ...(period.kind === 'snapshot'
      ? {
          cellEditor: FundingAmountCellEditorComponent,
        }
      : {}),
  };
}

export function isFundingGridCellEditable(
  row: FundingGridRowViewModel,
  period: ReportPeriod,
): boolean {
  return period.kind === 'snapshot' && row.cells[period.id].editable;
}

function isFundingCell(value: FundingColumnValue | undefined): value is FundingGridCellViewModel {
  return typeof value === 'object' && value !== null && 'value' in value;
}

function hasSameColumnLayout(previous: FundingColumnDef[], current: FundingColumnDef[]): boolean {
  return (
    previous.length === current.length &&
    previous.every(
      (column, index) =>
        column.colId === current[index]?.colId && column.headerName === current[index]?.headerName,
    )
  );
}
