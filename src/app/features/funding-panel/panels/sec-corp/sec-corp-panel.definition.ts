import { createFundingPanelDefinition } from '../../domain/funding-panel-definition';
import { SEC_CORP_ROW_CATALOG } from './sec-corp-row-catalog';

export const SEC_CORP_PANEL_DEFINITION = createFundingPanelDefinition({
  calculatedRows: {
    totalMargin: [
      'occ',
      'nscc',
      'marginFails11602149',
      'marginFails090IntlMtm',
      'sodExcessMargin58010500',
      'arbMtmWires',
      'slabMtmWires',
      'marginFacilityProjected',
    ],
    totalWires: [
      'customerWires177Omni177Pay',
      'arbSnc',
      'secCorpArbMargin',
      'omni',
      'intradayChange',
    ],
    totalReserveRequirement: ['15c3Deposit', '15c3Withdrawal'],
    totalOther: ['fxSwaps', 'misc'],
    totalSettlementActivity: ['dtc2154', 'dtc2885', 'dtc8238', 'intercoArrangedFundingFlips'],
    totalFinancingActivity: ['als', 'clientUsTreasuryShortAbr'],
    endOfDay: [
      'sodBalance',
      'totalMargin',
      'totalWires',
      'totalReserveRequirement',
      'totalOther',
      'totalSettlementActivity',
      'totalFinancingActivity',
    ],
  },
  catalog: SEC_CORP_ROW_CATALOG,
  closingBalanceRowId: 'endOfDay',
  definitionVersion: 1,
  openingBalanceRowId: 'sodBalance',
  panelCode: 'sec-corp',
  sectionRowIds: [
    'margin',
    'wires',
    'reserveRequirement',
    'other',
    'settlementActivityDtc',
    'financingActivity',
  ],
  title: 'Sec Corp',
});
