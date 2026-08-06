import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, throwError, type Observable } from 'rxjs';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import type { FundingReport, SaveFundingReportCommand } from '../domain/funding-report';
import type { SaveFundingReportRequestDto, VersionConflictResponseDto } from './funding-panel.dto';
import {
  type FundingPanelGateway,
  FundingPanelVersionConflictError,
} from './funding-panel.gateway';
import {
  saveFundingReportRequestSchema,
  versionConflictResponseSchema,
} from './funding-panel.schema';
import { parseFundingReportResponse } from './funding-report.mapper';

@Injectable()
export class HttpFundingPanelGateway implements FundingPanelGateway {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly resourceBaseUrl = `${removeTrailingSlash(
    this.runtimeConfig.apiBaseUrl,
  )}/v1/funding-panels`;

  getReport(panelCode: string, businessDate: string): Observable<FundingReport> {
    const url = `${this.resourceBaseUrl}/${encodeURIComponent(panelCode)}`;

    return this.http
      .get<unknown>(url, {
        params: { businessDate },
      })
      .pipe(map((response) => parseFundingReportResponse(response)));
  }

  putReport(command: SaveFundingReportCommand): Observable<FundingReport> {
    const request = toRequestDto(command);
    const url = `${this.resourceBaseUrl}/${encodeURIComponent(
      command.report.panelCode,
    )}/${encodeURIComponent(command.report.reportId)}`;
    const headers = new HttpHeaders({
      'If-Match': `"${command.expectedVersion}"`,
    });

    return this.http.put<unknown>(url, request, { headers }).pipe(
      map((response) => parseFundingReportResponse(response)),
      catchError((error: unknown) => this.mapSaveError(error, command)),
    );
  }

  private mapSaveError(error: unknown, command: SaveFundingReportCommand): Observable<never> {
    if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 412)) {
      const conflict = parseVersionConflict(error.error);

      return throwError(
        () =>
          new FundingPanelVersionConflictError(
            command.expectedVersion,
            conflict?.currentVersion ?? null,
          ),
      );
    }

    return throwError(() => error);
  }
}

function toRequestDto(command: SaveFundingReportCommand): SaveFundingReportRequestDto {
  return saveFundingReportRequestSchema.parse({
    schemaVersion: command.schemaVersion,
    expectedVersion: command.expectedVersion,
    report: command.report,
  });
}

function parseVersionConflict(candidate: unknown): VersionConflictResponseDto | null {
  const result = versionConflictResponseSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
