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
  { id: 'sodBalance', label: 'SOD Balance' },
  { id: 'margin', label: 'Margin' },
  { id: 'occ', label: 'OCC' },
  { id: 'nscc', label: 'NSCC' },
  { id: 'marginFails11602149', label: 'Fails margin 116-02149' },
  {
    id: 'marginFails090IntlMtm',
    label: 'Margin Fails (090 Account) Intl & MtM',
    sourceLabel: 'Margin Fails (090 Account) Intl & MtM',
  },
  { id: 'sodExcessMargin58010500', label: 'Margin 580-10500' },
  {
    id: 'arbMtmWires',
    label: 'Arb MtM Wires',
    sourceLabel: 'Arb MtM Wires',
  },
  {
    id: 'slabMtmWires',
    label: 'SLAB MtM Wires',
    sourceLabel: 'SLAB MtM Wires',
  },
  {
    id: 'marginFacilityProjected',
    label: 'Margin facility (Projected)',
  },
  { id: 'totalMargin', label: 'Total margin' },
  { id: 'wires', label: 'Wires' },
  {
    id: 'customerWires177Omni177Pay',
    label: 'Cust Wires 177/Omni/177 Pay',
  },
  { id: 'arbSnc', label: 'ARB SNC', sourceLabel: 'ARB SNC' },
  { id: 'secCorpArbMargin', label: 'Sec Corp/ARB Margin' },
  { id: 'omni', label: 'OMNI', sourceLabel: 'OMNI' },
  {
    id: 'intradayChange',
    label: 'Intraday change',
    sourceLabel: 'Intraday change',
  },
  { id: 'totalWires', label: 'Total Wires' },
  { id: 'reserveRequirement', label: 'Reserve requirement' },
  { id: '15c3Deposit', label: '15C3 Deposit' },
  { id: '15c3Withdrawal', label: '15C3 Withdrawal' },
  {
    id: 'totalReserveRequirement',
    label: 'Total reserve requirement',
  },
  { id: 'other', label: 'Other' },
  { id: 'fxSwaps', label: 'FX swaps' },
  { id: 'misc', label: 'Misc' },
  { id: 'totalOther', label: 'Total other' },
  { id: 'settlementActivityDtc', label: 'Settlement activity (DTC)' },
  { id: 'dtc2154', label: '2154' },
  { id: 'dtc2885', label: '2885' },
  { id: 'dtc8238', label: '8238' },
  {
    id: 'intercoArrangedFundingFlips',
    label: 'Interco Arranged funding flips',
  },
  {
    id: 'totalSettlementActivity',
    label: 'Total settlement activity',
  },
  { id: 'financingActivity', label: 'Financing activity' },
  { id: 'als', label: 'ALS' },
  {
    id: 'clientUsTreasuryShortAbr',
    label: 'Client US treasury Short / ABR',
  },
  {
    id: 'totalFinancingActivity',
    label: 'Total financing activity',
  },
  { id: 'endOfDay', label: 'End of day' },
] as const satisfies readonly SecCorpRowCatalogEntry[];
