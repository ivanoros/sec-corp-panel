export interface SecCorpRowCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly sourceLabel?: string;
}

/**
 * Ordered target rows from area 2 of the color-panel reference.
 * sourceLabel records only the six placeholders resolved from area 1.
 */
export const SEC_CORP_ROW_CATALOG = [
  { id: 'sod-balance', label: 'SOD Balance' },
  { id: 'margin', label: 'Margin' },
  { id: 'occ', label: 'OCC' },
  { id: 'nscc', label: 'NSCC' },
  { id: 'margin-fails-116-02149', label: 'Fails margin 116-02149' },
  {
    id: 'margin-fails-090-intl-mtm',
    label: 'Margin Fails (090 Account) Intl & MtM',
    sourceLabel: 'Margin Fails (090 Account) Intl & MtM',
  },
  { id: 'sod-excess-margin-580-10500', label: 'Margin 580-10500' },
  {
    id: 'arb-mtm-wires',
    label: 'Arb MtM Wires',
    sourceLabel: 'Arb MtM Wires',
  },
  {
    id: 'slab-mtm-wires',
    label: 'SLAB MtM Wires',
    sourceLabel: 'SLAB MtM Wires',
  },
  {
    id: 'margin-facility-projected',
    label: 'Margin facility (Projected)',
  },
  { id: 'total-margin', label: 'Total margin' },
  { id: 'wires', label: 'Wires' },
  {
    id: 'customer-wires-177-omni-177-pay',
    label: 'Cust Wires 177/Omni/177 Pay',
  },
  { id: 'arb-snc', label: 'ARB SNC', sourceLabel: 'ARB SNC' },
  { id: 'sec-corp-arb-margin', label: 'Sec Corp/ARB Margin' },
  { id: 'omni', label: 'OMNI', sourceLabel: 'OMNI' },
  {
    id: 'intraday-change',
    label: 'Intraday change',
    sourceLabel: 'Intraday change',
  },
  { id: 'total-wires', label: 'Total Wires' },
  { id: 'reserve-requirement', label: 'Reserve requirement' },
  { id: '15c3-deposit', label: '15C3 Deposit' },
  { id: '15c3-withdrawal', label: '15C3 Withdrawal' },
  {
    id: 'total-reserve-requirement',
    label: 'Total reserve requirement',
  },
  { id: 'other', label: 'Other' },
  { id: 'fx-swaps', label: 'FX swaps' },
  { id: 'misc', label: 'Misc' },
  { id: 'total-other', label: 'Total other' },
  { id: 'settlement-activity-dtc', label: 'Settlement activity (DTC)' },
  { id: 'dtc-2154', label: '2154' },
  { id: 'dtc-2885', label: '2885' },
  { id: 'dtc-8238', label: '8238' },
  {
    id: 'interco-arranged-funding-flips',
    label: 'Interco Arranged funding flips',
  },
  {
    id: 'total-settlement-activity',
    label: 'Total settlement activity',
  },
  { id: 'financing-activity', label: 'Financing activity' },
  { id: 'als', label: 'ALS' },
  {
    id: 'client-us-treasury-short-abr',
    label: 'Client US treasury Short / ABR',
  },
  {
    id: 'total-financing-activity',
    label: 'Total financing activity',
  },
  { id: 'end-of-day', label: 'End of day' },
] as const satisfies readonly SecCorpRowCatalogEntry[];
