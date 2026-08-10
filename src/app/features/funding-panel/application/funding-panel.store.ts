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
  type EditablePeriodId,
  type FundingReport,
  type SaveFundingReportCommand,
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
  readonly userId: string;
}

export interface FundingVersionConflict {
  readonly currentVersion: number | null;
  readonly expectedVersion: number;
}

interface ActiveEdit {
  readonly periodId: EditablePeriodId;
  readonly rawValue: string;
  readonly rowId: string;
  readonly validation: FundingCellValidation;
}

export interface FundingEditableCellAddress {
  readonly periodId: EditablePeriodId;
  readonly rowId: string;
}

export interface FundingSaveConfirmation {
  readonly cells: readonly FundingEditableCellAddress[];
  readonly revision: number;
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
  private readonly calculationRevisionState = signal(0);
  private readonly saveConfirmationState = signal<FundingSaveConfirmation>({
    cells: [],
    revision: 0,
  });
  private readonly errorMessageState = signal<string | null>(null);
  private readonly conflictState = signal<FundingVersionConflict | null>(null);

  private updateRequestActive = false;
  private loadRequestRevision = 0;
  private destroyed = false;
  private lastHostRefreshRevision = this.host.refreshRevision();

  readonly loadStatus = this.loadStatusState.asReadonly();
  readonly saveStatus = this.saveStatusState.asReadonly();
  readonly errorMessage = this.errorMessageState.asReadonly();
  readonly conflict = this.conflictState.asReadonly();
  readonly activeEdit = this.activeEditState.asReadonly();
  readonly calculationRevision = this.calculationRevisionState.asReadonly();
  readonly saveConfirmation = this.saveConfirmationState.asReadonly();
  private readonly hasCommittedEdits = computed(() => hasEdits(this.editsState()));
  readonly isDirty = computed(
    () =>
      this.hasCommittedEdits() ||
      isActiveEditDirty(this.activeEditState(), this.editsState(), this.serverReportState()),
  );
  readonly unsavedChangeCount = computed(() =>
    countUnsavedCells(this.editsState(), this.activeEditState(), this.serverReportState()),
  );
  readonly hasInvalidEdit = computed(() => this.activeEditState()?.validation.isValid === false);
  readonly canUpdate = computed(
    () =>
      this.loadStatusState() === 'ready' &&
      this.isDirty() &&
      !this.hasInvalidEdit() &&
      this.saveStatusState() !== 'saving' &&
      this.saveStatusState() !== 'conflict',
  );
  readonly canRequestRefresh = computed(
    () =>
      this.queryState() !== null &&
      this.loadStatusState() !== 'loading' &&
      !this.hasInvalidEdit() &&
      this.saveStatusState() !== 'saving' &&
      this.saveStatusState() !== 'conflict',
  );
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
          this.serverReportState() ?? report,
        );
  });
  readonly hostState = computed<PanelHostState>(() => ({
    canRefresh:
      this.queryState() !== null &&
      this.loadStatusState() !== 'loading' &&
      !this.isDirty() &&
      !this.hasInvalidEdit() &&
      this.saveStatusState() !== 'saving' &&
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
    if (this.hasCommittedEdits() || this.activeEditState() !== null || this.updateRequestActive) {
      throw new FundingPanelStateError('Cannot replace a report while it has pending edits.');
    }

    this.queryState.set(query);
    this.startLoad(query);
  }

  beginEdit(rowId: string, periodId: EditablePeriodId, rawValue: string): FundingCellValidation {
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

  commitEdit(expectedCell?: FundingEditableCellAddress): boolean {
    const activeEdit = this.activeEditState();

    if (activeEdit === null) {
      return true;
    }

    if (
      expectedCell !== undefined &&
      (activeEdit.rowId !== expectedCell.rowId || activeEdit.periodId !== expectedCell.periodId)
    ) {
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
    const mustPreserveExplicitIntent = this.updateRequestActive;
    const currentEdits = this.editsState();
    const nextEdits =
      !mustPreserveExplicitIntent && serverValue === activeEdit.validation.value
        ? removeEdit(currentEdits, activeEdit.rowId, activeEdit.periodId)
        : setEdit(currentEdits, activeEdit.rowId, activeEdit.periodId, activeEdit.validation.value);

    this.editsState.set(nextEdits);
    this.activeEditState.set(null);
    this.errorMessageState.set(null);

    if (nextEdits !== currentEdits) {
      this.calculationRevisionState.update((revision) => revision + 1);
    }

    if (!hasEdits(nextEdits)) {
      this.saveStatusState.set('idle');
    }

    return true;
  }

  cancelEdit(): void {
    this.activeEditState.set(null);
  }

  requestRefresh(): boolean {
    if (!this.canRequestRefresh()) {
      return false;
    }

    if (this.activeEditState() !== null && !this.commitEdit()) {
      return false;
    }

    if (this.hasCommittedEdits()) {
      return false;
    }

    const query = this.queryState();

    if (query === null) {
      return false;
    }

    this.startLoad(query);
    return true;
  }

  updateReport(): boolean {
    if (this.activeEditState() !== null && !this.commitEdit()) {
      return false;
    }

    if (!this.canUpdate() || this.updateRequestActive) {
      return false;
    }

    const report = this.report();
    const query = this.queryState();

    if (report === null || query === null) {
      return false;
    }

    this.updateRequestActive = true;
    this.saveStatusState.set('saving');
    this.errorMessageState.set(null);
    void this.performUpdate(report, query.userId, toDirtyCellAddresses(this.editsState()));
    return true;
  }

  retrySave(): boolean {
    if (this.saveStatusState() !== 'error' || !this.hasCommittedEdits()) {
      return false;
    }

    this.errorMessageState.set(null);
    return this.updateReport();
  }

  discardChangesAndRefresh(): boolean {
    const query = this.queryState();

    if (query === null || this.updateRequestActive) {
      return false;
    }

    this.activeEditState.set(null);
    this.editsState.set(EMPTY_EDITS);
    this.conflictState.set(null);
    this.errorMessageState.set(null);
    this.saveStatusState.set('idle');
    this.startLoad(query);
    return true;
  }

  private updateActiveEdit(
    rowId: string,
    periodId: EditablePeriodId,
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
          .getReport(query.panelCode, query.businessDate, query.userId)
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

  private async performUpdate(
    report: FundingReport,
    userId: string,
    submittedCells: readonly FundingEditableCellAddress[],
  ): Promise<void> {
    try {
      const savedReport = await firstValueFrom(
        this.gateway
          .putReport(toSaveCommand(report, userId))
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );

      if (this.destroyed) {
        return;
      }

      this.serverReportState.set(savedReport);
      const rebasedEdits = rebaseEdits(this.editsState(), savedReport);
      const confirmedCells = submittedCells.filter(
        ({ periodId, rowId }) => rebasedEdits[rowId]?.[periodId] === undefined,
      );

      this.editsState.set(rebasedEdits);

      if (confirmedCells.length > 0) {
        this.saveConfirmationState.update(({ revision }) => ({
          cells: confirmedCells,
          revision: revision + 1,
        }));
      }

      this.conflictState.set(null);
      this.saveStatusState.set(this.hasCommittedEdits() ? 'idle' : 'saved');
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
    } finally {
      this.updateRequestActive = false;
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

function toSaveCommand(report: FundingReport, userId: string): SaveFundingReportCommand {
  return {
    schemaVersion: 1,
    expectedVersion: report.version,
    userId,
    report,
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
  periodId: EditablePeriodId,
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
  periodId: EditablePeriodId,
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
      const editablePeriodId = periodId as EditablePeriodId;
      const savedValue = findCellValue(savedReport, rowId, editablePeriodId);

      return value === savedValue
        ? currentEdits
        : setEdit(currentEdits, rowId, editablePeriodId, value);
    }, rebasedEdits);
  }, EMPTY_EDITS);
}

function findCellValue(
  report: FundingReport | null,
  rowId: string,
  periodId: EditablePeriodId,
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

function countUnsavedCells(
  edits: DirtyFundingCells,
  activeEdit: ActiveEdit | null,
  serverReport: FundingReport | null,
): number {
  const committedCount = Object.values(edits).reduce(
    (count, rowEdits) => count + Object.keys(rowEdits).length,
    0,
  );

  if (
    !isActiveEditDirty(activeEdit, edits, serverReport) ||
    activeEdit === null ||
    edits[activeEdit.rowId]?.[activeEdit.periodId] !== undefined
  ) {
    return committedCount;
  }

  return committedCount + 1;
}

function toDirtyCellAddresses(edits: DirtyFundingCells): readonly FundingEditableCellAddress[] {
  return Object.entries(edits).flatMap(([rowId, rowEdits]) =>
    Object.keys(rowEdits).map((periodId) => ({
      periodId: periodId as EditablePeriodId,
      rowId,
    })),
  );
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
