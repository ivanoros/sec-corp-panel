# Phase 6 runtime and host integration

## Scope reconciliation

The optimistic-concurrency state machine, failed-save retention, conflict
handling, and queued manual refresh originally planned around this phase were
implemented early in Phases 3 and 5 because editing could not be made safe
without them.

The remaining Phase 6 work is the production boundary:

- runtime selection of the REST or mock gateway;
- runtime business-date injection;
- removal of Sec Corp's hardcoded mock provider and date;
- verification that shell refresh requests repeat the active query.

## Runtime contract

The shell or deployment can define the following before the Angular bundle
loads:

```js
window.__SEC_CORP_PANEL_CONFIG__ = {
  apiBaseUrl: '/api',
  agGridEnterpriseLicenseKey: '<runtime secret>',
  businessDate: '2026-07-28',
  fundingPanelDataSource: 'http',
};
```

`businessDate` must be a real ISO calendar date. Impossible or ambiguous dates
are rejected. `fundingPanelDataSource` accepts only `http` or `mock`.

The self-contained defaults remain `mock` and `2026-07-25`, matching the
representative fixture. An integrated environment must explicitly set `http`
and its active business date. The license key is still runtime-only and is
never committed.

## Gateway selection

`FUNDING_PANEL_DATA_ACCESS_PROVIDERS` is reusable by future funding panels. Its
factory reads the runtime configuration and resolves exactly one implementation:

- `MockFundingPanelGateway` for local self-contained operation;
- `HttpFundingPanelGateway` for the real GET and versioned PUT contract.

The store and grid depend only on `FUNDING_PANEL_GATEWAY`, so switching modes
does not introduce environment checks into business or presentation logic.

## Concurrency path

The HTTP mode preserves the approved concurrency contract:

1. GET returns a complete report and positive `version`.
2. PUT sends the complete editable snapshot state.
3. `expectedVersion` is present in the JSON body.
4. `If-Match` contains the same quoted version.
5. `409` or `412` becomes `FundingPanelVersionConflictError`.
6. The store retains dirty edits and blocks refresh until the user resolves the
   conflict.

The backend remains responsible for the atomic compare, update, version
increment, authoritative recalculation, and complete response.

## Shell refresh

The shell adapter's revision signal is the only automatic trigger observed by
the store. When the shell requests refresh, the store repeats the original
`panelCode` and `businessDate`.

Valid active edits commit and save before GET. Invalid edits, failed saves, and
version conflicts block GET so no local work is silently discarded.

There is no interval, timer, or polling subscription.
