# Settlement Details server-side request catalog

Settlement Details uses AG Grid Enterprise's **Server-Side Row Model (SSRM)**.
The browser requests only the rows needed for the current page. The backend
applies the business date, filters, and sorting to the full data set before it
returns that page.

## Endpoint

`POST /api/v1/settlement-details/search`

POST is used because the search criteria can contain multiple structured
filters and sorts. The operation is read-only.

Every request has the same envelope:

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

| Property        | Meaning                                                     |
| --------------- | ----------------------------------------------------------- |
| `schemaVersion` | Version of this request contract. Currently `1`.            |
| `userId`        | Authenticated user making the request.                      |
| `businessDate`  | Required settlement-date scope, formatted `YYYY-MM-DD`.     |
| `offset`        | Zero-based index of the first requested result.             |
| `limit`         | Maximum number of rows requested; backend maximum is `500`. |
| `filters`       | Active field filters. Blank UI controls are omitted.        |
| `sort`          | Active sort clauses, in priority order.                     |

## Criteria-strip mapping

The controls above the grid produce the following request fields. Settlement
Date is deliberately not included in `filters`; it is the required top-level
`businessDate` scope for every query.

| UI control        | JSON location                          | Operator       |
| ----------------- | -------------------------------------- | -------------- |
| Manager           | `filters[].field = "managerName"`      | `contains`     |
| Settlement Date   | `businessDate`                         | Not applicable |
| Settlement Mode   | `filters[].field = "settlementMode"`   | `equals`       |
| Activity Type     | `filters[].field = "activityType"`     | `equals`       |
| Settlement Status | `filters[].field = "settlementStatus"` | `equals`       |
| Blotter Code      | `filters[].field = "blotterCode"`      | `contains`     |
| Source            | `filters[].field = "source"`           | `equals`       |
| Trade Type        | `filters[].field = "tradeType"`        | `equals`       |
| Trade ID          | `filters[].field = "tradeId"`          | `contains`     |
| Product           | `filters[].field = "productId"`        | `contains`     |

Text controls are debounced for 350 milliseconds before the grid issues a
request. Dropdown controls issue a request immediately. Multiple filters are
combined with logical `AND`.

The column floating filters use the same `filters` array. They additionally
support `notContains`, `notEqual`, `startsWith`, `endsWith`, `blank`, and
`notBlank`.

## Request examples

### 1. Initial panel load

The panel asks for the first 100 rows for the selected settlement date.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

### 2. Settlement Date changed

Changing Settlement Date resets the grid to the first page and changes
`businessDate`. It does not create a `filters` entry.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-11",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

### 3. Dropdown filter

Selecting `Pending` in Settlement Status creates an exact-match filter.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
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

### 4. Text filter

Entering `Capital` in Manager creates a case-insensitive contains filter.

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
    }
  ],
  "sort": []
}
```

### 5. All criteria-strip filters combined

This is the largest request the new criteria strip can produce by itself.

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
      "field": "activityType",
      "operator": "equals",
      "value": "Prime Broker"
    },
    {
      "field": "settlementStatus",
      "operator": "equals",
      "value": "Pending"
    },
    {
      "field": "blotterCode",
      "operator": "contains",
      "value": "1W"
    },
    {
      "field": "source",
      "operator": "equals",
      "value": "SOD-Batch"
    },
    {
      "field": "tradeType",
      "operator": "equals",
      "value": "Buy Long"
    },
    {
      "field": "tradeId",
      "operator": "contains",
      "value": "TRD-2026"
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

### 6. Sorting

Clicking a column header resets to the first page. AG Grid may send up to three
sort clauses; their array order is their priority.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": [
    {
      "field": "managerName",
      "direction": "asc"
    },
    {
      "field": "tradeId",
      "direction": "desc"
    }
  ]
}
```

### 7. Filtering, sorting, and pagination together

The active date, filters, and sorts are repeated on every page request. For
page 2 with 100-row blocks, `offset` is `100`.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 100,
  "limit": 100,
  "filters": [
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
      "field": "tradeId",
      "operator": "contains",
      "value": "TRD"
    }
  ],
  "sort": [
    {
      "field": "managerName",
      "direction": "asc"
    }
  ]
}
```

The backend must return rows 101-200 of the **filtered and sorted** result, not
rows 101-200 of the unfiltered data set.

### 8. Clearing filters

Clearing the filter controls resets to page 1. The selected settlement date is
retained because it is a required query scope.

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

### 9. Manual refresh

Refresh does not create a special request shape. It invalidates the grid cache
and repeats the current request. For example:

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [
    {
      "field": "source",
      "operator": "equals",
      "value": "SOD-Batch"
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

### 10. Larger page sizes and cache blocks

The visible pagination page size and SSRM cache block size are separate. The
grid fetches 100-row blocks. A 500-row page may therefore cause these requests:

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 100,
  "limit": 100,
  "filters": [],
  "sort": []
}
```

The same pattern continues at offsets `200`, `300`, and `400`. Requests can
overlap, so the backend must not rely on their arrival order.

### 11. Advanced column floating-filter operator

The criteria strip intentionally uses only `contains` and `equals`. A user can
still choose a more specific operator in a column floating filter:

```json
{
  "schemaVersion": 1,
  "userId": "e70165",
  "businessDate": "2026-08-10",
  "offset": 0,
  "limit": 100,
  "filters": [
    {
      "field": "securityDescription",
      "operator": "startsWith",
      "value": "MICROSOFT"
    },
    {
      "field": "bookingReferenceId",
      "operator": "notBlank"
    }
  ],
  "sort": []
}
```

`blank` and `notBlank` do not carry a `value` property.

## Supported filter and sort fields

The backend must allow-list these values rather than using client-provided
field names directly in SQL:

```text
settlementMode
activityType
settlementStatus
managerCode
managerName
lineOfBusiness
accountId
accountName
cusip
productId
securityDescription
isin
sedol
assetType
assetSubClass
blotterCode
bookingReferenceId
source
tradeType
tradeId
```

Supported filter operators:

```text
contains
notContains
equals
notEqual
startsWith
endsWith
blank
notBlank
```

Supported sort directions:

```text
asc
desc
```

## Success response

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

For a valid query with no matches, return HTTP 200 with `totalCount: 0` and an
empty `rows` array.

## Backend processing order

For every request, the backend should:

1. Validate `schemaVersion`, `userId`, `businessDate`, pagination, fields, and
   operators.
2. Apply the required business date.
3. Apply every filter using logical `AND`.
4. Count the filtered records for `totalCount`.
5. Apply the requested sorts plus a deterministic `recordId` tie-breaker.
6. Apply `offset` and `limit` last.
7. Return the requested rows, filtered count, `asOf`, and traceable `requestId`.

This ordering is essential. Paginating before filtering or sorting produces
incorrect pages and totals.
