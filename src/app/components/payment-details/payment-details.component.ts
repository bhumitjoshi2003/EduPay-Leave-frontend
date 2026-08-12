import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { LoggerService } from '../../services/logger.service';
import { ActivatedRoute } from '@angular/router';
import { PaymentHistoryService } from '../../services/payment-history.service';
import { PaymentHistoryDetails } from '../../interfaces/payment-response';
import { CommonModule } from '@angular/common';
import saveAs from 'file-saver';
import { Subject, take, takeUntil, catchError, of } from 'rxjs';
import { SchoolService } from '../../services/school.service';
import { FeesCalculationService } from '../../services/fees-calculation.service';

export interface ReceiptFeeLine {
  name: string;
  amount: number;
}

@Component({
  selector: 'app-payment-details',
  templateUrl: './payment-details.component.html',
  imports: [CommonModule],
  styleUrls: ['./payment-details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  paymentId: string = '';
  paymentDetails: PaymentHistoryDetails | null = null;
  loading: boolean = true;
  error: string = '';
  months: string[] = [];
  /** Built from the backend's authoritative per-fee-head payment breakdown — never from the
   * deprecated fixed buckets (tuitionFee/annualCharges/labCharges/ecaProject/examinationFee)
   * on PaymentHistoryDetails, which are display-legacy only now. */
  feeLineItems: ReceiptFeeLine[] = [];
  breakdownUnavailable: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private paymentHistoryService: PaymentHistoryService,
    private logger: LoggerService,
    private cdr: ChangeDetectorRef,
    private schoolService: SchoolService,
    private feesCalc: FeesCalculationService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    // Settings and payment details load independently — re-run getMonths() from both
    // completions (it's a no-op if paymentDetails isn't loaded yet) so month names are
    // correct regardless of which finishes first.
    this.schoolService.getSettings().pipe(take(1), takeUntil(this.destroy$)).subscribe({
      next: (settings) => {
        this.feesCalc.setStartMonth(settings.academicYearStartMonth ?? 4);
        this.getMonths();
        this.cdr.markForCheck();
      },
      error: (e) => this.logger.error('Failed to load school settings; month names may default to an April-start school.', e),
    });
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.paymentId = params['paymentId'];
      this.fetchPaymentDetails();
    });
  }

  fetchPaymentDetails(): void {
    this.loading = true;
    this.error = '';

    this.paymentHistoryService.getPaymentHistoryDetails(this.paymentId).subscribe({
      next: (data) => {
        this.paymentDetails = data;
        this.loading = false;
        this.getMonths();
        this.cdr.markForCheck();
        this.fetchFeeBreakdown();
      },
      error: (err) => {
        this.error = 'Failed to fetch payment details.';
        this.logger.error('Error fetching payment details:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /** Builds feeLineItems from the backend's authoritative per-fee-head payment breakdown.
   * Never fabricates a breakdown: falls back to a single trusted-total row when line items
   * aren't available for every covered month, or to nothing (breakdownUnavailable=true, no
   * invented rows) when even the total can't be resolved — see PaymentLineItemBreakdown's
   * javadoc for the exact contract this mirrors. */
  private fetchFeeBreakdown(): void {
    this.paymentHistoryService.getPaymentReceiptBreakdown(this.paymentId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.logger.error('Error fetching payment fee breakdown:', error);
          return of(null);
        })
      )
      .subscribe((breakdown) => {
        if (breakdown?.lineItemBreakdownAvailable) {
          const lines: ReceiptFeeLine[] = [];
          for (const li of breakdown.lineItems) {
            lines.push({ name: li.feeHeadName, amount: li.grossAmount });
            if (li.discountAmount) {
              lines.push({ name: `${li.feeHeadName} Discount`, amount: -li.discountAmount });
            }
          }
          this.feeLineItems = lines;
          this.breakdownUnavailable = false;
        } else if (breakdown?.totalSchoolFeeDue != null) {
          this.feeLineItems = [{ name: 'School Fee (breakdown unavailable)', amount: breakdown.totalSchoolFeeDue }];
          this.breakdownUnavailable = true;
        } else {
          this.feeLineItems = [];
          this.breakdownUnavailable = true;
        }
        this.cdr.markForCheck();
      });
  }

  /** monthString bit position i corresponds to academic month i+1 (1 = the school's own
   * start month) — resolved via FeesCalculationService.getMonthName using the school's real
   * academicYearStartMonth, never a hardcoded April-first array. */
  getMonths(): void {
    if (this.paymentDetails && this.paymentDetails.month) {
      const monthString = this.paymentDetails.month;
      this.months = [];
      for (let i = 0; i < monthString.length; i++) {
        if (monthString[i] === '1') {
          this.months.push(this.feesCalc.getMonthName(i + 1));
        }
      }
    } else {
      this.months = [];
    }
  }

  downloadReceipt(paymentId: string): void {
    this.loading = true;
    this.error = '';
    this.paymentHistoryService.downloadPaymentReceipt(paymentId).subscribe({
      next: (data: Blob) => {
        const filename = `receipt_${paymentId}.pdf`;
        saveAs(data, filename);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Failed to download receipt.';
        this.logger.error('Download error:', err);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}