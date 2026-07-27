import { InjectionToken } from '@angular/core';

export type FundingPanelDataSource = 'http' | 'mock';

export interface RuntimeConfig {
  readonly agGridEnterpriseLicenseKey: string | null;
  readonly apiBaseUrl: string;
  readonly businessDate: string;
  readonly fundingPanelDataSource: FundingPanelDataSource;
}

declare global {
  interface Window {
    __FUNDING_PANEL_CONFIG__?: unknown;
    __SEC_CORP_PANEL_CONFIG__?: unknown;
  }
}

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = Object.freeze({
  agGridEnterpriseLicenseKey: null,
  apiBaseUrl: '/api',
  businessDate: '2026-07-25',
  fundingPanelDataSource: 'mock',
});

export const APP_RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('APP_RUNTIME_CONFIG');

export function readRuntimeConfig(
  candidate: unknown = window.__FUNDING_PANEL_CONFIG__ ?? window.__SEC_CORP_PANEL_CONFIG__,
): RuntimeConfig {
  if (!isRecord(candidate)) {
    return DEFAULT_RUNTIME_CONFIG;
  }

  return Object.freeze({
    agGridEnterpriseLicenseKey: readOptionalNonEmptyString(candidate['agGridEnterpriseLicenseKey']),
    apiBaseUrl:
      readOptionalNonEmptyString(candidate['apiBaseUrl']) ?? DEFAULT_RUNTIME_CONFIG.apiBaseUrl,
    businessDate:
      readIsoBusinessDate(candidate['businessDate']) ?? DEFAULT_RUNTIME_CONFIG.businessDate,
    fundingPanelDataSource:
      readFundingPanelDataSource(candidate['fundingPanelDataSource']) ??
      DEFAULT_RUNTIME_CONFIG.fundingPanelDataSource,
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

function readFundingPanelDataSource(value: unknown): FundingPanelDataSource | null {
  return value === 'http' || value === 'mock' ? value : null;
}

function readIsoBusinessDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : null;
}
