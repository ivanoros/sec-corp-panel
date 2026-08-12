import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import type {
  SettlementsDashboard,
  SettlementsDashboardQuery,
} from '../domain/settlements-dashboard';
import type { SettlementsDashboardGateway } from './settlements-dashboard.gateway';
import {
  settlementsDashboardQuerySchema,
  settlementsDashboardSchema,
} from './settlements-dashboard.schema';

@Injectable()
export class HttpSettlementsDashboardGateway implements SettlementsDashboardGateway {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly dashboardUrl = `${removeTrailingSlash(
    this.runtimeConfig.apiBaseUrl,
  )}/v1/settlements/dashboard`;

  load(query: SettlementsDashboardQuery): Observable<SettlementsDashboard> {
    const request = settlementsDashboardQuerySchema.parse(query);
    const params = new HttpParams()
      .set('businessDate', request.businessDate)
      .set('userId', request.userId);

    return this.http
      .get<unknown>(this.dashboardUrl, { params })
      .pipe(map((response) => settlementsDashboardSchema.parse(response)));
  }
}

function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
