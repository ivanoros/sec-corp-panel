import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { APP_RUNTIME_CONFIG, type RuntimeConfig } from '../../../core/config/runtime-config';
import { selectSnapshotValues, type SaveFundingReportCommand } from '../domain/funding-report';
import { createSecCorpReportFixture } from '../panels/sec-corp/mocks/sec-corp-report.fixture';
import type { FundingPanelVersionConflictError } from './funding-panel.gateway';
import { HttpFundingPanelGateway } from './http-funding-panel.gateway';

describe('HttpFundingPanelGateway', () => {
  let gateway: HttpFundingPanelGateway;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    const runtimeConfig: RuntimeConfig = {
      agGridEnterpriseLicenseKey: null,
      apiBaseUrl: '/funding-api/',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpFundingPanelGateway,
        {
          provide: APP_RUNTIME_CONFIG,
          useValue: runtimeConfig,
        },
      ],
    });

    gateway = TestBed.inject(HttpFundingPanelGateway);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('retrieves and validates the report contract', async () => {
    const report = createSecCorpReportFixture();
    const result = firstValueFrom(gateway.getReport('sec-corp', '2026-07-25'));
    const request = httpTesting.expectOne(
      '/funding-api/v1/funding-panels/sec-corp?businessDate=2026-07-25',
    );

    expect(request.request.method).toBe('GET');
    request.flush(report);

    await expect(result).resolves.toEqual(report);
  });

  it('sends a complete versioned PUT replacement', async () => {
    const report = createSecCorpReportFixture();
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      reportId: report.reportId,
      panelCode: report.panelCode,
      businessDate: report.businessDate,
      expectedVersion: report.version,
      snapshotValues: selectSnapshotValues(report),
    };
    const result = firstValueFrom(gateway.putReport(command));
    const request = httpTesting.expectOne(
      '/funding-api/v1/funding-panels/sec-corp/sec-corp-2026-07-25',
    );

    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"17"');
    expect(request.request.body).toEqual({
      schemaVersion: 1,
      expectedVersion: 17,
      businessDate: '2026-07-25',
      snapshotValues: command.snapshotValues,
    });

    request.flush({
      ...report,
      version: 18,
    });

    await expect(result).resolves.toEqual({
      ...report,
      version: 18,
    });
  });

  it('maps stale server responses to a version conflict', async () => {
    const report = createSecCorpReportFixture();
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      reportId: report.reportId,
      panelCode: report.panelCode,
      businessDate: report.businessDate,
      expectedVersion: report.version,
      snapshotValues: selectSnapshotValues(report),
    };
    const result = firstValueFrom(gateway.putReport(command));
    const request = httpTesting.expectOne(
      '/funding-api/v1/funding-panels/sec-corp/sec-corp-2026-07-25',
    );

    request.flush(
      {
        code: 'VERSION_CONFLICT',
        message: 'The report was updated by another user.',
        expectedVersion: 17,
        currentVersion: 18,
      },
      {
        status: 409,
        statusText: 'Conflict',
      },
    );

    await expect(result).rejects.toEqual(
      expect.objectContaining<Partial<FundingPanelVersionConflictError>>({
        expectedVersion: 17,
        currentVersion: 18,
      }),
    );
  });
});
