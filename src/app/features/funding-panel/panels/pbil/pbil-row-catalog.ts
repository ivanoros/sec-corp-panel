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
  { id: 'sod-balance', label: 'SOD Balance' },
  { id: 'settlement-activity-dtc', label: 'Settlement activity (DTC)' },
  {
    id: 'arranged-funding',
    label: 'Arranged funding',
    sourceLabels: ['Arranged Funding'],
  },
  {
    id: 'slab-activity-2884',
    label: 'Slab activity (2884)',
    sourceLabels: ['SLAB Activity'],
    assumption: 'The complete SLAB Activity value is provisionally allocated to account 2884.',
  },
  {
    id: 'slab-activity-2147',
    label: 'Slab activity (2147)',
    sourceLabels: ['SLAB Activity'],
    assumption: 'Account 2147 is provisionally zero until an account-level split is supplied.',
  },
  { id: 'margin', label: 'Margin' },
  {
    id: 'arb-mtm-wires',
    label: 'Arb MtM Wires',
    sourceLabels: ['PBIL MTM SPO (IAMS/FAMS)'],
    assumption: 'The crossed-out source is provisionally treated as zero.',
  },
  {
    id: 'fails-margin-116-02149',
    label: 'Fails Margin 116-02149',
    sourceLabels: ['Fails Margin 116-02149'],
  },
  {
    id: 'margin-580-10500',
    label: 'Margin 580-10500',
    sourceLabels: ['Margin 580-10500'],
  },
  {
    id: 'pbil-arb-margin',
    label: 'PBIL/ARB Margin',
    sourceLabels: ['PBIL/ARB Margin'],
  },
  {
    id: 'margin-facility-projected',
    label: 'Margin Facility (Projected)',
    sourceLabels: ['Margin Facility (Projected)'],
  },
  { id: 'prime-reserve-requirement', label: 'Prime reserve requirement' },
  {
    id: 'credit-prime-repo-activity',
    label: 'Credit prime repo activity',
    sourceLabels: ['Credit Prime Activity'],
  },
  {
    id: 'client-activity-cash-wires',
    label: 'Client activity / Cash wires',
    sourceLabels: ['Client Activity/Cash Wires'],
  },
  { id: 'reserve-requirement', label: 'Reserve requirement' },
  {
    id: '15c3-withdrawal',
    label: '15C3 Withdrawal',
    sourceLabels: ['15C3 Withdrawal'],
  },
  { id: 'other', label: 'Other' },
  {
    id: 'fx-swaps',
    label: 'FX Swaps',
    sourceLabels: ['GMAT FX Swap'],
    assumption: 'GMAT FX Swap is provisionally mapped to FX Swaps.',
  },
  { id: 'financing-activity', label: 'Financing activity' },
  { id: 'als', label: 'ALS', sourceLabels: ['ALS'] },
  { id: 'financing-dis', label: 'DIS', sourceLabels: ['DIS'] },
  {
    id: 'us-treasury-repo-pnv',
    label: 'US treasury repo (PNV)',
    sourceLabels: ['UST Repo', 'UST Cash Borrow Return'],
    assumption: 'UST Repo and UST Cash Borrow Return are provisionally combined.',
  },
  { id: 'equity-repo', label: 'Equity repo' },
  {
    id: 'equity-jpm',
    label: 'JPM',
    sourceLabels: ['External Equity Repo'],
    assumption: 'External Equity Repo is provisionally allocated to JPM.',
  },
  {
    id: 'equity-dis',
    label: 'DIS',
    sourceLabels: ['Internal Equity Repo'],
    assumption: 'Internal Equity Repo is provisionally allocated to DIS.',
  },
  {
    id: 'equity-e87',
    label: 'E87',
    sourceLabels: ['External Equity Repo', 'Internal Equity Repo'],
    assumption: 'E87 is provisionally zero until an account-level split is supplied.',
  },
  { id: 'end-of-day', label: 'PBIL EOD Balance' },
] as const satisfies readonly PbilRowCatalogEntry[];
