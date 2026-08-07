import { APP_RUNTIME_CONFIG, readRuntimeConfig } from './runtime-config';

describe('readRuntimeConfig', () => {
  afterEach(() => {
    delete window.__FUNDING_PANEL_CONFIG__;
    delete window.__SEC_CORP_PANEL_CONFIG__;
  });

  it('uses safe defaults for an absent configuration', () => {
    expect(readRuntimeConfig(undefined)).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
      businessDate: '2026-07-25',
      fundingPanelDataSource: 'mock',
      userId: 'mock-user',
    });
  });

  it('normalizes supplied runtime values', () => {
    expect(
      readRuntimeConfig({
        agGridEnterpriseLicenseKey: ' enterprise-license ',
        apiBaseUrl: ' /funding-api ',
        businessDate: '2026-07-28',
        fundingPanelDataSource: 'http',
        userId: ' e70165 ',
      }),
    ).toEqual({
      agGridEnterpriseLicenseKey: 'enterprise-license',
      apiBaseUrl: '/funding-api',
      businessDate: '2026-07-28',
      fundingPanelDataSource: 'http',
      userId: 'e70165',
    });
  });

  it('rejects invalid operational values without accepting ambiguous dates or modes', () => {
    expect(
      readRuntimeConfig({
        businessDate: '2026-02-30',
        fundingPanelDataSource: 'network',
        userId: 'system',
      }),
    ).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
      businessDate: '2026-07-25',
      fundingPanelDataSource: 'mock',
      userId: 'mock-user',
    });
  });

  it('prefers the generic funding configuration while retaining the legacy alias', () => {
    window.__SEC_CORP_PANEL_CONFIG__ = {
      apiBaseUrl: '/legacy-api',
    };
    window.__FUNDING_PANEL_CONFIG__ = {
      apiBaseUrl: '/funding-api',
      businessDate: '2026-07-28',
      fundingPanelDataSource: 'http',
      userId: 'mock-user',
    };

    expect(readRuntimeConfig()).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/funding-api',
      businessDate: '2026-07-28',
      fundingPanelDataSource: 'http',
      userId: 'mock-user',
    });

    delete window.__FUNDING_PANEL_CONFIG__;

    expect(readRuntimeConfig().apiBaseUrl).toBe('/legacy-api');
  });

  it('exports a stable injection token', () => {
    expect(APP_RUNTIME_CONFIG.toString()).toContain('APP_RUNTIME_CONFIG');
  });
});
