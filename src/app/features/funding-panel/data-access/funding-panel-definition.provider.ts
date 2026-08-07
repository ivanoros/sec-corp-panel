import { InjectionToken, type Provider } from '@angular/core';

import type { FundingPanelDefinition } from '../domain/funding-panel-definition';

export const FUNDING_PANEL_DEFINITION = new InjectionToken<FundingPanelDefinition>(
  'FUNDING_PANEL_DEFINITION',
);

export function provideFundingPanelDefinition(definition: FundingPanelDefinition): Provider {
  return {
    provide: FUNDING_PANEL_DEFINITION,
    useValue: definition,
  };
}
