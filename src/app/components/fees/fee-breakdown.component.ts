import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fee-breakdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fee-breakdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeBreakdownComponent {
  @Input() details: any = null;
  @Input() platformFeeAmount: number = 0;
  @Input() selectedMonthCount: number = 0;
}
