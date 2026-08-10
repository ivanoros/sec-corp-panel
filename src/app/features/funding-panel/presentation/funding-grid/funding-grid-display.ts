import type {
  FundingGridCellViewModel,
  FundingGridRowViewModel,
  FundingGridValue,
} from '../funding-grid.viewmodel';

export const FUNDING_GRID_ROW_CLASSES = {
  closingBalance: 'funding-grid__row--closing-balance',
  detail: 'funding-grid__row--detail',
  openingBalance: 'funding-grid__row--opening-balance',
  section: 'funding-grid__row--section',
  subtotal: 'funding-grid__row--subtotal',
} as const;

export const FUNDING_GRID_CELL_CLASSES = {
  dirty: 'funding-grid__cell--dirty',
  editable: 'funding-grid__cell--editable',
  invalid: 'funding-grid__cell--invalid',
  negative: 'funding-grid__cell--negative',
  numeric: 'funding-grid__cell--numeric',
  preview: 'funding-grid__cell--preview',
} as const;

export function formatFundingAmount(value: FundingGridValue): string {
  if (value === null) {
    return '';
  }

  const isNegative = value.startsWith('-');
  const unsignedValue = isNegative ? value.slice(1) : value;
  const [integerPart, fractionalPart] = unsignedValue.split('.');

  if (integerPart === undefined || fractionalPart === undefined) {
    throw new FundingGridDisplayError(`Unexpected decimal value: ${value}`);
  }

  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedValue = `${groupedInteger}.${fractionalPart}`;

  return isNegative ? `(${formattedValue})` : formattedValue;
}

export function formatFundingRowLabel(row: FundingGridRowViewModel): string {
  if (row.depth === 0) {
    return row.label;
  }

  return `${'  '.repeat(row.depth - 1)}- ${row.label}`;
}

export function formatFundingCellTooltip(
  rowLabel: string,
  periodLabel: string,
  cell: FundingGridCellViewModel,
): string | null {
  if (!cell.dirty) {
    return null;
  }

  return [
    'Modified — not saved',
    `${rowLabel} · ${periodLabel}`,
    `Original: ${formatTooltipAmount(cell.originalValue)}`,
    `Current: ${formatTooltipAmount(cell.value)}`,
  ].join('\n');
}

export function getFundingRowClass(row: FundingGridRowViewModel): string {
  switch (row.kind) {
    case 'opening-balance':
      return FUNDING_GRID_ROW_CLASSES.openingBalance;
    case 'section':
      return FUNDING_GRID_ROW_CLASSES.section;
    case 'subtotal':
      return FUNDING_GRID_ROW_CLASSES.subtotal;
    case 'closing-balance':
      return FUNDING_GRID_ROW_CLASSES.closingBalance;
    case 'detail':
      return FUNDING_GRID_ROW_CLASSES.detail;
  }
}

export function getFundingValueCellClasses(cell: FundingGridCellViewModel): string[] {
  const classes: string[] = [FUNDING_GRID_CELL_CLASSES.numeric];

  if (cell.value?.startsWith('-')) {
    classes.push(FUNDING_GRID_CELL_CLASSES.negative);
  }

  if (cell.editable) {
    classes.push(FUNDING_GRID_CELL_CLASSES.editable);
  }

  if (cell.dirty) {
    classes.push(FUNDING_GRID_CELL_CLASSES.dirty);
  }

  if (cell.preview) {
    classes.push(FUNDING_GRID_CELL_CLASSES.preview);
  }

  if (cell.validationMessage !== null) {
    classes.push(FUNDING_GRID_CELL_CLASSES.invalid);
  }

  return classes;
}

export class FundingGridDisplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FundingGridDisplayError';
  }
}

function formatTooltipAmount(value: FundingGridValue): string {
  return value === null ? 'Unavailable' : formatFundingAmount(value);
}
