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
    store = TestBed.inject(FundingPanelStore);
    store.load({ panelCode: 'sec-corp', businessDate: '2026-07-25' });
    gateway.resolveGet(createSecCorpReportFixture());
  });

  it('previews calculated totals while a valid editor value is still active', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300,000,000');

    expect(findRow(store.report(), 'total-margin').values.snapshot0830).toBe('-210403134.64');
    expect(findRow(store.report(), 'end-of-day').values.snapshot0830).toBe('4811063538.31');
    expect(store.isDirty()).toBe(true);
    expect(gateway.putCommands).toHaveLength(0);

    expect(store.commitEdit()).toBe(true);
    expect(gateway.putCommands).toHaveLength(1);
    expect(store.saveStatus()).toBe('saving');
  });

  it('keeps invalid input active and blocks save and refresh', async () => {
    await waitForReady(store);

    const validation = store.beginEdit('occ', 'snapshot0830', '12.345');

    expect(validation.isValid).toBe(false);
    expect(store.commitEdit()).toBe(false);
    expect(store.requestRefresh()).toBe(false);
    expect(store.hostState().canRefresh).toBe(false);
    expect(gateway.putCommands).toHaveLength(0);
  });

  it('serializes saves and coalesces edits made during an in-flight PUT', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    store.beginEdit('nscc', 'snapshot1130', '30000000');
    store.commitEdit();

    expect(gateway.putCommands).toHaveLength(1);

    gateway.resolvePut(savedReport(gateway.putCommands[0], 18));
    await waitForPutCount(gateway, 2);

    expect(gateway.putCommands[1]?.expectedVersion).toBe(18);
    expect(gateway.putCommands[1]?.snapshotValues['occ']?.snapshot0830).toBe('-300000000.00');
    expect(gateway.putCommands[1]?.snapshotValues['nscc']?.snapshot1130).toBe('30000000.00');

    gateway.resolvePut(savedReport(gateway.putCommands[1], 19));
    await vi.waitFor(() => {
      expect(store.isDirty()).toBe(false);
      expect(store.saveStatus()).toBe('saved');
      expect(store.report()?.version).toBe(19);
    });
  });

  it('preserves a user revert made while the earlier value is saving', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
    store.beginEdit('occ', 'snapshot0830', '-308824714.48');
    store.commitEdit();

    gateway.resolvePut(savedReport(gateway.putCommands[0], 18));
    await waitForPutCount(gateway, 2);

    expect(gateway.putCommands[1]?.snapshotValues['occ']?.snapshot0830).toBe('-308824714.48');
  });

  it('retains dirty work on a version conflict until the user explicitly discards it', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();
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

  it('delays manual refresh until a pending valid save completes', async () => {
    await waitForReady(store);

    store.beginEdit('occ', 'snapshot0830', '-300000000');
    store.commitEdit();

    expect(store.requestRefresh()).toBe(true);
    expect(gateway.getCalls).toHaveLength(1);

    gateway.resolvePut(savedReport(gateway.putCommands[0], 18));

    await vi.waitFor(() => {
      expect(gateway.getCalls).toHaveLength(2);
    });
  });
});

class ControllableFundingPanelGateway implements FundingPanelGateway {
  readonly getCalls: FundingReportQueryCall[] = [];
  readonly putCommands: SaveFundingReportCommand[] = [];
  private readonly getResponses: Subject<FundingReport>[] = [];
  private readonly putResponses: Subject<FundingReport>[] = [];

  getReport(panelCode: string, businessDate: string): Observable<FundingReport> {
    const response = new Subject<FundingReport>();
    this.getCalls.push({ panelCode, businessDate });
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
}

async function waitForReady(store: FundingPanelStore): Promise<void> {
  await vi.waitFor(() => {
    expect(store.loadStatus()).toBe('ready');
  });
}

async function waitForPutCount(
  gateway: ControllableFundingPanelGateway,
  expectedCount: number,
): Promise<void> {
  await vi.waitFor(() => {
    expect(gateway.putCommands).toHaveLength(expectedCount);
  });
}

function savedReport(
  command: SaveFundingReportCommand | undefined,
  version: number,
): FundingReport {
  if (command === undefined) {
    throw new Error('Missing save command.');
  }

  const baseReport = createSecCorpReportFixture();

  return recalculateFundingReport({
    ...baseReport,
    asOf: `2026-07-25T14:00:${String(version).padStart(2, '0')}-04:00`,
    version,
    rows: baseReport.rows.map((row) => applyCommand(row, command)),
  });
}

function applyCommand(row: FundingRow, command: SaveFundingReportCommand): FundingRow {
  const snapshotValues = command.snapshotValues[row.id];

  return snapshotValues === undefined
    ? row
    : {
        ...row,
        values: {
          ...row.values,
          ...snapshotValues,
        },
      };
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
