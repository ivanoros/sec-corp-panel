# Phase 2 domain and API contract

## Financial values

REST monetary values are canonical signed decimal strings with exactly two
fractional digits. JSON numbers are not accepted.

```json
{
  "occ": "-308824714.48"
}
```

Section rows are presentation definitions and are omitted from backend column
values. A period that has not yet received a business value is explicitly
`"0.00"`; a missing numeric row value is a contract failure.

## Periods

The frontend definition maps exactly these backend column IDs:

1. `snapshot0830`, displayed as `8:30`, editable.
2. `snapshot1130`, displayed as `11:30`, editable.
3. `snapshot1330`, displayed as `1:30`, editable.
4. `live`, displayed as `LIVE`, read-only.
5. `opportunityFunding`, displayed as `Opps funding`, editable.

Period editability is an allowlist in the domain contract. Even in an editable
period, only rows whose `valueMode` is `input` can enter edit mode. Bucket labels,
LIVE values, sections, subtotals, totals, and closing balances remain read-only.

## Row identity

Row `id` values use lower camel case so they align with backend object names,
for example `arbMtmWires`, `totalMargin`, and `endOfDay`. Calculation `rowIds`
use exactly the same identifiers. Hyphenated row IDs are rejected at the REST
schema and domain-validation boundaries.

The numeric-leading business term `15C3` follows the same mechanical rule and is
represented as `15c3Deposit` or `15c3Withdrawal`.

## Backend data and frontend definitions

REST contract version 2 contains backend-owned facts only: report identity,
audit/concurrency metadata, permissions, snapshot IDs, row IDs, and values. Labels,
display order, hierarchy, row kind, edit behavior, period labels, and calculation
dependencies live in the panel definition selected by `panelCode`.

`schemaVersion` versions the wire structure. `definitionVersion` versions the
shared set of supported row and column IDs. An unknown ID, missing or duplicate
column, section value, or incompatible definition version fails the complete
response instead of silently hiding financial data. Row values are object
properties, so each row ID can occur only once in the parsed contract. Backend
serializers must also avoid duplicate raw JSON properties because parsers may
silently retain only the last property.

## Sec Corp row mapping

Area 2 of the color-panel reference is the target row order. Its six
placeholders are resolved by position from area 1:

| Target position                           | Source label                            |
| ----------------------------------------- | --------------------------------------- |
| Margin after `Fails margin 116-02149`     | `Margin Fails (090 Account) Intl & MtM` |
| Margin after `Margin 580-10500`           | `Arb MtM Wires`                         |
| Next margin row                           | `SLAB MtM Wires`                        |
| Wires after `Cust Wires 177/Omni/177 Pay` | `ARB SNC`                               |
| Wires after `Sec Corp/ARB Margin`         | `OMNI`                                  |
| Next wires row                            | `Intraday change`                       |

The resulting catalog has 37 rows and no unresolved placeholder. `SOD Balance`
is the normalized net opening position represented by the single target row.
This preserves the area 2 structure while reconciling the visible totals to
End of Day.

## Retrieve

```http
GET /api/v1/funding-panels/sec-corp?businessDate=2026-07-25&userId=e70165
```

The response is validated and joined with the Sec Corp frontend definition before
it enters the row-oriented domain model. A compact response has this shape:

```json
{
  "schemaVersion": 2,
  "definitionVersion": 1,
  "reportId": "sec-corp-2026-07-25",
  "panelCode": "sec-corp",
  "businessDate": "2026-07-25",
  "currency": "USD",
  "timezone": "America/New_York",
  "asOf": "2026-07-25T13:42:18-04:00",
  "version": 17,
  "userId": "previousUser",
  "permissions": { "canEdit": true, "canSave": true },
  "columns": [
    {
      "snapshotId": "snapshot0830",
      "sodBalance": "1679335804.24",
      "occ": "-308824714.48",
      "totalMargin": "-219227849.12"
    }
  ]
}
```

The example abbreviates `columns`; the real response has all five snapshots and
every non-section row as a direct snapshot property, including authoritative
calculated rows.

The query `userId` identifies the authenticated user making the retrieval. In
the returned report, `userId` is audit metadata for the last successful update:
it is exactly `system` while `version` is `0`, and the actual updater's ID for
every later version.

## Save

```http
PUT /api/v1/funding-panels/sec-corp/sec-corp-2026-07-25
If-Match: "17"
Content-Type: application/json
```

```json
{
  "schemaVersion": 2,
  "definitionVersion": 1,
  "expectedVersion": 17,
  "userId": "e70165",
  "report": {
    "reportId": "sec-corp-2026-07-25",
    "panelCode": "sec-corp",
    "businessDate": "2026-07-25",
    "currency": "USD",
    "timezone": "America/New_York",
    "asOf": "2026-07-25T13:42:18-04:00",
    "version": 17,
    "userId": "previousUser",
    "permissions": { "canEdit": true, "canSave": true },
    "columns": [
      {
        "snapshotId": "snapshot0830",
        "sodBalance": "1679335804.24",
        "occ": "-308824714.48",
        "totalMargin": "-219227849.12"
      }
    ]
  }
}
```

The snapshots above are abbreviated only for readability. The real request sends
the complete backend-owned dataset: metadata, permissions, all five snapshot IDs,
and every non-section row value. It does not send labels, display order,
hierarchy, formatting, or calculation definitions. The database
compares `expectedVersion` atomically, validates the report identity, persists
the allowed input values, increments the version, recalculates authoritative
totals, sets the returned report's `userId` to the request actor, and returns the
complete report. The top-level `userId` identifies the current update actor;
`report.userId` describes the last accepted version and therefore is not changed
locally before the save succeeds. The backend must verify the supplied request
actor against the authenticated principal and must not trust client-sent
calculated values or server-owned metadata without validation.

The first system-created dataset and its first successful user update transition
as follows:

```json
{
  "before": { "version": 0, "userId": "system" },
  "updateActor": "e70165",
  "after": { "version": 1, "userId": "e70165" }
}
```

Stale saves return:

```http
409 Conflict
```

```json
{
  "code": "VERSION_CONFLICT",
  "message": "The Sec Corp report was updated by another user.",
  "expectedVersion": 17,
  "currentVersion": 18
}
```

No partial update is applied when the version is stale.
