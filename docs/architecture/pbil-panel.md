# PBIL panel architecture and provisional mapping

## Scope

PBIL is the second panel built on the shared funding-panel infrastructure. It
reuses:

- `FundingPanelStore` for preview calculations, dirty state, explicit Update,
  optimistic concurrency, retry, conflict handling, and shell refresh;
- `FundingPanelSurfaceComponent` for loading, grid, save, and conflict states;
- `FundingGridComponent` and the financial editor;
- the domain/DTO/mapper separation and exact decimal calculator;
- runtime mock/HTTP gateway selection.

The PBIL route is `/pbil`. The production REST resources are:

```text
GET /api/v1/funding-panels/pbil?businessDate=YYYY-MM-DD
PUT /api/v1/funding-panels/pbil/{reportId}
```

The PUT contract sends the complete report dataset, `expectedVersion` in the
body, the same quoted value in `If-Match`, and atomic 409/412 rejection when
stale. Focus loss commits locally; only Update sends PUT.

## Confirmed row decisions

- `Slab activity (2147)`
- `Prime reserve requirement`
- `PBIL EOD Balance`
- `15C3 Withdrawal`
- `PBIL/ARB Margin`
- `Credit prime repo activity`
- `Client activity / Cash wires`

The target catalog contains 27 rows. Section bands have blank numeric cells,
detail rows are inputs, SOD is an opening input, and PBIL EOD Balance is the
calculated closing row.

## Period and editing policy

The shared period contract remains:

1. `8:30` - editable input cells.
2. `11:30` - editable input cells.
3. `1:30` - editable input cells.
4. `LIVE` - read-only.
5. `Opps funding` - editable input cells.

Unavailable values are explicit `0.00`. The provided PBIL references do not
contain LIVE or Opps funding values, so the representative fixture initializes
them to zero. Opps funding can be entered by the operator; LIVE remains
backend-authoritative and read-only.

## Provisional source allocations

The requirements explicitly allow best-judgment mappings until source rules are
finalized. These assumptions are recorded in `PBIL_ROW_CATALOG`, separate from
shared domain and grid logic.

| Target row             | Provisional source treatment                               |
| ---------------------- | ---------------------------------------------------------- |
| Slab activity (2884)   | Receives the complete `SLAB Activity` value.               |
| Slab activity (2147)   | Zero until an account-level split is supplied.             |
| Arb MtM Wires          | Crossed-out `PBIL MTM SPO (IAMS/FAMS)` is treated as zero. |
| FX Swaps               | Maps from `GMAT FX Swap`.                                  |
| US treasury repo (PNV) | Combines `UST Repo` and `UST Cash Borrow Return`.          |
| JPM                    | Receives `External Equity Repo`, currently zero.           |
| Equity DIS             | Receives `Internal Equity Repo`.                           |
| E87                    | Zero until an account-level equity split is supplied.      |

## Calculation reconciliation

All source figures are represented in dollars, although the mapping image shows
millions. PBIL EOD Balance sums SOD Balance and every activity detail row.

| Snapshot |              SOD |     Net activity |         PBIL EOD |
| -------- | ---------------: | ---------------: | ---------------: |
| 8:30     | 7,921,000,000.00 | 1,784,000,000.00 | 9,705,000,000.00 |
| 11:30    | 7,921,000,000.00 | 1,437,000,000.00 | 9,358,000,000.00 |
| 1:30     | 7,921,000,000.00 | 1,137,000,000.00 | 9,058,000,000.00 |

The source `PBIL Net` is intentionally not displayed because it is absent from
the target color mapping. The EOD dependency graph provides the same arithmetic
and is validated for every period.

## Reusable mock boundary

The mock gateway no longer imports Sec Corp data. Each panel provides its own
validated `FUNDING_PANEL_MOCK_REPORT`, keeping the gateway reusable and each
docked panel's mock version state isolated.

## Future corrections

Final source allocation changes should update only:

- `pbil-row-catalog.ts` source metadata and assumptions;
- `pbil-report.fixture.json` representative values;
- PBIL fixture expectations.

No store, grid, HTTP, concurrency, or shared presentation change should be
needed unless the business contract itself changes.
