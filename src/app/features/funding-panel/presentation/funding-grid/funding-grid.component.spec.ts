import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';
import type { GridReadyEvent } from 'ag-grid-community';

import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import { type FundingGridRowViewModel, toFundingGridViewModel } from '../funding-grid.viewmodel';
import {
  FundingGridComponent,
  createFundingColumnDefs,
  isFundingGridCellEditable,
} from './funding-grid.component';

describe('FundingGridComponent', () => {
  beforeAll(() => {
    configureAgGrid({
      agGridEnterpriseLicenseKey: null,
    });
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the complete report through AG Grid', async () => {
    const viewModel = toFundingGridViewModel(createSecCorpReportFixture(), {}, null);
    const fixture = TestBed.createComponent(FundingGridComponent);

    fixture.componentRef.setInput('viewModel', viewModel);
    fixture.detectChanges();
    await fixture.whenStable();

    const gridDebugElement = fixture.debugElement.query(By.directive(AgGridAngular));
    const grid = gridDebugElement.componentInstance as AgGridAngular<FundingGridRowViewModel>;

    expect(gridDebugElement.nativeElement.getAttribute('aria-label')).toBe(
      'Sec Corp funding report for 2026-07-25',
    );
    const descriptionId = gridDebugElement.nativeElement.getAttribute('aria-describedby') as string;
    const description = fixture.nativeElement.querySelector(`#${descriptionId}`) as HTMLElement;

    expect(description.textContent).toContain('Currency USD.');
    expect(description.textContent).toContain('Bucket and LIVE are read-only');
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

  it('synchronizes accessible metadata through the AG Grid render API', () => {
    const setGridAriaProperty = vi.fn();
    const fixture = TestBed.createComponent(FundingGridComponent);

    fixture.componentRef.setInput(
      'viewModel',
      toFundingGridViewModel(createSecCorpReportFixture(), {}, null),
    );
    fixture.detectChanges();
    fixture.componentInstance.onGridReady({
      api: {
        setGridAriaProperty,
      },
    } as unknown as GridReadyEvent<FundingGridRowViewModel>);
    TestBed.flushEffects();

    expect(setGridAriaProperty).toHaveBeenCalledWith(
      'label',
      'Sec Corp funding report for 2026-07-25',
    );
    expect(setGridAriaProperty).toHaveBeenCalledWith(
      'describedby',
      fixture.componentInstance.descriptionId,
    );
  });

  it('enables input rows in snapshots and Opps funding only', () => {
    const report = createSecCorpReportFixture();
    const viewModel = toFundingGridViewModel(report, {}, null);
    const occ = requireRow(viewModel.rows, 'occ');
    const totalMargin = requireRow(viewModel.rows, 'totalMargin');
    const snapshotPeriod = requirePeriod(report.periods, 'snapshot0830');
    const livePeriod = requirePeriod(report.periods, 'live');
    const opportunityPeriod = requirePeriod(report.periods, 'opportunityFunding');
    const columns = createFundingColumnDefs(report.periods);

    expect(columns).toHaveLength(6);
    expect(isFundingGridCellEditable(occ, snapshotPeriod)).toBe(true);
    expect(isFundingGridCellEditable(occ, livePeriod)).toBe(false);
    expect(isFundingGridCellEditable(occ, opportunityPeriod)).toBe(true);
    expect(isFundingGridCellEditable(totalMargin, snapshotPeriod)).toBe(false);
    expect(isFundingGridCellEditable(totalMargin, opportunityPeriod)).toBe(false);
    expect(columns.find(({ colId }) => colId === 'snapshot0830')?.cellEditor).toBeDefined();
    expect(columns.find(({ colId }) => colId === 'live')?.cellEditor).toBeUndefined();
    expect(columns.find(({ colId }) => colId === 'opportunityFunding')?.cellEditor).toBeDefined();
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
