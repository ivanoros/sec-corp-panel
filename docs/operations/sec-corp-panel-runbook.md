# Sec Corp panel operations and release runbook

## Release gate

From the repository root:

```text
npm ci
npm run check
npm audit --omit=dev
```

`npm run check` runs formatting verification, ESLint, all unit/component tests,
and the production build. Do not deploy if any step fails or if the production
dependency audit reports a vulnerability.

## Required runtime configuration

The shell or deployment must define this object before the Angular bundle
loads:

```js
window.__SEC_CORP_PANEL_CONFIG__ = {
  apiBaseUrl: '/api',
  agGridEnterpriseLicenseKey: '<deployment-managed key>',
  businessDate: '2026-07-28',
  fundingPanelDataSource: 'http',
};
```

- `businessDate` is the shell-selected real ISO calendar date.
- `fundingPanelDataSource` must be `http` outside self-contained development.
- `apiBaseUrl` is the same-origin or CORS-enabled funding service base URL.
- The AG Grid Enterprise key is deployment-managed and must not be committed or
  logged.

The panel intentionally contains no authentication implementation. The
enterprise shell and API gateway must establish the authenticated session and
authorization context.

## API readiness

Verify these requests using the deployed panel's credentials:

```text
GET {apiBaseUrl}/v1/funding-panels/sec-corp?businessDate=YYYY-MM-DD
PUT {apiBaseUrl}/v1/funding-panels/sec-corp/{reportId}
```

The PUT must atomically compare `expectedVersion`/`If-Match`, persist the full
editable snapshot state, increment the version, recalculate authoritative
totals, and return the complete report. A stale write must return HTTP 409 or 412. Review the exact payload and response schema in
`docs/architecture/phase-2-domain-contract.md`.

## Deployment smoke test

1. Open Sec Corp for a known business date and confirm all 37 rows render.
2. Confirm the columns are Bucket, 8:30, 11:30, 1:30, LIVE, and Opps funding.
3. Confirm LIVE and Opps funding cannot enter edit mode.
4. Edit an input row in each snapshot column; verify totals preview immediately.
5. Leave the cell; verify one PUT is sent with matching `expectedVersion` and
   `If-Match`.
6. Confirm the returned version is higher and the dirty marker clears.
7. Trigger the shell's manual refresh and verify the same business date is
   requested.
8. Simulate a stale version and verify edits remain visible until the operator
   confirms discard and reload.
9. Use keyboard-only navigation to edit, commit with Enter/Tab, and cancel with
   Escape.
10. Resize the docked panel narrowly and verify the grid scrolls horizontally
    while save/conflict controls remain inside the panel.

## Operator states

- **Loading failure:** the panel shows the service error and `Try again`.
- **Save failure:** edited values stay dirty; `Retry` repeats the full-state PUT
  using the same expected version.
- **Version conflict:** the panel explicitly says the screen is out of date and
  the attempted changes were not saved. The unsaved values remain visible
  locally for review. `Reload latest data` requires confirmation because it
  discards those local values. There is intentionally no client-side merge.
- **Invalid edit:** the cell remains active with an inline validation message;
  save and manual refresh remain blocked.
- **Manual refresh during save:** refresh is queued and starts after the valid
  save succeeds.

## Troubleshooting

- **Mock data appears in an integrated environment:** confirm the runtime object
  exists before `main.js` runs and `fundingPanelDataSource` is exactly `http`.
- **Wrong business date:** inspect the injected `businessDate`; the panel does
  not derive it from the browser clock.
- **AG Grid license watermark:** confirm a valid Enterprise key is injected
  before the panel initializes.
- **Repeated 409/412:** another writer is advancing the report version. Reload,
  review the authoritative values, and re-enter intentional changes.
- **PUT succeeds but totals differ:** the returned report is authoritative.
  Compare backend calculation rules with the dependency definitions in the GET
  response and the panel calculator tests.

## Monitoring expectations

The hosting platform should monitor GET/PUT latency and error rate, with
separate counts for transient 5xx failures and expected 409/412 conflicts.
Request correlation, audit identity, and persistence audit records belong at
the API gateway/service boundary; the panel must not log financial payloads or
the AG Grid license key.
