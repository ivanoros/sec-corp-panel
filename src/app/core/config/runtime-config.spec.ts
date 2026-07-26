import { APP_RUNTIME_CONFIG, readRuntimeConfig } from './runtime-config';

describe('readRuntimeConfig', () => {
  it('uses safe defaults for an absent configuration', () => {
    expect(readRuntimeConfig(undefined)).toEqual({
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/api',
    });
  });

  it('normalizes supplied runtime values', () => {
    expect(
      readRuntimeConfig({
        agGridEnterpriseLicenseKey: ' enterprise-license ',
        apiBaseUrl: ' /funding-api ',
      }),
    ).toEqual({
      agGridEnterpriseLicenseKey: 'enterprise-license',
      apiBaseUrl: '/funding-api',
    });
  });

  it('exports a stable injection token', () => {
    expect(APP_RUNTIME_CONFIG.toString()).toContain('APP_RUNTIME_CONFIG');
  });
});
