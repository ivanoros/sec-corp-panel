import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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

import type { FundingSaveConfirmation } from '../../application/funding-panel.store';
import type { ReportPeriod } from '../../domain/funding-report';
import { PERIOD_IDS, type PeriodId } from '../../domain/funding-report';
import {
  type FundingGridCellViewModel,
  type FundingGridRowViewModel,
  type FundingGridViewModel,
} from '../funding-grid.viewmodel';
import {
  FUNDING_GRID_CELL_CLASSES,
  formatFundingCellTooltip,
  formatFundingAmount,
  formatFundingRowLabel,
  getFundingRowClass,
  getFundingValueCellClasses,
} from './funding-grid-display';
import { FundingAmountCellEditorComponent } from './funding-amount-cell-editor.component';
import { FUNDING_GRID_THEME } from './funding-grid.theme';

type FundingColumnValue = FundingGridCellViewModel | string | null;
type FundingColumnDef = ColDef<FundingGridRowViewModel, FundingColumnValue>;

export interface FundingGridCellAddress {
  readonly periodId: PeriodId;
  readonly rowId: string;
}

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly gridApi = signal<GridApi<FundingGridRowViewModel> | null>(null);
  private pendingCalculatedCells: readonly FundingGridCellAddress[] = [];
  private pendingSavedCells: readonly FundingGridCellAddress[] = [];
  private settledRows: readonly FundingGridRowViewModel[] | null = null;
  private previousCalculationRevision = 0;
  private previousSaveRevision = 0;
  private saveFlashTimer: ReturnType<typeof setTimeout> | null = null;
  private flashScheduled = false;
  private destroyed = false;

  readonly viewModel = input.required<FundingGridViewModel>();
  readonly calculationRevision = input(0);
  readonly saveConfirmation = input<FundingSaveConfirmation>({ cells: [], revision: 0 });
  readonly saveFlashActive = signal(false);
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
      '8:30, 11:30, 1:30, and Opps funding input cells may be edited; Bucket and LIVE are read-only.',
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

    effect(() => {
      this.captureVisualChanges(
        this.rowData(),
        this.calculationRevision(),
        this.saveConfirmation(),
      );
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;

      if (this.saveFlashTimer !== null) {
        clearTimeout(this.saveFlashTimer);
      }
    });
  }

  onGridReady(event: GridReadyEvent<FundingGridRowViewModel>): void {
    this.gridApi.set(event.api);
  }

  onModelUpdated(): void {
    if (this.pendingCalculatedCells.length > 0) {
      this.flashCells(this.pendingCalculatedCells, 'calculated');
      this.pendingCalculatedCells = [];
    }

    if (this.pendingSavedCells.length > 0) {
      this.flashCells(this.pendingSavedCells, 'saved');
      this.pendingSavedCells = [];
    }
  }

  private captureVisualChanges(
    rows: readonly FundingGridRowViewModel[],
    calculationRevision: number,
    saveConfirmation: FundingSaveConfirmation,
  ): void {
    if (this.settledRows === null) {
      this.settledRows = rows;
      this.previousCalculationRevision = calculationRevision;
    } else if (calculationRevision !== this.previousCalculationRevision) {
      this.pendingCalculatedCells = findChangedCalculatedCells(this.settledRows, rows);
      this.settledRows = rows;
      this.previousCalculationRevision = calculationRevision;
      this.schedulePendingFlashes();
    } else if (!hasActivePreview(rows)) {
      this.settledRows = rows;
    }

    if (saveConfirmation.revision !== this.previousSaveRevision) {
      this.pendingSavedCells = saveConfirmation.cells;
      this.previousSaveRevision = saveConfirmation.revision;
      this.schedulePendingFlashes();
    }
  }

  private schedulePendingFlashes(): void {
    if (this.flashScheduled) {
      return;
    }

    this.flashScheduled = true;
    queueMicrotask(() => {
      this.flashScheduled = false;

      if (!this.destroyed) {
        this.onModelUpdated();
      }
    });
  }

  private flashCells(
    addresses: readonly FundingGridCellAddress[],
    mode: 'calculated' | 'saved',
  ): void {
    const api = this.gridApi();

    if (api === null) {
      return;
    }

    if (mode === 'saved') {
      this.saveFlashActive.set(true);

      if (this.saveFlashTimer !== null) {
        clearTimeout(this.saveFlashTimer);
      }

      this.saveFlashTimer = setTimeout(() => {
        this.saveFlashActive.set(false);
        this.saveFlashTimer = null;
      }, 900);
    } else {
      this.saveFlashActive.set(false);
    }

    for (const { periodId, rowId } of addresses) {
      const rowNode = api.getRowNode(rowId);

      if (rowNode !== undefined) {
        api.flashCells({
          columns: [periodId],
          fadeDuration: 350,
          flashDuration: 450,
          rowNodes: [rowNode],
        });
      }
    }
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
    tooltipValueGetter: ({ data, value }): string | null =>
      data === undefined || !isFundingCell(value)
        ? null
        : formatFundingCellTooltip(data.label, period.label, value),
    headerClass: 'funding-grid__header--numeric',
    ...(period.editable
      ? {
          cellEditor: FundingAmountCellEditorComponent,
        }
      : {}),
  };
}

export function findChangedCalculatedCells(
  previousRows: readonly FundingGridRowViewModel[],
  currentRows: readonly FundingGridRowViewModel[],
): readonly FundingGridCellAddress[] {
  const previousById = new Map(previousRows.map((row) => [row.id, row]));

  return currentRows.flatMap((row) => {
    if (row.valueMode !== 'calculated') {
      return [];
    }

    const previousRow = previousById.get(row.id);

    return PERIOD_IDS.flatMap((periodId) =>
      previousRow?.cells[periodId].value === row.cells[periodId].value
        ? []
        : [{ periodId, rowId: row.id }],
    );
  });
}

export function findDirtyCellAddresses(
  rows: readonly FundingGridRowViewModel[],
): readonly FundingGridCellAddress[] {
  return rows.flatMap((row) =>
    PERIOD_IDS.flatMap((periodId) =>
      row.cells[periodId].dirty ? [{ periodId, rowId: row.id }] : [],
    ),
  );
}

export function isFundingGridCellEditable(
  row: FundingGridRowViewModel,
  period: ReportPeriod,
): boolean {
  return period.editable && row.cells[period.id].editable;
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

function hasActivePreview(rows: readonly FundingGridRowViewModel[]): boolean {
  return rows.some((row) => PERIOD_IDS.some((periodId) => row.cells[periodId].preview));
}
