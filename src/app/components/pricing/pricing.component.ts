import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanDetail } from '../../services/school.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  plans: PlanDetail[] = [];
  loading = true;
  error = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    this.http.get<PlanDetail[]>(`${environment.apiUrl}/public/plans`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          this.plans = plans;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.logger.error('Failed to load public plans', err);
          this.error = true;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  priceLabel(plan: PlanDetail): string {
    if (plan.monthlyPricePaise) {
      return '₹' + (plan.monthlyPricePaise / 100).toLocaleString('en-IN') + '/mo';
    }
    if (plan.annualPricePaise) {
      return '₹' + (plan.annualPricePaise / 100).toLocaleString('en-IN') + '/yr';
    }
    return 'Free';
  }

  annualLabel(plan: PlanDetail): string | null {
    if (plan.monthlyPricePaise && plan.annualPricePaise) {
      return '₹' + (plan.annualPricePaise / 100).toLocaleString('en-IN') + ' billed annually';
    }
    return null;
  }

  isFeatured(tier: string): boolean {
    return tier?.toUpperCase() === 'CAMPUS';
  }

  tierOrder = ['STARTER', 'CAMPUS', 'DISTRICT', 'ENTERPRISE'];

  get sortedPlans(): PlanDetail[] {
    return [...this.plans].sort((a, b) => {
      const ai = this.tierOrder.indexOf((a.tier ?? '').toUpperCase());
      const bi = this.tierOrder.indexOf((b.tier ?? '').toUpperCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }
}
