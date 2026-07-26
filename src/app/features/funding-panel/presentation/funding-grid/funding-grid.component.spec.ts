import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AgGridAngular } from 'ag-grid-angular';

import { configureAgGrid } from '../../../../core/grid/ag-grid.setup';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import { type FundingGridRowViewModel, toFundingGridViewModel } from '../funding-grid.viewmodel';
import { FundingGridComponent, createFundingColumnDefs } from './funding-grid.component';

describe('FundingGridComponent', () => {
  beforeAll(() => {
    configureAgGrid({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
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
  });

  it('keeps every column read-only in Phase 4', () => {
    const columns = createFundingColumnDefs(createSecCorpReportFixture().periods);

    expect(columns).toHaveLength(6);
    expect(columns.every(({ editable }) => editable !== true)).toBe(true);
  });
});
