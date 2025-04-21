import { Component, OnInit, OnDestroy } from '@angular/core';
import { PaymentHistoryService } from '../../services/payment-history.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { PaymentHistory } from '../../interfaces/payment-history';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-payment-history-admin',
  templateUrl: './payment-history-admin.component.html',
  styleUrls: ['./payment-history-admin.component.css'],
  imports: [CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    DatePipe
  ],
  providers: [DatePipe]
})
export class PaymentHistoryAdminComponent implements OnInit, OnDestroy {
  paymentHistory: PaymentHistory[] = [];
  filteredPayments: PaymentHistory[] = [];
  classList: string[] = [
    'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
  ];
  selectedClass: string = 'all'; // Initialize to 'all' or an empty string based on your preference
  selectedDate: any = '';
  studentIdFilter: string = '';
  private ngUnsubscribe = new Subject<void>();

  constructor(private router: Router, private paymentHistoryService: PaymentHistoryService, private datePipe: DatePipe) { }

  ngOnInit(): void {
    this.loadAllPaymentHistory(); // Load all transactions initially or based on a default selection
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  loadPaymentHistory(className: string): void {
    this.selectedClass = className;
    this.paymentHistoryService.getPaymentHistoryByClass(className).pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe({
      next: (history) => {
        this.paymentHistory = history;
        this.filterPayments();
      },
      error: (error) => {
        console.error('Error loading payment history:', error);
        Swal.fire('Error!', 'Failed to load payment history.', 'error');
      }
    });
  }

  loadAllPaymentHistory(): void {
    this.selectedClass = 'all';
    this.paymentHistoryService.getAllPaymentHistory().pipe(
      takeUntil(this.ngUnsubscribe)
    ).subscribe({
      next: (history) => {
        this.paymentHistory = history;
        this.filterPayments();
      },
      error: (error) => {
        console.error('Error loading all payment history:', error);
        Swal.fire('Error!', 'Failed to load all payment history.', 'error');
      }
    });
  }

  onClassSelect(selectedClass: string): void {
    this.loadPaymentHistory(selectedClass);
  }

  onDateSelect(): void {
    this.filterPayments();
  }

  onStudentIdInput(): void {
    this.filterPayments();
  }

  clearFilter(): void {
    this.selectedDate = '';
    this.studentIdFilter = '';
    if (this.selectedClass === 'all') {
      this.loadAllPaymentHistory();
    } else {
      this.loadPaymentHistory(this.selectedClass);
    }
  }

  filterPayments(): void {
    this.filteredPayments = this.paymentHistory.filter(payment => {
      const classFilter = this.selectedClass === 'all' || payment.className === this.selectedClass;
      let dateFilter = true;
      if (this.selectedDate) {
        const selectedDateObject = new Date(this.selectedDate);
        const year = selectedDateObject.getFullYear();
        const month = (selectedDateObject.getMonth() + 1).toString().padStart(2, '0');
        const day = selectedDateObject.getDate().toString().padStart(2, '0');
        const formattedSelectedDate = `${year}-${month}-${day}`;
        const formattedPaymentDate = this.datePipe.transform(payment.paymentDate, 'yyyy-MM-dd');
        dateFilter = formattedPaymentDate === formattedSelectedDate;
      }
      const studentIdFilter = !this.studentIdFilter || payment.studentId.toLowerCase().includes(this.studentIdFilter.toLowerCase());
      return classFilter && dateFilter && studentIdFilter;
    });
  }

  viewPaymentDetails(paymentId: string): void {
    this.router.navigate(['dashboard/payment-history-details', paymentId]);
  }
}