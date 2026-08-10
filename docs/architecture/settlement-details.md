# Settlement Details panel

## Purpose

Settlement Details is a read-only, filterable trade-detail grid designed for
approximately 500,000 records. It is available at `/settlement-details` and
uses the same dark charcoal and teal visual language as Sec Corp and PBIL.

## Data flow

1. AG Grid asks its server-side datasource for an offset and row count.
2. The datasource translates AG Grid's filter and sort models into the
   application-owned search contract.
3. The gateway sends the search to the backend and validates the response with
   Zod before it enters the grid.
4. The grid caches at most five 100-row blocks and renders only visible rows and
   columns.
5. Pagination, sorting, filtering, and the reported total are server-owned.

The browser never retrieves the complete dataset. The local mock reports
500,000 logical records but also generates only the requested page. Its
in-browser filtering and sorting are for development only; production must
perform those operations in a database query with suitable indexes.

## REST search contract

Complex multi-column filters are sent using `POST` rather than encoded into a
long query string. This operation is read-only despite using POST.

`POST /api/v1/settlement-details/search`

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [
    {
      "field": "managerName",
      "operator": "contains",
      "value": "Capital"
    },
    {
      "field": "settlementMode",
      "operator": "equals",
      "value": "CNS"
    },
    {
      "field": "settlementStatus",
      "operator": "equals",
      "value": "Pending"
    },
    {
      "field": "source",
      "operator": "equals",
      "value": "SOD-Batch"
    },
    {
      "field": "tradeId",
      "operator": "contains",
      "value": "TRD-2026"
    }
  ],
  "sort": [
    {
      "field": "tradeId",
      "direction": "desc"
    }
  ]
}
```

Successful response:

```json
{
  "schemaVersion": 1,
  "requestId": "3a760c49-3a37-461f-a34c-143b331ba83e",
  "asOf": "2026-08-10T14:00:00-04:00",
  "totalCount": 29412,
  "rows": [
    {
      "recordId": "settlement-00000001",
      "settlementMode": "CNS",
      "activityType": "Prime Broker",
      "settlementStatus": "Pending",
      "managerCode": "31R",
      "managerName": "Walley Capital LLC",
      "lineOfBusiness": "PB",
      "accountId": "31300000",
      "accountName": "Walley Capital LLC Main",
      "cusip": "05278C107",
      "productId": "462106",
      "securityDescription": "AUTOHOME INC-ADR",
      "isin": "US05278C1071",
      "sedol": "BH5QGR0",
      "assetType": "Equity",
      "assetSubClass": "ADR",
      "blotterCode": "1W",
      "bookingReferenceId": "31RZZV000000000",
      "source": "SOD-Batch",
      "tradeType": "Buy Long",
      "tradeId": "TRD-00000001"
    }
  ]
}
```

Supported text operators are `contains`, `notContains`, `equals`, `notEqual`,
`startsWith`, `endsWith`, `blank`, and `notBlank`. The backend must allow-list
fields and operators, cap `limit` at 500, use parameterized queries, and return
the filtered `totalCount` used by pagination.

## Criteria-strip mapping

The screenshot-style controls above the grid map to the REST contract as
follows:

| Control           | Request mapping                  |
| ----------------- | -------------------------------- |
| Manager           | `managerName` with `contains`    |
| Settlement Date   | top-level `businessDate`         |
| Settlement Mode   | `settlementMode` with `equals`   |
| Activity Type     | `activityType` with `equals`     |
| Settlement Status | `settlementStatus` with `equals` |
| Blotter Code      | `blotterCode` with `contains`    |
| Source            | `source` with `equals`           |
| Trade Type        | `tradeType` with `equals`        |
| Trade ID          | `tradeId` with `contains`        |
| Product           | `productId` with `contains`      |

Blank controls are omitted from `filters`. Multiple filters are combined with
logical `AND`. Text controls are debounced for 350 milliseconds; dropdown
controls request immediately. Changing Settlement Date changes
`businessDate`, resets to the first page, and does not add a filter entry.

The complete request catalog is documented in
[`docs/ServerSideRowModel.md`](../ServerSideRowModel.md).

## Backend implementation notes

- Index the business date and commonly filtered exact-match columns such as
  settlement status, mode, manager code, source, and trade type.
- Prefer seek/keyset pagination for deep pages if the backend and UX later move
  away from direct "page N" navigation. The current offset contract matches AG
  Grid pagination and the supplied requirements, but very deep database offsets
  can become expensive.
- Apply a deterministic tie-breaker such as `recordId` after requested sorts so
  records do not move between pages.
- Return a request ID for tracing and cancellation diagnostics.
- Enforce request timeouts and cancellation on both the API and database query.

## Deliberate decisions

- The panel is read-only because the supplied screenshots and request define
  investigation and filtering, not a settlement mutation workflow.
- Row-selection checkboxes were not added. Selection across partially loaded
  server-side data has ambiguous "select all" semantics and no requested action.
- The screenshot-style criteria strip provides the common search controls in a
  stable location above the grid. Floating column filters remain available for
  detailed per-column conditions. Both surfaces update the same AG Grid filter
  model and therefore produce one consistent backend request.
- Only the first two identity columns are pinned. Pinning more would leave too
  little space for a wide trade dataset in docked layouts.
