# Phase 2 domain and API contract

## Financial values

REST monetary values are canonical signed decimal strings with exactly two
fractional digits. JSON numbers are not accepted.

```json
{
  "snapshot0830": "-308824714.48"
}
```

`null` is reserved for section rows. A snapshot that has not yet received a
business value is explicitly `"0.00"`; a missing period property is a contract
failure.

## Periods

Every report contains exactly these periods in this order:

1. `snapshot0830`, displayed as `8:30`, editable.
2. `snapshot1130`, displayed as `11:30`, editable.
3. `snapshot1330`, displayed as `1:30`, editable.
4. `live`, displayed as `LIVE`, read-only.
5. `opportunityFunding`, displayed as `Opps funding`, editable.

Period editability is an allowlist in the domain contract. Even in an editable
period, only rows whose `valueMode` is `input` can enter edit mode. Bucket labels,
LIVE values, sections, subtotals, totals, and closing balances remain read-only.

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
GET /api/v1/funding-panels/sec-corp?businessDate=2026-07-25
```

The response is validated at runtime before it enters the domain. It includes
`version`, permissions, period metadata, ordered rows, and authoritative
calculated values. The representative Sec Corp fixture contains 37 rows; the
shared contract does not impose that fixture-specific count on future panels.

## Save

```http
PUT /api/v1/funding-panels/sec-corp/sec-corp-2026-07-25
If-Match: "17"
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "expectedVersion": 17,
  "report": {
    "schemaVersion": 1,
    "reportId": "sec-corp-2026-07-25",
    "panelCode": "sec-corp",
    "title": "Sec Corp",
    "businessDate": "2026-07-25",
    "currency": "USD",
    "timezone": "America/New_York",
    "asOf": "2026-07-25T13:42:18-04:00",
    "version": 17,
    "permissions": { "canEdit": true, "canSave": true },
    "periods": ["all five period objects from GET"],
    "rows": ["all row objects, values, and calculations from the edited report"]
  }
}
```

The arrays above are abbreviated only for readability. The real request sends
the complete report dataset: metadata, permissions, all five period definitions,
every row, every period value, and every calculation definition. The database
compares `expectedVersion` atomically, validates the report identity, persists
the allowed input values, increments the version, recalculates authoritative
totals, and returns the complete report. The backend must not trust client-sent
calculated values or server-owned metadata without validation.

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
