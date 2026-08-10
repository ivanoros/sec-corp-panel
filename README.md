# Enterprise Operations Panel Application

Angular 21 standalone panel application for the Sec Corp and PBIL funding views
and the high-volume Settlement Details view. The surrounding enterprise shell
owns window chrome, docking, and dimensions.

## Local commands

```text
npm start
npm run build
npm run lint
npm run format:check
npm run test:ci
npm run check
```

`npm run check` is the release-quality gate: formatting, lint, all unit and
component tests, then a production build.

## Runtime configuration

The host may define `window.__SEC_CORP_PANEL_CONFIG__` before the Angular bundle
loads:

```js
window.__FUNDING_PANEL_CONFIG__ = {
  apiBaseUrl: '/api',
  agGridEnterpriseLicenseKey: '<injected by the deployment environment>',
  businessDate: '2026-07-28',
  fundingPanelDataSource: 'http',
  userId: 'e70165',
};
```

The AG Grid Enterprise license key must be supplied at runtime and must not be
committed to this repository.

`window.__SEC_CORP_PANEL_CONFIG__` remains a backward-compatible alias. New
shell integrations should use the generic `window.__FUNDING_PANEL_CONFIG__`
name because the application now hosts Sec Corp, PBIL, and Settlement Details.

`fundingPanelDataSource` selects the HTTP or mock gateway for all current panel
features and must be `http` in an integrated environment. The self-contained
default is `mock` with the representative `2026-07-25` business date so local
development does not require a backend. The shell or deployment must inject the
active ISO business date and authenticated user's ID before the Angular bundle
loads. The default mock user is `mock-user`.

## Panel routes

- `/sec-corp`
- `/pbil`
- `/settlement-details`

## REST data boundary

The version 2 REST contract is column-oriented and contains only backend-owned
facts: identity, audit/concurrency metadata, permissions, column IDs, row IDs,
and values. Panel labels, ordering, hierarchy, edit behavior, and calculation
dependencies live in the Sec Corp and PBIL frontend definitions. The data-access
assembler joins both sources into the existing row-oriented domain model used by
AG Grid and the signals store.

## Handoff documentation

- [Phase 7 hardening decisions](docs/architecture/phase-7-production-hardening.md)
- [Settlement Details architecture and REST contract](docs/architecture/settlement-details.md)
- [Operations and release runbook](docs/operations/sec-corp-panel-runbook.md)
