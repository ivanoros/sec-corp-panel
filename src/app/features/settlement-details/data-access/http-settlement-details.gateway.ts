import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { APP_RUNTIME_CONFIG } from '../../../core/config/runtime-config';
import type {
  SettlementDetailsSearchQuery,
  SettlementDetailsSearchResult,
} from '../domain/settlement-detail';
import type { SettlementDetailsGateway } from './settlement-details.gateway';
import {
  settlementDetailsSearchRequestSchema,
  settlementDetailsSearchResponseSchema,
} from './settlement-details.schema';

@Injectable()
export class HttpSettlementDetailsGateway implements SettlementDetailsGateway {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(APP_RUNTIME_CONFIG);
  private readonly searchUrl = `${removeTrailingSlash(
    this.runtimeConfig.apiBaseUrl,
  )}/v1/settlement-details/search`;

  search(query: SettlementDetailsSearchQuery): Observable<SettlementDetailsSearchResult> {
    const request = settlementDetailsSearchRequestSchema.parse(query);

    return this.http
      .post<unknown>(this.searchUrl, request)
      .pipe(map((response) => settlementDetailsSearchResponseSchema.parse(response)));
  }
}

function removeTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
