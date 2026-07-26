import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import type { ICellEditorAngularComp } from 'ag-grid-angular';
import type { ICellEditorParams } from 'ag-grid-community';

import { FundingPanelStateError, FundingPanelStore } from '../../application/funding-panel.store';
import {
  validateFundingCellInput,
  type FundingCellValidation,
} from '../../application/funding-cell-editor';
import { isSnapshotPeriodId } from '../../domain/funding-report';
import type { FundingGridCellViewModel, FundingGridRowViewModel } from '../funding-grid.viewmodel';

type FundingAmountEditorParams = ICellEditorParams<
  FundingGridRowViewModel,
  FundingGridCellViewModel
>;

@Component({
  selector: 'app-funding-amount-cell-editor',
  standalone: true,
  templateUrl: './funding-amount-cell-editor.component.html',
  styleUrl: './funding-amount-cell-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FundingAmountCellEditorComponent implements ICellEditorAngularComp {
  private readonly store = inject(FundingPanelStore);
  private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('amountInput');

  private params: FundingAmountEditorParams | null = null;
  private initialCell: FundingGridCellViewModel | null = null;

  readonly rawValue = signal('');
  readonly validation = signal<FundingCellValidation>(validateFundingCellInput('0.00'));
  readonly editorWidth = signal(128);

  agInit(params: FundingAmountEditorParams): void {
    const periodId = params.column.getColId();

    if (!isSnapshotPeriodId(periodId) || params.value === null || params.value === undefined) {
      throw new FundingPanelStateError(`Cannot edit ${params.data.id}.${periodId}.`);
    }

    const rawValue = initialRawValue(params, params.value);

    this.params = params;
    this.initialCell = params.value;
    this.rawValue.set(rawValue);
    this.editorWidth.set(Math.max(params.eGridCell.getBoundingClientRect().width, 128));
    this.validation.set(this.store.beginEdit(params.data.id, periodId, rawValue));
  }

  afterGuiAttached(): void {
    queueMicrotask(() => {
      const input = this.inputElement()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  getValue(): FundingGridCellViewModel {
    const initialCell = this.initialCell;
    const validation = this.validation();

    if (initialCell === null) {
      throw new FundingPanelStateError('Funding editor has not been initialized.');
    }

    return validation.isValid
      ? {
          ...initialCell,
          validationMessage: null,
          value: validation.value,
        }
      : initialCell;
  }

  getValidationErrors(): string[] | null {
    const validation = this.validation();
    return validation.isValid ? null : [validation.message];
  }

  getValidationElement(): HTMLElement {
    const validationElement = this.inputElement()?.nativeElement ?? this.params?.eGridCell;

    if (validationElement === undefined) {
      throw new FundingPanelStateError('Funding editor has no validation element.');
    }

    return validationElement;
  }

  isPopup(): boolean {
    return true;
  }

  getPopupPosition(): 'over' {
    return 'over';
  }

  refresh(params: FundingAmountEditorParams): void {
    this.params = params;
  }

  onInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    this.rawValue.set(event.target.value);
    this.validation.set(this.store.previewEdit(event.target.value));
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.store.cancelEdit();
      this.params?.api.stopEditing(true);
    }
  }
}

function initialRawValue(
  params: FundingAmountEditorParams,
  cell: FundingGridCellViewModel,
): string {
  if (params.eventKey === 'Backspace' || params.eventKey === 'Delete') {
    return '';
  }

  if (params.eventKey?.length === 1) {
    return params.eventKey;
  }

  return cell.value ?? '0.00';
}
