# Sec Corp Panel

Angular 21 standalone panel application for the Sec Corp funding view. The
surrounding enterprise shell owns window chrome, docking, and dimensions.

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
window.__SEC_CORP_PANEL_CONFIG__ = {
  apiBaseUrl: '/api',
  agGridEnterpriseLicenseKey: '<injected by the deployment environment>',
  businessDate: '2026-07-28',
  fundingPanelDataSource: 'http',
};
```

The AG Grid Enterprise license key must be supplied at runtime and must not be
committed to this repository.

`fundingPanelDataSource` must be `http` in an integrated environment. The
self-contained default is `mock` with the representative `2026-07-25` business
date so local development does not require a backend. The shell or deployment
must inject the active ISO business date before the Angular bundle loads.

## Handoff documentation

- [Phase 7 hardening decisions](docs/architecture/phase-7-production-hardening.md)
- [Operations and release runbook](docs/operations/sec-corp-panel-runbook.md)
