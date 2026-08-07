import { createFundingPanelDefinition } from '../../domain/funding-panel-definition';
import { PBIL_ROW_CATALOG } from './pbil-row-catalog';

export const PBIL_PANEL_DEFINITION = createFundingPanelDefinition({
  calculatedRows: {
    endOfDay: [
      'sodBalance',
      'arrangedFunding',
      'slabActivity2884',
      'slabActivity2147',
      'arbMtmWires',
      'failsMargin11602149',
      'margin58010500',
      'pbilArbMargin',
      'marginFacilityProjected',
      'creditPrimeRepoActivity',
      'clientActivityCashWires',
      '15c3Withdrawal',
      'fxSwaps',
      'als',
      'financingDis',
      'usTreasuryRepoPnv',
      'equityJpm',
      'equityDis',
      'equityE87',
    ],
  },
  catalog: PBIL_ROW_CATALOG,
  closingBalanceRowId: 'endOfDay',
  definitionVersion: 1,
  openingBalanceRowId: 'sodBalance',
  panelCode: 'pbil',
  sectionRowIds: [
    'settlementActivityDtc',
    'margin',
    'primeReserveRequirement',
    'reserveRequirement',
    'other',
    'financingActivity',
    'equityRepo',
  ],
  title: 'PBIL',
});
