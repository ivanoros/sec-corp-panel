import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { APP_RUNTIME_CONFIG, type RuntimeConfig } from '../../../core/config/runtime-config';
import type { SaveFundingReportCommand } from '../domain/funding-report';
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
      businessDate: '2026-07-25',
      fundingPanelDataSource: 'http',
      userId: 'e70165',
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
    const result = firstValueFrom(gateway.getReport('sec-corp', '2026-07-25', 'e70165'));
    const request = httpTesting.expectOne(
      '/funding-api/v1/funding-panels/sec-corp?businessDate=2026-07-25&userId=e70165',
    );

    expect(request.request.method).toBe('GET');
    request.flush(report);

    await expect(result).resolves.toEqual(report);
  });

  it('rejects system as a retrieval request actor', () => {
    expect(() => gateway.getReport('sec-corp', '2026-07-25', 'system')).toThrow();
  });

  it('sends the complete report dataset in a versioned PUT replacement', async () => {
    const report = createSecCorpReportFixture();
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: report.version,
      userId: 'e70165',
      report,
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
      userId: 'e70165',
      report,
    });

    request.flush({
      ...report,
      version: 18,
      userId: 'e70165',
    });

    await expect(result).resolves.toEqual({
      ...report,
      version: 18,
      userId: 'e70165',
    });
  });

  it.each([409, 412])('maps HTTP %s stale responses to a version conflict', async (status) => {
    const report = createSecCorpReportFixture();
    const command: SaveFundingReportCommand = {
      schemaVersion: 1,
      expectedVersion: report.version,
      userId: 'e70165',
      report,
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
        status,
        statusText: status === 409 ? 'Conflict' : 'Precondition Failed',
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
