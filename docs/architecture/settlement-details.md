# Settlement Details panel

## Purpose

Settlement Details is a read-only trade-detail panel for approximately 500,000
records. It is available at `/settlement-details` and uses the same charcoal
and teal visual language as Sec Corp and PBIL.

## Hybrid data model

The panel uses a server-windowed Client-Side Row Model:

1. The top criteria, selected business date, user ID, offset, and 1,000-row
   limit are sent to the REST search endpoint.
2. The backend filters the complete data set and returns one stable 1,000-row
   server page plus the database-wide filtered count.
3. The page store validates and holds that window in memory.
4. AG Grid receives the window as client-side row data.
5. Floating column filters and column sorting run only against those loaded
   rows and therefore produce no HTTP request.
6. Server page navigation, top criteria, Settlement Date, and manual Refresh
   explicitly load another backend window.

The design retains bounded browser memory while avoiding a server round trip
for every exploratory grid-column filter.

Each settlement row also carries traded quantity, trade net amount, settled
quantity, settlement net amount, and settlement currency. The four measures
are numeric REST properties and use AG Grid number filters, numeric sorting,
right alignment, tabular digits, and accounting-style negative formatting.

## Component interaction

```text
Top criteria / date / page / refresh
                |
                v
SettlementDetailsWindowStore
                |
                v
POST /v1/settlement-details/search (limit 1,000)
                |
                v
Zod response validation -> rows signal -> AG Grid Client-Side Row Model
                                            |
                                            +-- local column filters
                                            +-- local column sorting
                                            +-- column visibility/order
```

The store cancels an obsolete in-flight request when newer criteria arrive and
ignores stale results by request sequence. This prevents a slow previous query
from replacing a newer page.

## REST contract

`POST /api/v1/settlement-details/search`

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "settlementDate": {
    "operator": "equals",
    "value": "2026-08-10"
  },
  "offset": 0,
  "limit": 1000,
  "filters": [
    {
      "field": "managerName",
      "operator": "contains",
      "value": "Capital"
    },
    {
      "field": "settlementStatus",
      "operator": "equals",
      "value": "Pending"
    }
  ],
  "sort": []
}
```

The empty `sort` array is intentional. Column sorting is local to the current
window. The backend must still use a stable default order with a deterministic
`recordId` tie-breaker so offset pages do not drift.

The complete request catalog is in
[`docs/HybridRowModel.md`](../HybridRowModel.md).

## State ownership

| State                                     | Owner                | Scope                   |
| ----------------------------------------- | -------------------- | ----------------------- |
| Settlement Date value and operator        | Panel signals        | Server query            |
| Top criteria                              | Panel signal         | Entire backend data set |
| Current page, rows, total, loading, error | Window store signals | Server window           |
| Floating column filters                   | AG Grid              | Loaded 1,000 rows only  |
| Column sorting                            | AG Grid              | Loaded 1,000 rows only  |
| Column visibility and order               | AG Grid              | Presentation only       |

Top criteria and grid-column filters are intentionally independent even when
they target the same field. This makes their scope unambiguous and ensures a
column-filter change cannot accidentally generate an HTTP request.

## Deliberate decisions

- A true SSRM datasource was removed because SSRM treats filter-model changes as
  server-store refreshes; it cannot provide the requested local-only column
  filtering behavior.
- The browser holds only 1,000 domain rows, not all 500,000 records.
- A custom server pager replaces AG Grid's client pagination footer. Built-in
  client pagination would incorrectly report only the loaded window as the
  complete data set.
- The UI states that grid filters search the current 1,000-row page only. This
  prevents users from mistaking a local result for a database-wide result.
- Sorting is also local because that is the natural behavior of the Client-Side
  Row Model. The backend supplies a stable default order for page navigation.
- The Settlement Date control is a joined native operator dropdown and date
  input. Its typed REST criterion avoids ambiguous symbols in backend code;
  `equals` is the default and Clear restores it without changing the date.
- Row-selection checkboxes remain excluded because there is no defined action
  or cross-page selection contract.

## Future options

- Add a deliberate "Search all records" promotion action that copies a local
  column condition into the top server criteria.
- Persist column state and local filters per user.
- Replace offset pagination with keyset cursors if deep-page database latency
  becomes material.
- Add server-supplied distinct values for high-cardinality top criteria.
