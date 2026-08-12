# Settlements Shell architecture

## Purpose

`SettlementsShell` recreates the six-region settlement workspace shown in
`ShellPanels.png`. It is a page composition feature; it does not replace the
host application's masthead, Work Items navigation, or docking system. The
host mounts this page in the content region below its existing navigation.

The six standalone panels are:

1. Net Cash Position
2. Cash Positions Over Time
3. End of Day Movement
4. Projections
5. Totals
6. Settlement Details

The existing Settlement Details feature occupies the large lower workspace.
PBIL and Sec Corp remain available through their dedicated routes but are not
mounted in this shell.

## Component and data flow

```text
SettlementsShellComponent
  |
  +-- SettlementsDashboardStore
  |     |
  |     +-- SETTLEMENTS_DASHBOARD_GATEWAY
  |            +-- MockSettlementsDashboardGateway
  |            +-- HttpSettlementsDashboardGateway
  |
  +-- NetCashPositionPanelComponent
  +-- CashPositionsOverTimePanelComponent
  +-- EndOfDayMovementPanelComponent
  +-- ProjectionsPanelComponent
  +-- SettlementTotalsPanelComponent
  +-- SettlementDetailsPanelComponent
          |
          +-- existing independently paged Settlement Details gateway/store
```

The five summary panels receive typed inputs and emit refresh intent. They do
not know whether their data came from mock fixtures or HTTP. The shell-scoped
store loads one coherent dashboard snapshot so every summary panel has the same
`businessDate` and `asOf` time. Refreshing any summary panel refreshes that
snapshot atomically.

Settlement Details deliberately retains its independent hybrid pagination and
filtering lifecycle because its approximately 500,000 rows do not belong in the
small dashboard response.

## Polling

`SettlementsPollingCoordinator` owns one shell-level timer. The default interval
is 60 seconds. Each tick performs two independent refresh operations:

1. Refresh the single coherent dashboard snapshot used by the five summary
   panels.
2. Refresh Settlement Details using its current business date, backend filters,
   and current 1,000-row server page.

The coordinator does not start six timers. A tick skips a data source if its
previous request is still loading, and polling pauses while the browser tab is
hidden. Manual refresh actions remain available.

```javascript
window.__FUNDING_PANEL_CONFIG__ = {
  settlementsPollingEnabled: true,
  settlementsPollingIntervalMs: 60000,
};
```

Intervals below 10 seconds or above 24 hours are rejected and replaced by the
60-second default.

## Resizable layout

The shell owns four constrained split boundaries:

- left rail width for Net Cash Position, Projections, and Totals;
- End of Day Movement width relative to Cash Positions Over Time;
- upper summary-row height relative to the lower workspace;
- Projections/Totals height split within the left rail.

Pointer dragging previews percentage-based sizes and persists the result to
`localStorage` when the drag finishes. Percentage persistence adapts better
than pixel dimensions when users move between monitors. Minimum and maximum
constraints preserve a usable Settlement Details viewport and prevent panels
from overlapping. Each separator supports arrow-key resizing, and the reset
button restores the screenshot-derived defaults.

The panels do not use independent absolute positioning. Shared boundaries keep
their edges aligned and allow AG Grid to react naturally to container resizing.

## Runtime data-source selection

The existing `fundingPanelDataSource` runtime setting selects the transport:

- `mock`: `MockSettlementsDashboardGateway`
- `http`: `HttpSettlementsDashboardGateway`

This reuses the established application convention and avoids adding a second
environment switch. It can be split into a dedicated setting later if summary
and details services require separate deployment timelines.

## REST contract

```http
GET /api/v1/settlements/dashboard?businessDate=2026-07-25&userId=e70165
```

```json
{
  "schemaVersion": 1,
  "requestId": "dashboard-20260725-140000",
  "businessDate": "2026-07-25",
  "asOf": "2026-07-25T14:00:00-04:00",
  "netCashPositions": {
    "pbil": "9705.00",
    "secCorp": "-2797.00"
  },
  "cashPositionsOverTime": [
    { "time": "08:30", "pbil": "9705.00", "secCorp": "-1779.00" },
    { "time": "11:30", "pbil": "9358.00", "secCorp": "-2528.00" },
    { "time": "13:30", "pbil": "9058.00", "secCorp": "-2528.00" }
  ],
  "projections": {
    "live": { "pbil": "9705.00", "secCorp": "-2797.00" },
    "snapshot0830": { "pbil": "9705.00", "secCorp": "-2797.00" },
    "snapshot1130": { "pbil": "9358.00", "secCorp": "-2528.00" },
    "snapshot1330": { "pbil": "9058.00", "secCorp": "-2528.00" },
    "endOfDay": { "pbil": "9058.00", "secCorp": "-2528.00" }
  },
  "endOfDayMovement": {
    "secCorp4Pm": "-933108802.00",
    "netSettledSecuritiesIntoMarginFacility": "520000000.00",
    "netSettledCashIntoMarginFacility": "-442000000.00",
    "secCorpCash": "-1375108802.00",
    "target": "-1500000000.00",
    "difference": "-124891198.00",
    "securitiesToMove": "-146930821.00"
  },
  "totals": {
    "dailyNetCash": { "pbil": "766.00", "secCorp": "388.00" },
    "netEndOfDayBalance": { "pbil": "6908.00", "secCorp": "6530.00" }
  }
}
```

Monetary values remain decimal strings to avoid binary floating-point loss.
The response is validated at the HTTP boundary before entering application
state.

## Future improvements

- Confirm the backend source and calculation for every summary value.
- Add accessible time-axis labels and tooltips to the chart.
- Persist user-specific panel sizes when the host docking contract is known.
- Split the dashboard endpoint only if independent refresh or authorization is
  required for a specific summary panel.
- Add a shell-wide business-date control when product requirements are final.
