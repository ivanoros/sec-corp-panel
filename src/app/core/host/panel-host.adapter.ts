import { inject, Injectable, InjectionToken, signal, type Signal } from '@angular/core';

export type PanelSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

export interface PanelHostState {
  readonly canRefresh: boolean;
  readonly isDirty: boolean;
  readonly saveStatus: PanelSaveStatus;
}

export interface PanelHostAdapter {
  readonly refreshRevision: Signal<number>;
  publishState(state: PanelHostState): void;
  requestRefresh(): void;
}

const INITIAL_PANEL_HOST_STATE: PanelHostState = Object.freeze({
  canRefresh: true,
  isDirty: false,
  saveStatus: 'idle',
});

@Injectable({ providedIn: 'root' })
export class StandalonePanelHostAdapter implements PanelHostAdapter {
  private readonly refreshRevisionState = signal(0);
  private readonly panelState = signal(INITIAL_PANEL_HOST_STATE);

  readonly refreshRevision = this.refreshRevisionState.asReadonly();
  readonly state = this.panelState.asReadonly();

  publishState(state: PanelHostState): void {
    this.panelState.set(state);
  }

  requestRefresh(): void {
    this.refreshRevisionState.update((revision) => revision + 1);
  }
}

export const PANEL_HOST_ADAPTER = new InjectionToken<PanelHostAdapter>('PANEL_HOST_ADAPTER', {
  providedIn: 'root',
  factory: () => inject(StandalonePanelHostAdapter),
});
