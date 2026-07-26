import type { FundingGridRowViewModel, FundingGridValue } from '../funding-grid.viewmodel';

export const FUNDING_GRID_ROW_CLASSES = {
  closingBalance: 'funding-grid__row--closing-balance',
  detail: 'funding-grid__row--detail',
  openingBalance: 'funding-grid__row--opening-balance',
  section: 'funding-grid__row--section',
  subtotal: 'funding-grid__row--subtotal',
} as const;

export const FUNDING_GRID_CELL_CLASSES = {
  negative: 'funding-grid__cell--negative',
  numeric: 'funding-grid__cell--numeric',
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

export function getFundingValueCellClasses(value: FundingGridValue): string[] {
  return value?.startsWith('-')
    ? [FUNDING_GRID_CELL_CLASSES.numeric, FUNDING_GRID_CELL_CLASSES.negative]
    : [FUNDING_GRID_CELL_CLASSES.numeric];
}

export class FundingGridDisplayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FundingGridDisplayError';
  }
}
