import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PaymentHistory } from '../../interfaces/payment-history';
import { PaymentHistoryService } from '../../services/payment-history.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  imports: [CommonModule],
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  studentId: string = '';
  paymentHistory: PaymentHistory[] = [];
  loading: boolean = true;
  error: string = '';

  constructor(private http: HttpClient, private router: Router, private paymentHistoryService: PaymentHistoryService) {}

  ngOnInit(): void {
    this.getStudentId();
    this.fetchPaymentHistory();
  }

  getStudentId(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.studentId = decodedToken.studentId; // Extract studentId from token
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
      }
    });
  }

  viewPaymentDetails(paymentId: string): void {
    this.router.navigate(['dashboard/payment-history-details', paymentId]);
  }
}