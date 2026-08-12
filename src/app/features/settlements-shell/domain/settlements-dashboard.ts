export const SETTLEMENT_BUSINESS_UNITS = ['pbil', 'secCorp'] as const;

export type SettlementBusinessUnit = (typeof SETTLEMENT_BUSINESS_UNITS)[number];
export type SettlementDashboardAmount = string;

export interface SettlementBusinessUnitValues {
  readonly pbil: SettlementDashboardAmount;
  readonly secCorp: SettlementDashboardAmount;
}

export interface CashPositionPoint extends SettlementBusinessUnitValues {
  readonly time: string;
}

export interface SettlementProjectionValues {
  readonly live: SettlementBusinessUnitValues;
  readonly snapshot0830: SettlementBusinessUnitValues;
  readonly snapshot1130: SettlementBusinessUnitValues;
  readonly snapshot1330: SettlementBusinessUnitValues;
  readonly endOfDay: SettlementBusinessUnitValues;
}

export interface EndOfDayMovementValues {
  readonly secCorp4Pm: SettlementDashboardAmount;
  readonly netSettledSecuritiesIntoMarginFacility: SettlementDashboardAmount;
  readonly netSettledCashIntoMarginFacility: SettlementDashboardAmount;
  readonly secCorpCash: SettlementDashboardAmount;
  readonly target: SettlementDashboardAmount;
  readonly difference: SettlementDashboardAmount;
  readonly securitiesToMove: SettlementDashboardAmount;
}

export interface SettlementTotalsValues {
  readonly dailyNetCash: SettlementBusinessUnitValues;
  readonly netEndOfDayBalance: SettlementBusinessUnitValues;
}

export interface SettlementsDashboard {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly businessDate: string;
  readonly asOf: string;
  readonly netCashPositions: SettlementBusinessUnitValues;
  readonly cashPositionsOverTime: readonly CashPositionPoint[];
  readonly projections: SettlementProjectionValues;
  readonly endOfDayMovement: EndOfDayMovementValues;
  readonly totals: SettlementTotalsValues;
}

export interface SettlementsDashboardQuery {
  readonly businessDate: string;
  readonly userId: string;
}
