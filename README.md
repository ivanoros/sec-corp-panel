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
```

## Runtime configuration

The host may define `window.__SEC_CORP_PANEL_CONFIG__` before the Angular bundle
loads:

```js
window.__SEC_CORP_PANEL_CONFIG__ = {
  apiBaseUrl: '/api',
  agGridEnterpriseLicenseKey: '<injected by the deployment environment>',
};
```

The AG Grid Enterprise license key must be supplied at runtime and must not be
committed to this repository. The application uses `/api` and no license key
when the configuration is absent.
