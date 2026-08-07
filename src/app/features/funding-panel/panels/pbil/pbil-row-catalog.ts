export interface PbilRowCatalogEntry {
  readonly assumption?: string;
  readonly id: string;
  readonly label: string;
  readonly sourceLabels?: readonly string[];
}

/**
 * Ordered PBIL target rows from the approved color mapping.
 * Assumptions are deliberately attached to panel metadata so provisional
 * source allocations can be revised without changing shared infrastructure.
 */
export const PBIL_ROW_CATALOG = [
  { id: 'sodBalance', label: 'SOD Balance' },
  { id: 'settlementActivityDtc', label: 'Settlement activity (DTC)' },
  {
    id: 'arrangedFunding',
    label: 'Arranged funding',
    sourceLabels: ['Arranged Funding'],
  },
  {
    id: 'slabActivity2884',
    label: 'Slab activity (2884)',
    sourceLabels: ['SLAB Activity'],
    assumption: 'The complete SLAB Activity value is provisionally allocated to account 2884.',
  },
  {
    id: 'slabActivity2147',
    label: 'Slab activity (2147)',
    sourceLabels: ['SLAB Activity'],
    assumption: 'Account 2147 is provisionally zero until an account-level split is supplied.',
  },
  { id: 'margin', label: 'Margin' },
  {
    id: 'arbMtmWires',
    label: 'Arb MtM Wires',
    sourceLabels: ['PBIL MTM SPO (IAMS/FAMS)'],
    assumption: 'The crossed-out source is provisionally treated as zero.',
  },
  {
    id: 'failsMargin11602149',
    label: 'Fails Margin 116-02149',
    sourceLabels: ['Fails Margin 116-02149'],
  },
  {
    id: 'margin58010500',
    label: 'Margin 580-10500',
    sourceLabels: ['Margin 580-10500'],
  },
  {
    id: 'pbilArbMargin',
    label: 'PBIL/ARB Margin',
    sourceLabels: ['PBIL/ARB Margin'],
  },
  {
    id: 'marginFacilityProjected',
    label: 'Margin Facility (Projected)',
    sourceLabels: ['Margin Facility (Projected)'],
  },
  { id: 'primeReserveRequirement', label: 'Prime reserve requirement' },
  {
    id: 'creditPrimeRepoActivity',
    label: 'Credit prime repo activity',
    sourceLabels: ['Credit Prime Activity'],
  },
  {
    id: 'clientActivityCashWires',
    label: 'Client activity / Cash wires',
    sourceLabels: ['Client Activity/Cash Wires'],
  },
  { id: 'reserveRequirement', label: 'Reserve requirement' },
  {
    id: '15c3Withdrawal',
    label: '15C3 Withdrawal',
    sourceLabels: ['15C3 Withdrawal'],
  },
  { id: 'other', label: 'Other' },
  {
    id: 'fxSwaps',
    label: 'FX Swaps',
    sourceLabels: ['GMAT FX Swap'],
    assumption: 'GMAT FX Swap is provisionally mapped to FX Swaps.',
  },
  { id: 'financingActivity', label: 'Financing activity' },
  { id: 'als', label: 'ALS', sourceLabels: ['ALS'] },
  { id: 'financingDis', label: 'DIS', sourceLabels: ['DIS'] },
  {
    id: 'usTreasuryRepoPnv',
    label: 'US treasury repo (PNV)',
    sourceLabels: ['UST Repo', 'UST Cash Borrow Return'],
    assumption: 'UST Repo and UST Cash Borrow Return are provisionally combined.',
  },
  { id: 'equityRepo', label: 'Equity repo' },
  {
    id: 'equityJpm',
    label: 'JPM',
    sourceLabels: ['External Equity Repo'],
    assumption: 'External Equity Repo is provisionally allocated to JPM.',
  },
  {
    id: 'equityDis',
    label: 'DIS',
    sourceLabels: ['Internal Equity Repo'],
    assumption: 'Internal Equity Repo is provisionally allocated to DIS.',
  },
  {
    id: 'equityE87',
    label: 'E87',
    sourceLabels: ['External Equity Repo', 'Internal Equity Repo'],
    assumption: 'E87 is provisionally zero until an account-level split is supplied.',
  },
  { id: 'endOfDay', label: 'PBIL EOD Balance' },
] as const satisfies readonly PbilRowCatalogEntry[];
