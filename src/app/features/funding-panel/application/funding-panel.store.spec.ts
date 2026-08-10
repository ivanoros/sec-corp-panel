import { TestBed } from '@angular/core/testing';
import { Subject, type Observable } from 'rxjs';

import {
  PANEL_HOST_ADAPTER,
  StandalonePanelHostAdapter,
} from '../../../core/host/panel-host.adapter';
import {
  FUNDING_PANEL_GATEWAY,
  type FundingPanelGateway,
  FundingPanelVersionConflictError,
} from '../data-access/funding-panel.gateway';
import {
  type FundingReport,
  type FundingRow,
  type SaveFundingReportCommand,
} from '../domain/funding-report';
import { recalculateFundingReport } from '../domain/report-calculator';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import { FundingPanelStore } from './funding-panel.store';

describe('FundingPanelStore', () => {
  let gateway: ControllableFundingPanelGateway;
  let host: StandalonePanelHostAdapter;
  let store: FundingPanelStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FundingPanelStore,
        ControllableFundingPanelGateway,
        StandalonePanelHostAdapter,
        {
          provide: FUNDING_PANEL_GATEWAY,
          useExisting: ControllableFundingPanelGateway,
        },
        {
          provide: PANEL_HOST_ADAPTER,
          useExisting: StandalonePanelHostAdapter,
        },
      ],
    });

    gateway = TestBed.inject(ControllableFundingPanelGateway);
    host = TestBed.inject(StandalonePanelHostAdapter);
    store = TestBed.inject(FundingPanelStore);
    store.load({ panelCode: 'sec-corp', businessDate: '2026-07-25', userId: 'e70165' });
    gateway.resolveGet(createSecCorpReportFixture());
  });

  it('previews calculated totals while a valid editor value is still active', async () => {
    await waitForReady(store);

    expect(store.unsavedChangeCount()).toBe(0);
    expect(store.calculationRevision()).toBe(0);

    store.beginEdit('occ', 'snapshot0830', '-300,000,000');

    expect(findRow(store.report(), 'totalMargin').values.snapshot0830).toBe('-210403134.64');
    expect(findRow(store.report(), 'endOfDay').values.snapshot0830).toBe('4811063538.31');
    expect(store.isDirty()).toBe(true);
    expect(store.unsavedChangeCount()).toBe(1);
    expect(gateway.putCommands).toHaveLength(0);

    expect(store.commitEdit()).toBe(true);
    expect(store.unsavedChangeCount()).toBe(1);
    expect(store.calculationRevision()).toBe(1);
    expect(gateway.putCommands).toHaveLength(0);
    expect(store.saveStatus()).toBe('idle');
    expect(store.canUpdate()).toBe(true);

    expect(store.updateReport()).toBe(true);
    expect(gateway.putCommands).toHaveLength(1);
    expect(gateway.putCommands[0]?.userId).toBe('e70165');
    expect(store.saveStatus()).toBe('saving');
  });

  it('does not commit a newly opened cell when an earlier editor finishes late', async () => {
    await waitForReady(store);

    store.beginEdit('nscc', 'snapshot1130', '123');

    expect(
      store.commitEdit({
        rowId: 'nscc',
        periodId: 'snapshot0830',
      }),
    ).toBe(true);
    expect(store.activeEdit()?.periodId).toBe('snapshot1130');
    expect(store.isDirty()).toBe(true);

    expect(
      store.commitEdit({
        rowId: 'nscc',
        periodId: 'snapshot1130',
      }),
    ).toBe(true);
    expect(store.activeEdit()).toBeNull();
    expect(findRow(store.report(), 'nscc').values.snapshot1130).toBe('123.00');
  });

  it('edits Opps funding, previews totals, and includes the value in the full Update report', async () => {
    await waitForReady(store);

    const originalTotal = findRow(store.report(), 'totalMargin').values.opportunityFunding;

    store.beginEdit('occ', 'opportunityFunding', '-290000000');

    expect(findRow(store.report(), 'occ').values.opportunityFunding).toBe('-290000000.00');
    expect(findRow(store.report(), 'totalMargin').values.opportunityFunding).not.toBe(
      originalTotal,
    );
    expect(gateway.putCommands).toHaveLength(0);

    expect(store.commitEdit()).toBe(true);
    expect(store.updateReport()).toBe(true);
    expect(findRow(gateway.putCommands[0]?.report ?? null, 'occ').values.opportunityFunding).toBe(
      '-290000000.00',
    );
    expect(gateway.putCommands[0]?.report.rows).toHaveLength(37);
  });

  it('keeps invalid input active and blocks save and refresh', async () => {
    await waitForReady(store);

    const validation = store.beginEdit('occ', 'snapshot0830', '12.345');

    expect(validation.isValid).toBe(false);
    expect(store.commitEdit()).toBe(false);
    expect(store.updateReport()).toBe(false);
    expect(store.requestRefresh()).toBe(false);
    expect(store.hostState().canRefresh).toBe(false);
    expect(gateway.putCommands).toHaveLength(0);
  });

  it('saves only on Update and leaves changes made during the PUT for the next Update', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    expect(store.updateReport()).toBe(true);
    store.beginEdit('nscc', 'snapshot1130', '30000000');
    store.commitEdit();

    expect(gateway.putCommands).toHaveLength(1);

    gateway.resolvePut(savedReport(gateway.putCommands[0], 18));
    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('idle');
    });

    expect(store.saveConfirmation()).toEqual({
      cells: [{ periodId: 'snapshot0830', rowId: 'occ' }],
      revision: 1,
    });
    expect(gateway.putCommands).toHaveLength(1);
    expect(store.isDirty()).toBe(true);
    expect(store.updateReport()).toBe(true);

    expect(gateway.putCommands[1]?.expectedVersion).toBe(18);
    expect(findRow(gateway.putCommands[1]?.report ?? null, 'occ').values.snapshot0830).toBe(
      '-300000000.00',
    );
    expect(findRow(gateway.putCommands[1]?.report ?? null, 'nscc').values.snapshot1130).toBe(
      '30000000.00',
    );

    gateway.resolvePut(savedReport(gateway.putCommands[1], 19));
    await vi.waitFor(() => {
      expect(store.isDirty()).toBe(false);
      expect(store.saveStatus()).toBe('saved');
      expect(store.report()?.version).toBe(19);
    });
    expect(store.saveConfirmation()).toEqual({
      cells: [{ periodId: 'snapshot1130', rowId: 'nscc' }],
      revision: 2,
    });
  });

  it('preserves a user revert made while the earlier value is saving', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    expect(store.updateReport()).toBe(true);
    store.beginEdit('occ', 'snapshot0830', '-308824714.48');
    store.commitEdit();

    gateway.resolvePut(savedReport(gateway.putCommands[0], 18));
    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('idle');
    });

    expect(gateway.putCommands).toHaveLength(1);
    expect(store.updateReport()).toBe(true);
    expect(findRow(gateway.putCommands[1]?.report ?? null, 'occ').values.snapshot0830).toBe(
      '-308824714.48',
    );
  });

  it('retains dirty work on a version conflict until the user explicitly discards it', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    store.updateReport();
    gateway.rejectPut(new FundingPanelVersionConflictError(17, 18));

    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('conflict');
    });

    expect(store.conflict()).toEqual({ expectedVersion: 17, currentVersion: 18 });
    expect(store.isDirty()).toBe(true);
    expect(store.requestRefresh()).toBe(false);
    expect(store.hostState().canRefresh).toBe(false);

    expect(store.discardChangesAndRefresh()).toBe(true);
    expect(gateway.getCalls).toHaveLength(2);
  });

  it('does not save implicitly and requires dirty work to be discarded before refresh', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();

    expect(store.requestRefresh()).toBe(false);
    expect(gateway.putCommands).toHaveLength(0);
    expect(gateway.getCalls).toHaveLength(1);

    expect(store.discardChangesAndRefresh()).toBe(true);
    expect(gateway.getCalls).toHaveLength(2);
  });

  it('retrieves the same business date when the shell requests a manual refresh', async () => {
    await waitForReady(store);

    host.requestRefresh();

    await vi.waitFor(() => {
      expect(gateway.getCalls).toEqual([
        { panelCode: 'sec-corp', businessDate: '2026-07-25', userId: 'e70165' },
        { panelCode: 'sec-corp', businessDate: '2026-07-25', userId: 'e70165' },
      ]);
    });
  });

  it('rejects duplicate refresh requests while a load is already in progress', async () => {
    await waitForReady(store);

    host.requestRefresh();
    await vi.waitFor(() => {
      expect(gateway.getCalls).toHaveLength(2);
    });

    expect(store.requestRefresh()).toBe(false);
    expect(store.hostState().canRefresh).toBe(false);
    expect(gateway.getCalls).toHaveLength(2);

    gateway.resolveGet(createSecCorpReportFixture());
    await waitForReady(store);
  });

  it('allows a failed manual load to be retried without losing the active query', async () => {
    await waitForReady(store);

    host.requestRefresh();
    await vi.waitFor(() => {
      expect(gateway.getCalls).toHaveLength(2);
    });
    gateway.rejectGet(new Error('Funding service is unavailable.'));

    await vi.waitFor(() => {
      expect(store.loadStatus()).toBe('error');
    });

    expect(store.errorMessage()).toBe('Funding service is unavailable.');
    expect(store.hostState().canRefresh).toBe(true);
    expect(store.requestRefresh()).toBe(true);
    expect(gateway.getCalls[2]).toEqual({
      panelCode: 'sec-corp',
      businessDate: '2026-07-25',
      userId: 'e70165',
    });

    gateway.resolveGet(createSecCorpReportFixture());
    await waitForReady(store);
  });

  it('retains dirty work after a transient save failure and retries the same version', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    store.updateReport();
    gateway.rejectPut(new Error('Funding service is unavailable.'));

    await vi.waitFor(() => {
      expect(store.saveStatus()).toBe('error');
    });

    expect(store.isDirty()).toBe(true);
    expect(store.errorMessage()).toBe('Funding service is unavailable.');
    expect(store.requestRefresh()).toBe(false);
    expect(store.retrySave()).toBe(true);
    expect(gateway.putCommands).toHaveLength(2);
    expect(gateway.putCommands[1]?.expectedVersion).toBe(17);

    gateway.resolvePut(savedReport(gateway.putCommands[1], 18));
    await vi.waitFor(() => {
      expect(store.isDirty()).toBe(false);
      expect(store.saveStatus()).toBe('saved');
    });
  });
});

class ControllableFundingPanelGateway implements FundingPanelGateway {
  readonly getCalls: FundingReportQueryCall[] = [];
  readonly putCommands: SaveFundingReportCommand[] = [];
  private readonly getResponses: Subject<FundingReport>[] = [];
  private readonly putResponses: Subject<FundingReport>[] = [];

  getReport(panelCode: string, businessDate: string, userId: string): Observable<FundingReport> {
    const response = new Subject<FundingReport>();
    this.getCalls.push({ panelCode, businessDate, userId });
    this.getResponses.push(response);
    return response;
  }

  putReport(command: SaveFundingReportCommand): Observable<FundingReport> {
    const response = new Subject<FundingReport>();
    this.putCommands.push(command);
    this.putResponses.push(response);
    return response;
  }

  resolveGet(report: FundingReport): void {
    requireSubject(this.getResponses, 'GET').next(report);
    this.getResponses.shift();
  }

  rejectGet(error: Error): void {
    requireSubject(this.getResponses, 'GET').error(error);
    this.getResponses.shift();
  }

  resolvePut(report: FundingReport): void {
    requireSubject(this.putResponses, 'PUT').next(report);
    this.putResponses.shift();
  }

  rejectPut(error: Error): void {
    requireSubject(this.putResponses, 'PUT').error(error);
    this.putResponses.shift();
  }
}

interface FundingReportQueryCall {
  readonly businessDate: string;
  readonly panelCode: string;
  readonly userId: string;
}

async function waitForReady(store: FundingPanelStore): Promise<void> {
  await vi.waitFor(() => {
    expect(store.loadStatus()).toBe('ready');
  });
}

function savedReport(
  command: SaveFundingReportCommand | undefined,
  version: number,
): FundingReport {
  if (command === undefined) {
    throw new Error('Missing save command.');
  }

  return recalculateFundingReport({
    ...command.report,
    asOf: `2026-07-25T14:00:${String(version).padStart(2, '0')}-04:00`,
    version,
    userId: command.userId,
  });
}

function findRow(report: FundingReport | null, rowId: string): FundingRow {
  const row = report?.rows.find(({ id }) => id === rowId);

  if (row === undefined) {
    throw new Error(`Missing row ${rowId}.`);
  }

  return row;
}

function requireSubject(
  subjects: readonly Subject<FundingReport>[],
  requestType: string,
): Subject<FundingReport> {
  const subject = subjects[0];

  if (subject === undefined) {
    throw new Error(`No pending ${requestType} request.`);
  }

  return subject;
}
