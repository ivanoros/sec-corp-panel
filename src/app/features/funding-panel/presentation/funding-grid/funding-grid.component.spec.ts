import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';

import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { FundingPanelStore } from '../../application/funding-panel.store';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import { type FundingGridRowViewModel, toFundingGridViewModel } from '../funding-grid.viewmodel';
import {
  FundingGridComponent,
  createFundingColumnDefs,
  isFundingGridCellEditable,
} from './funding-grid.component';

describe('FundingGridComponent', () => {
  const store = {
    commitEdit: vi.fn(() => true),
  };

  beforeAll(() => {
    configureAgGrid({
      agGridEnterpriseLicenseKey: null,
    });
  });

  beforeEach(() => {
    store.commitEdit.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FundingPanelStore,
          useValue: store,
        },
      ],
    });
  });

  it('renders the complete report through AG Grid', async () => {
    const viewModel = toFundingGridViewModel(createSecCorpReportFixture(), {}, null);
    const fixture = TestBed.createComponent(FundingGridComponent);

    fixture.componentRef.setInput('viewModel', viewModel);
    fixture.detectChanges();
    await fixture.whenStable();

    const gridDebugElement = fixture.debugElement.query(By.directive(AgGridAngular));
    const grid = gridDebugElement.componentInstance as AgGridAngular<FundingGridRowViewModel>;

    expect(gridDebugElement.nativeElement.getAttribute('aria-label')).toBe('Funding report');
    expect(grid.rowData).toHaveLength(37);
    expect(grid.columnDefs?.map(({ headerName }) => headerName)).toEqual([
      'Bucket',
      '8:30',
      '11:30',
      '1:30',
      'LIVE',
      'Opps funding',
    ]);
    expect(grid.singleClickEdit).toBe(true);
    expect(grid.stopEditingWhenCellsLoseFocus).toBe(true);
    expect(grid.invalidEditValueMode).toBe('block');
    expect(grid.readOnlyEdit).toBe(true);
  });

  it('enables only input rows in snapshot columns', () => {
    const report = createSecCorpReportFixture();
    const viewModel = toFundingGridViewModel(report, {}, null);
    const occ = requireRow(viewModel.rows, 'occ');
    const totalMargin = requireRow(viewModel.rows, 'total-margin');
    const snapshotPeriod = requirePeriod(report.periods, 'snapshot0830');
    const livePeriod = requirePeriod(report.periods, 'live');
    const opportunityPeriod = requirePeriod(report.periods, 'opportunityFunding');
    const columns = createFundingColumnDefs(report.periods);

    expect(columns).toHaveLength(6);
    expect(isFundingGridCellEditable(occ, snapshotPeriod)).toBe(true);
    expect(isFundingGridCellEditable(occ, livePeriod)).toBe(false);
    expect(isFundingGridCellEditable(occ, opportunityPeriod)).toBe(false);
    expect(isFundingGridCellEditable(totalMargin, snapshotPeriod)).toBe(false);
    expect(columns.find(({ colId }) => colId === 'snapshot0830')?.cellEditor).toBeDefined();
    expect(columns.find(({ colId }) => colId === 'live')?.cellEditor).toBeUndefined();
  });

  it('commits the active store edit when AG Grid finishes editing', () => {
    const fixture = TestBed.createComponent(FundingGridComponent);
    fixture.componentRef.setInput(
      'viewModel',
      toFundingGridViewModel(createSecCorpReportFixture(), {}, null),
    );

    fixture.componentInstance.onCellEditingStopped();

    expect(store.commitEdit).toHaveBeenCalledOnce();
  });
});

function requireRow(
  rows: readonly FundingGridRowViewModel[],
  rowId: string,
): FundingGridRowViewModel {
  const row = rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing row ${rowId}.`);
  }

  return row;
}

function requirePeriod(
  periods: ReturnType<typeof createSecCorpReportFixture>['periods'],
  periodId: string,
) {
  const period = periods.find(({ id }) => id === periodId);

  if (period === undefined) {
    throw new Error(`Missing period ${periodId}.`);
  }

  return period;
}
