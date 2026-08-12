import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-settlement-panel-frame',
  standalone: true,
  templateUrl: './settlement-panel-frame.component.html',
  styleUrl: './settlement-panel-frame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementPanelFrameComponent {
  readonly title = input.required<string>();
  readonly refreshing = input(false);
  readonly refreshRequested = output<void>();
}
