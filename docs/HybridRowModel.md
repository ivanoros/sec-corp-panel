# Settlement Details hybrid row model

Settlement Details uses a **server-windowed Client-Side Row Model**. The backend
returns one page of at most 1,000 records. AG Grid holds that page in browser
memory and applies column filtering and sorting locally.

This is intentionally different from AG Grid's Server-Side Row Model (SSRM).

## What calls the backend

| User action                      | Backend request? | Behavior                                     |
| -------------------------------- | ---------------- | -------------------------------------------- |
| Open the panel                   | Yes              | Fetch server page 1 with up to 1,000 rows.   |
| Change a top criterion           | Yes              | Fetch page 1 using all top criteria.         |
| Change Settlement Date           | Yes              | Fetch page 1 for the new business date.      |
| Move to another server page      | Yes              | Fetch that 1,000-row server window.          |
| Click Refresh                    | Yes              | Reload the current server page and criteria. |
| Use a grid-column filter         | No               | Filter only the currently loaded rows.       |
| Sort a grid column               | No               | Sort only the currently loaded rows.         |
| Open or change the Column Picker | No               | Change only the grid presentation.           |

The panel makes the local scope visible with the message: **Grid filters search
this 1,000-row page only**.

## Endpoint

`POST /api/v1/settlement-details/search`

The request envelope remains backend-focused:

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 1000,
  "filters": [],
  "sort": []
}
```

| Property        | Meaning                                                          |
| --------------- | ---------------------------------------------------------------- |
| `schemaVersion` | Version of this request contract. Currently `1`.                 |
| `userId`        | Authenticated user making the request.                           |
| `businessDate`  | Required settlement-date scope in `YYYY-MM-DD` format.           |
| `offset`        | Zero-based start of the requested server window.                 |
| `limit`         | Requested window size. The current value and maximum are `1000`. |
| `filters`       | Top-criteria filters only.                                       |
| `sort`          | Empty because grid-column sorting is local to the loaded window. |

## Top-criteria mapping

| UI control        | Request mapping                        | Operator       |
| ----------------- | -------------------------------------- | -------------- |
| Manager           | `filters[].field = "managerName"`      | `contains`     |
| Settlement Date   | top-level `businessDate`               | Not applicable |
| Settlement Status | `filters[].field = "settlementStatus"` | `equals`       |
| Product           | `filters[].field = "productId"`        | `contains`     |

Blank controls are omitted. Multiple criteria are combined with logical `AND`.
Text inputs are debounced for 350 milliseconds; dropdowns request immediately.

## Request examples

### Initial load

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 1000,
  "filters": [],
  "sort": []
}
```

### Combined top criteria

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
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
    },
    {
      "field": "productId",
      "operator": "contains",
      "value": "462106"
    }
  ],
  "sort": []
}
```

### Next server page

Every server page contains up to 1,000 records. Page 2 starts at offset 1,000.
The active business date and top criteria are repeated.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 1000,
  "limit": 1000,
  "filters": [
    {
      "field": "settlementStatus",
      "operator": "equals",
      "value": "Pending"
    }
  ],
  "sort": []
}
```

### Settlement Date changed

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-11",
  "offset": 0,
  "limit": 1000,
  "filters": [],
  "sort": []
}
```

### Manual refresh

Refresh repeats the current server-window request. There is no special refresh
property or endpoint.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 3000,
  "limit": 1000,
  "filters": [
    {
      "field": "source",
      "operator": "equals",
      "value": "SOD-Batch"
    }
  ],
  "sort": []
}
```

## Grid-column filter example: no request

Suppose page 4 has already loaded rows 3,001-4,000. The user enters
`MICROSOFT` in the Security Description floating filter.

AG Grid filters those loaded rows in browser memory. It does **not** send JSON
to the backend, does not change `offset`, and does not search the other 499,000
records. Clearing or changing this filter also does not call the backend.

## Success response

```json
{
  "schemaVersion": 1,
  "requestId": "3a760c49-3a37-461f-a34c-143b331ba83e",
  "asOf": "2026-08-10T14:00:00-04:00",
  "totalCount": 500000,
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
      "tradeId": "TRD-00000001",
      "tradedQuantity": 795873,
      "tradeNetAmount": 427655785.25,
      "settledQuantity": 428355,
      "settlementNetAmount": 230230879.1,
      "settlementCurrency": "USD"
    }
  ]
}
```

The four quantity and net-amount properties are JSON numbers so AG Grid can
sort and filter them numerically inside the loaded 1,000-row window. The
currency is a required three-letter uppercase code. All five properties are
required on every response row.

`totalCount` is the count after applying the business date and top criteria,
before pagination. `rows` contains at most 1,000 records. A valid empty result
returns HTTP 200, `totalCount: 0`, and `rows: []`.

## Backend processing order

1. Validate the request and allow-list all filter fields and operators.
2. Apply `businessDate`.
3. Apply all top-criteria filters with logical `AND`.
4. Calculate the filtered `totalCount`.
5. Apply a stable default order with `recordId` as a deterministic tie-breaker.
6. Apply `offset` and `limit` last.
7. Return the requested rows, total, `asOf`, and traceable `requestId`.

The backend must cap `limit` at 1,000 and use parameterized queries. Because
the client does not send grid sorting, a stable server order is essential to
prevent records from moving between pages.

## Trade-off

This model makes repeated exploratory filtering very fast for the loaded page
and reduces backend traffic. Its limitation is deliberate: grid-column filters
do not search the complete 500,000-row data set. Users must use the top criteria
when they need a database-wide search.
