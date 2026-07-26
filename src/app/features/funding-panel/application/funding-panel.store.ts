import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { PANEL_HOST_ADAPTER, type PanelHostState } from '../../../core/host/panel-host.adapter';
import {
  FUNDING_PANEL_GATEWAY,
  FundingPanelVersionConflictError,
} from '../data-access/funding-panel.gateway';
import type { DecimalString } from '../domain/decimal-value';
import {
  selectSnapshotValues,
  type FundingReport,
  type SaveFundingReportCommand,
  type SnapshotPeriodId,
} from '../domain/funding-report';
import { recalculateFundingReport } from '../domain/report-calculator';
import {
  toFundingGridViewModel,
  type ActiveFundingCell,
  type DirtyFundingCells,
} from '../presentation/funding-grid.viewmodel';
import { validateFundingCellInput, type FundingCellValidation } from './funding-cell-editor';

export type FundingLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FundingReportQuery {
  readonly businessDate: string;
  readonly panelCode: string;
}

export interface FundingVersionConflict {
  readonly currentVersion: number | null;
  readonly expectedVersion: number;
}

interface ActiveEdit {
  readonly periodId: SnapshotPeriodId;
  readonly rawValue: string;
  readonly rowId: string;
  readonly validation: FundingCellValidation;
}

const EMPTY_EDITS: DirtyFundingCells = Object.freeze({});

@Injectable()
export class FundingPanelStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly gateway = inject(FUNDING_PANEL_GATEWAY);
  private readonly host = inject(PANEL_HOST_ADAPTER);

  private readonly serverReportState = signal<FundingReport | null>(null);
  private readonly editsState = signal<DirtyFundingCells>(EMPTY_EDITS);
  private readonly activeEditState = signal<ActiveEdit | null>(null);
  private readonly queryState = signal<FundingReportQuery | null>(null);
  private readonly loadStatusState = signal<FundingLoadStatus>('idle');
  private readonly saveStatusState = signal<PanelHostState['saveStatus']>('idle');
  private readonly errorMessageState = signal<string | null>(null);
  private readonly conflictState = signal<FundingVersionConflict | null>(null);
  private readonly refreshPendingState = signal(false);

  private saveLoopActive = false;
  private loadRequestRevision = 0;
  private destroyed = false;
  private lastHostRefreshRevision = this.host.refreshRevision();

  readonly loadStatus = this.loadStatusState.asReadonly();
  readonly saveStatus = this.saveStatusState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly conflict = this.conflictState.asReadonly();
  readonly activeEdit = this.activeEditState.asReadonly();
  private readonly hasCommittedEdits = computed(() => hasEdits(this.editsState()));
  readonly isDirty = computed(
    () =>
      this.hasCommittedEdits() ||
      isActiveEditDirty(this.activeEditState(), this.editsState(), this.serverReportState()),
  );
  readonly hasInvalidEdit = computed(() => this.activeEditState()?.validation.isValid === false);
  readonly report = computed(() => {
    const serverReport = this.serverReportState();

    if (serverReport === null) {
      return null;
    }

    return buildPreviewReport(serverReport, this.editsState(), this.activeEditState());
  });
  readonly viewModel = computed(() => {
    const report = this.report();

    return report === null
      ? null
      : toFundingGridViewModel(
          report,
          this.editsState(),
          toActiveFundingCell(this.activeEditState()),
        );
  });
  readonly hostState = computed<PanelHostState>(() => ({
    canRefresh:
      this.loadStatusState() !== 'loading' &&
      !this.hasInvalidEdit() &&
      this.saveStatusState() !== 'error' &&
      this.saveStatusState() !== 'conflict',
    isDirty: this.isDirty(),
    saveStatus: this.saveStatusState(),
  }));

  constructor() {
    effect(() => {
      this.host.publishState(this.hostState());
    });

    effect(() => {
      const revision = this.host.refreshRevision();

      untracked(() => {
        if (revision === this.lastHostRefreshRevision) {
          return;
        }

        this.lastHostRefreshRevision = revision;
        this.requestRefresh();
      });
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
  }

  load(query: FundingReportQuery): void {
    if (this.hasCommittedEdits() || this.activeEditState() !== null || this.saveLoopActive) {
      throw new FundingPanelStateError('Cannot replace a report while it has pending edits.');
    }

    this.queryState.set(query);
    this.startLoad(query);
  }

  beginEdit(rowId: string, periodId: SnapshotPeriodId, rawValue: string): FundingCellValidation {
    const report = this.serverReportState();
    const row = report?.rows.find(({ id }) => id === rowId);
    const period = report?.periods.find(({ id }) => id === periodId);

    if (
      report === null ||
      row?.valueMode !== 'input' ||
      period?.editable !== true ||
      !report.permissions.canEdit ||
      !report.permissions.canSave
    ) {
      throw new FundingPanelStateError(`${rowId}.${periodId} is read-only.`);
    }

    return this.updateActiveEdit(rowId, periodId, rawValue);
  }

  previewEdit(rawValue: string): FundingCellValidation {
    const activeEdit = this.activeEditState();

    if (activeEdit === null) {
      throw new FundingPanelStateError('No funding cell is being edited.');
    }

    return this.updateActiveEdit(activeEdit.rowId, activeEdit.periodId, rawValue);
  }

  commitEdit(): boolean {
    const activeEdit = this.activeEditState();

    if (activeEdit === null) {
      return true;
    }

    if (!activeEdit.validation.isValid) {
      return false;
    }

    const serverValue = findCellValue(
      this.serverReportState(),
      activeEdit.rowId,
      activeEdit.periodId,
    );
    const mustPreserveExplicitIntent = this.saveLoopActive;
    const nextEdits =
      !mustPreserveExplicitIntent && serverValue === activeEdit.validation.value
        ? removeEdit(this.editsState(), activeEdit.rowId, activeEdit.periodId)
        : setEdit(
            this.editsState(),
            activeEdit.rowId,
            activeEdit.periodId,
            activeEdit.validation.value,
          );

    this.editsState.set(nextEdits);
    this.activeEditState.set(null);
    this.errorMessageState.set(null);

    if (hasEdits(nextEdits)) {
      this.queueSave();
    } else {
      this.saveStatusState.set('idle');
      this.completePendingRefresh();
    }

    return true;
  }

  cancelEdit(): void {
    this.activeEditState.set(null);
  }

  requestRefresh(): boolean {
    if (this.activeEditState() !== null && !this.commitEdit()) {
      return false;
    }

    if (this.saveStatusState() === 'error' || this.saveStatusState() === 'conflict') {
      return false;
    }

    if (this.hasCommittedEdits() || this.saveLoopActive) {
      this.refreshPendingState.set(true);
      this.queueSave();
      return true;
    }

    const query = this.queryState();

    if (query === null) {
      return false;
    }

    this.startLoad(query);
    return true;
  }

  retrySave(): boolean {
    if (this.saveStatusState() !== 'error' || !this.hasCommittedEdits()) {
      return false;
    }

    this.errorMessageState.set(null);
    this.queueSave();
    return true;
  }

  discardChangesAndRefresh(): boolean {
    const query = this.queryState();

    if (query === null || this.saveLoopActive) {
      return false;
    }

    this.activeEditState.set(null);
    this.editsState.set(EMPTY_EDITS);
    this.conflictState.set(null);
    this.errorMessageState.set(null);
    this.saveStatusState.set('idle');
    this.refreshPendingState.set(false);
    this.startLoad(query);
    return true;
  }

  private updateActiveEdit(
    rowId: string,
    periodId: SnapshotPeriodId,
    rawValue: string,
  ): FundingCellValidation {
    const validation = validateFundingCellInput(rawValue);

    this.activeEditState.set({
      periodId,
      rawValue,
      rowId,
      validation,
    });

    return validation;
  }

  private startLoad(query: FundingReportQuery): void {
    const requestRevision = ++this.loadRequestRevision;

    this.loadStatusState.set('loading');
    this.errorMessageState.set(null);
    void this.performLoad(query, requestRevision);
  }

  private async performLoad(query: FundingReportQuery, requestRevision: number): Promise<void> {
    try {
      const report = await firstValueFrom(
        this.gateway
          .getReport(query.panelCode, query.businessDate)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );

      if (this.destroyed || requestRevision !== this.loadRequestRevision) {
        return;
      }

      this.serverReportState.set(report);
      this.editsState.set(EMPTY_EDITS);
      this.activeEditState.set(null);
      this.loadStatusState.set('ready');
      this.saveStatusState.set('idle');
      this.conflictState.set(null);
      this.errorMessageState.set(null);
    } catch (error: unknown) {
      if (this.destroyed || requestRevision !== this.loadRequestRevision) {
        return;
      }

      this.loadStatusState.set('error');
      this.errorMessageState.set(toErrorMessage(error, 'Unable to load the funding report.'));
    }
  }

  private queueSave(): void {
    if (this.saveLoopActive || !this.hasCommittedEdits()) {
      return;
    }

    this.saveLoopActive = true;
    void this.drainSaveQueue();
  }

  private async drainSaveQueue(): Promise<void> {
    try {
      while (!this.destroyed && this.hasCommittedEdits() && this.saveStatusState() !== 'conflict') {
        const report = this.report();

        if (report === null) {
          throw new FundingPanelStateError('Cannot save before a report is loaded.');
        }

        this.saveStatusState.set('saving');
        this.errorMessageState.set(null);

        try {
          const savedReport = await firstValueFrom(
            this.gateway.putReport(toSaveCommand(report)).pipe(takeUntilDestroyed(this.destroyRef)),
          );

          if (this.destroyed) {
            return;
          }

          this.serverReportState.set(savedReport);
          this.editsState.update((edits) => rebaseEdits(edits, savedReport));
          this.conflictState.set(null);
          this.saveStatusState.set(this.hasCommittedEdits() ? 'saving' : 'saved');
        } catch (error: unknown) {
          if (this.destroyed) {
            return;
          }

          if (error instanceof FundingPanelVersionConflictError) {
            this.conflictState.set({
              currentVersion: error.currentVersion,
              expectedVersion: error.expectedVersion,
            });
            this.saveStatusState.set('conflict');
            this.errorMessageState.set(error.message);
          } else {
            this.saveStatusState.set('error');
            this.errorMessageState.set(toErrorMessage(error, 'Unable to save the funding report.'));
          }

          return;
        }
      }
    } finally {
      this.saveLoopActive = false;
      this.completePendingRefresh();
    }
  }

  private completePendingRefresh(): void {
    if (
      !this.refreshPendingState() ||
      this.hasCommittedEdits() ||
      this.saveStatusState() === 'error' ||
      this.saveStatusState() === 'conflict'
    ) {
      return;
    }

    const query = this.queryState();

    if (query !== null) {
      this.refreshPendingState.set(false);
      this.startLoad(query);
    }
  }
}

function buildPreviewReport(
  serverReport: FundingReport,
  edits: DirtyFundingCells,
  activeEdit: ActiveEdit | null,
): FundingReport {
  let overlay = edits;

  if (activeEdit?.validation.isValid === true) {
    overlay = setEdit(overlay, activeEdit.rowId, activeEdit.periodId, activeEdit.validation.value);
  }

  if (!hasEdits(overlay)) {
    return serverReport;
  }

  return recalculateFundingReport({
    ...serverReport,
    rows: serverReport.rows.map((row) => {
      const rowEdits = overlay[row.id];

      return rowEdits === undefined
        ? row
        : {
            ...row,
            values: {
              ...row.values,
              ...rowEdits,
            },
          };
    }),
  });
}

function toSaveCommand(report: FundingReport): SaveFundingReportCommand {
  return {
    schemaVersion: 1,
    reportId: report.reportId,
    panelCode: report.panelCode,
    businessDate: report.businessDate,
    expectedVersion: report.version,
    snapshotValues: selectSnapshotValues(report),
  };
}

function toActiveFundingCell(activeEdit: ActiveEdit | null): ActiveFundingCell | null {
  return activeEdit === null
    ? null
    : {
        periodId: activeEdit.periodId,
        rowId: activeEdit.rowId,
        validationMessage: activeEdit.validation.message,
      };
}

function setEdit(
  edits: DirtyFundingCells,
  rowId: string,
  periodId: SnapshotPeriodId,
  value: DecimalString,
): DirtyFundingCells {
  return {
    ...edits,
    [rowId]: {
      ...edits[rowId],
      [periodId]: value,
    },
  };
}

function removeEdit(
  edits: DirtyFundingCells,
  rowId: string,
  periodId: SnapshotPeriodId,
): DirtyFundingCells {
  const rowEdits = edits[rowId];

  if (rowEdits === undefined || rowEdits[periodId] === undefined) {
    return edits;
  }

  const nextRowEdits = { ...rowEdits };
  delete nextRowEdits[periodId];

  const nextEdits = { ...edits };

  if (Object.keys(nextRowEdits).length === 0) {
    delete nextEdits[rowId];
  } else {
    nextEdits[rowId] = nextRowEdits;
  }

  return nextEdits;
}

function rebaseEdits(edits: DirtyFundingCells, savedReport: FundingReport): DirtyFundingCells {
  return Object.entries(edits).reduce<DirtyFundingCells>((rebasedEdits, [rowId, rowEdits]) => {
    return Object.entries(rowEdits).reduce<DirtyFundingCells>((currentEdits, [periodId, value]) => {
      const snapshotPeriodId = periodId as SnapshotPeriodId;
      const savedValue = findCellValue(savedReport, rowId, snapshotPeriodId);

      return value === savedValue
        ? currentEdits
        : setEdit(currentEdits, rowId, snapshotPeriodId, value);
    }, rebasedEdits);
  }, EMPTY_EDITS);
}

function findCellValue(
  report: FundingReport | null,
  rowId: string,
  periodId: SnapshotPeriodId,
): DecimalString | null {
  const value = report?.rows.find(({ id }) => id === rowId)?.values[periodId];
  return value ?? null;
}

function isActiveEditDirty(
  activeEdit: ActiveEdit | null,
  edits: DirtyFundingCells,
  serverReport: FundingReport | null,
): boolean {
  if (activeEdit === null) {
    return false;
  }

  if (!activeEdit.validation.isValid) {
    return true;
  }

  const committedValue =
    edits[activeEdit.rowId]?.[activeEdit.periodId] ??
    findCellValue(serverReport, activeEdit.rowId, activeEdit.periodId);

  return activeEdit.validation.value !== committedValue;
}

function hasEdits(edits: DirtyFundingCells): boolean {
  return Object.keys(edits).length > 0;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}

export class FundingPanelStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FundingPanelStateError';
  }
}
