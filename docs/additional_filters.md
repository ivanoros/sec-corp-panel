Updated the Settlement Details request documentation for the new filters.
Key contract decisions:
Settlement Date maps to top-level businessDate.
Manager, Blotter Code, Trade ID, and Product use contains.
Dropdown filters use equals.
Empty controls are omitted from filters.
Multiple filters use logical AND.
Filtering resets pagination to the first page.
Refresh resends the current request unchanged.
Example:
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
      "field": "source",
      "operator": "equals",
      "value": "SOD-Batch"
    },
    {
      "field": "tradeType",
      "operator": "equals",
      "value": "Buy Long"
    }
  ],
  "sort": [
    {
      "field": "tradeId",
      "direction": "desc"
    }
  ]
}

Files changed:
[ServerSideRowModel.md](C:/.Codex/sec-corp-panel/docs/ServerSideRowModel.md)
[settlement-details.md](C:/.Codex/sec-corp-panel/docs/architecture/settlement-details.md)
The request catalog now includes initial loading, date changes, every new filter, combined filters, sorting, pagination, clearing, refresh, cache blocks, and advanced floating-filter operators.
Validation: all 16 JSON examples parse successfully and both documents pass Prettier.