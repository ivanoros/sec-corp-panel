import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
} from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type {
  CellClassParams,
  ColDef,
  GetRowIdParams,
  RowClassParams,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';

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
import { FUNDING_GRID_THEME } from './funding-grid.theme';

type FundingColumnValue = FundingGridCellViewModel | string | null;
type FundingColumnDef = ColDef<FundingGridRowViewModel, FundingColumnValue>;

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
  readonly viewModel = input.required<FundingGridViewModel>();

  readonly rowData = computed(() => [...this.viewModel().rows]);
  readonly columnDefs = computed(() => createFundingColumnDefs(this.viewModel().periods), {
    equal: hasSameColumnLayout,
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
    cellClass: ({
      value,
    }: CellClassParams<FundingGridRowViewModel, FundingColumnValue>): string[] =>
      isFundingCell(value)
        ? getFundingValueCellClasses(value.value)
        : [FUNDING_GRID_CELL_CLASSES.numeric],
    headerClass: 'funding-grid__header--numeric',
  };
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
