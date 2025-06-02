import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PaymentHistory } from '../../interfaces/payment-history';
import { PaymentHistoryService } from '../../services/payment-history.service';
import { jwtDecode } from 'jwt-decode';
import { saveAs } from 'file-saver';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  imports: [CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule],
  styleUrls: ['./payment-history.component.css'],
})
export class PaymentHistoryComponent implements OnInit {
  paymentHistory: PaymentHistory[] = [];
  loading: boolean = true;
  error: string = '';
  role: string = '';
  studentId: string = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private paymentHistoryService: PaymentHistoryService
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.role = decodedToken.role;

      if (this.role === 'STUDENT') {
        this.studentId = decodedToken.userId;
      } else {
        this.route.params.subscribe((params) => {
          const routeStudentId = params['studentId'];
          if (routeStudentId) {
            this.studentId = routeStudentId;
          }
        });
      }
      this.fetchPaymentHistory();
    }
  }

  fetchPaymentHistory(): void {
    this.loading = true;
    this.error = '';

    this.paymentHistoryService.getPaymentHistory(this.studentId).subscribe({
      next: (data) => {
        this.paymentHistory = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to fetch payment history.';
        console.error('Error fetching payment history:', err);
        this.loading = false;
      },
    });
  }

  viewPaymentDetails(paymentId: string): void {
    this.router.navigate(['dashboard/payment-history-details', paymentId]);
  }

  downloadPaymentReceipt(paymentId: string): void {
    this.loading = true;
    this.error = '';
    this.paymentHistoryService.downloadPaymentReceipt(paymentId).subscribe({
      next: (data: Blob) => {
        let filename = `receipt_${paymentId}.pdf`;
        saveAs(data, filename);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to download payment receipt.';
        console.error('Error downloading payment receipt:', err);
        this.loading = false;
      },
    });
  }
}