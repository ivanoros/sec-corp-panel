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
5. `opportunityFunding`, displayed as `Opps funding`, read-only.

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
  "businessDate": "2026-07-25",
  "snapshotValues": {
    "occ": {
      "snapshot0830": "-308824714.48",
      "snapshot1130": "-306000000.00",
      "snapshot1330": "-302500000.00"
    }
  }
}
```

The real request includes every input row because PUT replaces the complete
editable snapshot state. The database compares `expectedVersion` atomically,
increments the version on success, recalculates authoritative totals, and
returns the complete report.

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
