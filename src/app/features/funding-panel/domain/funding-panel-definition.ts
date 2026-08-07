import {
  type FundingRow,
  type PeriodId,
  type ReportPeriod,
  type SumCalculation,
} from './funding-report';

export type FundingRowDefinition = Omit<FundingRow, 'values'>;

export interface FundingPanelDefinition {
  readonly definitionVersion: number;
  readonly panelCode: string;
  readonly periods: readonly ReportPeriod[];
  readonly rows: readonly FundingRowDefinition[];
  readonly title: string;
}

export interface FundingRowCatalogEntry {
  readonly id: string;
  readonly label: string;
}

export interface FundingPanelDefinitionSource {
  readonly calculatedRows: Readonly<Record<string, readonly string[]>>;
  readonly catalog: readonly FundingRowCatalogEntry[];
  readonly closingBalanceRowId: string;
  readonly definitionVersion: number;
  readonly openingBalanceRowId: string;
  readonly panelCode: string;
  readonly sectionRowIds: readonly string[];
  readonly title: string;
}

export const FUNDING_PERIOD_DEFINITIONS: readonly ReportPeriod[] = Object.freeze([
  { id: 'snapshot0830', label: '8:30', kind: 'snapshot', editable: true },
  { id: 'snapshot1130', label: '11:30', kind: 'snapshot', editable: true },
  { id: 'snapshot1330', label: '1:30', kind: 'snapshot', editable: true },
  { id: 'live', label: 'LIVE', kind: 'live', editable: false },
  { id: 'opportunityFunding', label: 'Opps funding', kind: 'opportunity', editable: true },
]);

export function createFundingPanelDefinition(
  source: FundingPanelDefinitionSource,
): FundingPanelDefinition {
  const sectionRowIds = new Set(source.sectionRowIds);

  return {
    definitionVersion: source.definitionVersion,
    panelCode: source.panelCode,
    periods: FUNDING_PERIOD_DEFINITIONS,
    rows: source.catalog.map(({ id, label }, index) => {
      const calculationRowIds = source.calculatedRows[id];
      const calculation: SumCalculation | null =
        calculationRowIds === undefined
          ? null
          : {
              kind: 'sum',
              rowIds: calculationRowIds,
            };
      const isSection = sectionRowIds.has(id);
      const isOpeningBalance = id === source.openingBalanceRowId;
      const isClosingBalance = id === source.closingBalanceRowId;

      return {
        calculation,
        code: toBusinessCode(id),
        depth: isSection || calculation !== null || isOpeningBalance ? 0 : 1,
        displayOrder: (index + 1) * 10,
        id,
        kind: isOpeningBalance
          ? 'opening-balance'
          : isClosingBalance
            ? 'closing-balance'
            : isSection
              ? 'section'
              : calculation !== null
                ? 'subtotal'
                : 'detail',
        label,
        valueMode: isSection ? 'section' : calculation === null ? 'input' : 'calculated',
      };
    }),
    title: source.title,
  };
}

export function createEmptyPeriodValues(): Readonly<Record<PeriodId, null>> {
  return {
    snapshot0830: null,
    snapshot1130: null,
    snapshot1330: null,
    live: null,
    opportunityFunding: null,
  };
}

function toBusinessCode(rowId: string): string {
  return rowId.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}
