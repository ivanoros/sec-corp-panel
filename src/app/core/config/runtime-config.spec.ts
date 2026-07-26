import { APP_RUNTIME_CONFIG, readRuntimeConfig } from './runtime-config';

describe('readRuntimeConfig', () => {
  it('uses safe defaults for an absent configuration', () => {
    expect(readRuntimeConfig(undefined)).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
      businessDate: '2026-07-25',
      fundingPanelDataSource: 'mock',
    });
  });

  it('normalizes supplied runtime values', () => {
    expect(
      readRuntimeConfig({
        agGridEnterpriseLicenseKey: ' enterprise-license ',
        apiBaseUrl: ' /funding-api ',
        businessDate: '2026-07-28',
        fundingPanelDataSource: 'http',
      }),
    ).toEqual({
      agGridEnterpriseLicenseKey: 'enterprise-license',
      apiBaseUrl: '/funding-api',
      businessDate: '2026-07-28',
      fundingPanelDataSource: 'http',
    });
  });

  it('rejects invalid operational values without accepting ambiguous dates or modes', () => {
    expect(
      readRuntimeConfig({
        businessDate: '2026-02-30',
        fundingPanelDataSource: 'network',
      }),
    ).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
      businessDate: '2026-07-25',
      fundingPanelDataSource: 'mock',
    });
  });

  it('exports a stable injection token', () => {
    expect(APP_RUNTIME_CONFIG.toString()).toContain('APP_RUNTIME_CONFIG');
  });
});
