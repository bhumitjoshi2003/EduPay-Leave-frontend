import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
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
  paymentHistory: PaymentHistory[] = [];
  loading: boolean = true;
  error: string = '';
  role: string = '';
  studentId: string = '';
  
  constructor(private http: HttpClient, private route: ActivatedRoute, private router: Router, private paymentHistoryService: PaymentHistoryService) {}


  ngOnInit(): void {
    console.log("am i even working");
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.role = decodedToken.role;

      if (this.role === 'STUDENT') {
        this.studentId = decodedToken.userId;
      } else {
        this.route.params.subscribe(params => {
          const routeStudentId = params['studentId'];
          if (routeStudentId) { this.studentId = routeStudentId; }
        });
      }
      this.fetchPaymentHistory();
    }
  }

  fetchPaymentHistory(): void {
    this.loading = true;
    this.error = '';

    const idToFetch = this.studentId ? this.studentId : (this.role === 'admin' ? null : this.studentId);

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