import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  readonly agGridEnterpriseLicenseKey: string | null;
  readonly apiBaseUrl: string;
}

declare global {
  interface Window {
    __SEC_CORP_PANEL_CONFIG__?: unknown;
  }
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = Object.freeze({
  agGridEnterpriseLicenseKey: null,
  apiBaseUrl: '/api',
});

export const APP_RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('APP_RUNTIME_CONFIG');

export function readRuntimeConfig(
  candidate: unknown = window.__SEC_CORP_PANEL_CONFIG__,
): RuntimeConfig {
  if (!isRecord(candidate)) {
    return DEFAULT_RUNTIME_CONFIG;
  }

  return Object.freeze({
    agGridEnterpriseLicenseKey: readOptionalNonEmptyString(candidate['agGridEnterpriseLicenseKey']),
    apiBaseUrl:
      readOptionalNonEmptyString(candidate['apiBaseUrl']) ?? DEFAULT_RUNTIME_CONFIG.apiBaseUrl,
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}
