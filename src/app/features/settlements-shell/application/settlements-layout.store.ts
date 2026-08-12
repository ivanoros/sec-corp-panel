import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type SettlementLayoutHandle = 'leftRail' | 'rightSummary' | 'topRow' | 'totalsRow';

export interface SettlementsLayout {
  readonly leftRailPercent: number;
  readonly rightSummaryPercent: number;
  readonly topRowPercent: number;
  readonly totalsRowPercent: number;
}

export const DEFAULT_SETTLEMENTS_LAYOUT: SettlementsLayout = Object.freeze({
  leftRailPercent: 14,
  rightSummaryPercent: 23,
  topRowPercent: 24,
  totalsRowPercent: 18,
});

export const SETTLEMENTS_LAYOUT_STORAGE_KEY = 'settlements-shell.layout.v1';

@Injectable()
export class SettlementsLayoutStore {
  private readonly document = inject(DOCUMENT);
  private readonly storage = getStorage(this.document.defaultView);
  readonly layout = signal<SettlementsLayout>(this.readPersistedLayout());

  previewResize(
    handle: SettlementLayoutHandle,
    base: SettlementsLayout,
    deltaPercent: number,
  ): void {
    this.layout.set(resizeLayout(base, handle, deltaPercent));
  }

  adjust(handle: SettlementLayoutHandle, deltaPercent: number): void {
    this.layout.update((layout) => resizeLayout(layout, handle, deltaPercent));
    this.persist();
  }

  persist(): void {
    try {
      this.storage?.setItem(SETTLEMENTS_LAYOUT_STORAGE_KEY, JSON.stringify(this.layout()));
    } catch {
      // Storage can be unavailable in hardened browser environments.
    }
  }

  reset(): void {
    this.layout.set(DEFAULT_SETTLEMENTS_LAYOUT);

    try {
      this.storage?.removeItem(SETTLEMENTS_LAYOUT_STORAGE_KEY);
    } catch {
      // The in-memory default remains valid when persistence is unavailable.
    }
  }

  private readPersistedLayout(): SettlementsLayout {
    try {
      const persisted = this.storage?.getItem(SETTLEMENTS_LAYOUT_STORAGE_KEY);

      if (persisted === null || persisted === undefined) {
        return DEFAULT_SETTLEMENTS_LAYOUT;
      }

      const candidate: unknown = JSON.parse(persisted);
      return isSettlementsLayout(candidate)
        ? constrainLayout(candidate)
        : DEFAULT_SETTLEMENTS_LAYOUT;
    } catch {
      return DEFAULT_SETTLEMENTS_LAYOUT;
    }
  }
}

export function resizeLayout(
  base: SettlementsLayout,
  handle: SettlementLayoutHandle,
  deltaPercent: number,
): SettlementsLayout {
  switch (handle) {
    case 'leftRail':
      return constrainLayout({ ...base, leftRailPercent: base.leftRailPercent + deltaPercent });
    case 'rightSummary':
      return constrainLayout({
        ...base,
        rightSummaryPercent: base.rightSummaryPercent - deltaPercent,
      });
    case 'topRow':
      return constrainLayout({ ...base, topRowPercent: base.topRowPercent + deltaPercent });
    case 'totalsRow':
      return constrainLayout({ ...base, totalsRowPercent: base.totalsRowPercent - deltaPercent });
  }
}

function constrainLayout(layout: SettlementsLayout): SettlementsLayout {
  const leftRailPercent = clamp(layout.leftRailPercent, 12, 32);
  const rightSummaryPercent = clamp(layout.rightSummaryPercent, 18, 38);
  const topRowPercent = clamp(layout.topRowPercent, 16, 46);
  const totalsRowPercent = clamp(layout.totalsRowPercent, 12, Math.min(32, 76 - topRowPercent));

  return {
    leftRailPercent,
    rightSummaryPercent: Math.min(rightSummaryPercent, 72 - leftRailPercent),
    topRowPercent,
    totalsRowPercent,
  };
}

function isSettlementsLayout(value: unknown): value is SettlementsLayout {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    Number.isFinite(candidate['leftRailPercent']) &&
    Number.isFinite(candidate['rightSummaryPercent']) &&
    Number.isFinite(candidate['topRowPercent']) &&
    Number.isFinite(candidate['totalsRowPercent'])
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value * 100) / 100));
}

function getStorage(window: Window | null): Storage | null {
  try {
    return window?.localStorage ?? null;
  } catch {
    return null;
  }
}
