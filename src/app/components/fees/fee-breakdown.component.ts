import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonthBreakdownDetails } from './fees.component';

@Component({
  selector: 'app-fee-breakdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fee-breakdown.component.html',
  styleUrl: './fee-breakdown.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeBreakdownComponent {
  @Input() details: MonthBreakdownDetails | null = null;
  /** Rupees — the parent-facing Online Convenience Fee total (gateway recovery + Edunexify
   * transaction fee combined). Never shown as "Platform Fee" for a modern payment. */
  @Input() convenienceFeeAmount: number = 0;
  @Input() selectedMonthCount: number = 0;
}
