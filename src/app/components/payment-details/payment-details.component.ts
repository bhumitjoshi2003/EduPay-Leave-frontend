import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PaymentHistoryService } from '../../services/payment-history.service';
import { PaymentHistoryDetails } from '../../interfaces/payment-response'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-payment-details',
  templateUrl: './payment-details.component.html',
  imports: [CommonModule],
  styleUrls: ['./payment-details.component.css']
})
export class PaymentDetailsComponent implements OnInit {
  paymentId: string = '';
  paymentDetails: PaymentHistoryDetails | null = null;
  loading: boolean = true;
  error: string = '';
  months: string[] = [];

  constructor(private route: ActivatedRoute, private paymentHistoryService: PaymentHistoryService) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
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
      },
      error: (err) => {
        this.error = 'Failed to fetch payment details.';
        console.error('Error fetching payment details:', err);
        this.loading = false;
      }
    });
  }

  getMonths(): void {
    if (this.paymentDetails && this.paymentDetails.month) {
      const monthString = this.paymentDetails.month;
      const allMonths = [
        'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 
      ];
      this.months = [];
      for (let i = 0; i < monthString.length; i++) {
        if (monthString[i] === '1') {
          this.months.push(allMonths[i]);
        }
      }
    } else {
      this.months = [];
    }
  }
}