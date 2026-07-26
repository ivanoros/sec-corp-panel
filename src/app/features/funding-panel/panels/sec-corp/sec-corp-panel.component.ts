import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sec-corp-panel',
  standalone: true,
  templateUrl: './sec-corp-panel.component.html',
  styleUrl: './sec-corp-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecCorpPanelComponent {}
