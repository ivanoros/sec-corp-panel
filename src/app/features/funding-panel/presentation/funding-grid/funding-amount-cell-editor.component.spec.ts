import { TestBed } from '@angular/core/testing';
import type { ICellEditorParams } from 'ag-grid-community';

import { validateFundingCellInput } from '../../application/funding-cell-editor';
import { FundingPanelStore } from '../../application/funding-panel.store';
import { createSecCorpReportFixture } from '../../panels/sec-corp/mocks/sec-corp-report.fixture';
import {
  type FundingGridCellViewModel,
  type FundingGridRowViewModel,
  toFundingGridViewModel,
} from '../funding-grid.viewmodel';
import { FundingAmountCellEditorComponent } from './funding-amount-cell-editor.component';

type EditorParams = ICellEditorParams<FundingGridRowViewModel, FundingGridCellViewModel>;

describe('FundingAmountCellEditorComponent', () => {
  const store = {
    beginEdit: vi.fn((_rowId: string, _periodId: string, rawValue: string) =>
      validateFundingCellInput(rawValue),
    ),
    cancelEdit: vi.fn(),
    previewEdit: vi.fn((rawValue: string) => validateFundingCellInput(rawValue)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FundingPanelStore,
          useValue: store,
        },
      ],
    });
  });

  it('starts with the canonical value and previews each input event', () => {
    const fixture = TestBed.createComponent(FundingAmountCellEditorComponent);
    fixture.componentInstance.agInit(createEditorParams());
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '.funding-amount-editor__input',
    ) as HTMLInputElement;
    input.value = '-300,000,000';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(store.beginEdit).toHaveBeenCalledWith('occ', 'snapshot0830', '-308824714.48');
    expect(store.previewEdit).toHaveBeenCalledWith('-300,000,000');
    expect(fixture.componentInstance.getValue().value).toBe('-300000000.00');
    expect(fixture.componentInstance.getValidationErrors()).toBeNull();
  });

  it('shows inline validation and reports errors to AG Grid', () => {
    const fixture = TestBed.createComponent(FundingAmountCellEditorComponent);
    fixture.componentInstance.agInit(createEditorParams());
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '.funding-amount-editor__input',
    ) as HTMLInputElement;
    input.value = '12.345';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-label')).toBe('OCC 8:30 funding amount');
    const error = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(error.textContent).toContain('no more than two decimal places');
    expect(fixture.componentInstance.getValidationErrors()).toEqual([
      'Use a number with no more than two decimal places.',
    ]);
  });

  it('cancels the preview and stops grid editing on Escape', () => {
    const stopEditing = vi.fn();
    const fixture = TestBed.createComponent(FundingAmountCellEditorComponent);
    fixture.componentInstance.agInit(createEditorParams(stopEditing));
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '.funding-amount-editor__input',
    ) as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(store.cancelEdit).toHaveBeenCalledOnce();
    expect(stopEditing).toHaveBeenCalledWith(true);
  });
});

function createEditorParams(stopEditing = vi.fn()): EditorParams {
  const viewModel = toFundingGridViewModel(createSecCorpReportFixture(), {}, null);
  const row = viewModel.rows.find(({ id }) => id === 'occ');

  if (row === undefined) {
    throw new Error('Missing OCC row.');
  }

  return {
    api: {
      stopEditing,
    },
    column: {
      getColId: () => 'snapshot0830',
    },
    data: row,
    eGridCell: document.createElement('div'),
    eventKey: null,
    onKeyDown: vi.fn(),
    value: row.cells.snapshot0830,
  } as unknown as EditorParams;
}
