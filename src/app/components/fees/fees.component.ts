import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaymentComponent } from "../payment/payment.component";
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { FeesService } from '../../services/fees.service';
import { FeeStructureService } from '../../services/fee-structure.service';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-payment-tracker',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentComponent],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css']
})
export class PaymentTrackerComponent implements OnInit {

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone, private feesService: FeesService, private feeStructureService: FeeStructureService, private studentService: StudentService) {}

  selectedYear: number = new Date().getFullYear();
  months: any[] = [];
  totalAmountToPay: number = 0;
  selectedMonthsByYear: { [year: number]: number[] } = {};
  studentId: string = 'S101';
  className: string = '';
  session: string = `${this.selectedYear}-${this.selectedYear + 1}`;
  years: string[] = [];

  ngOnInit() {
    this.fetchSessions();
    this.fetchStudentDetails();
  }

  fetchSessions() {
    this.feesService.getDistinctYearsByStudentId(this.studentId).subscribe(
      (sessions) => {
        this.years = sessions;
        if (this.years.length > 0) {
          this.session = this.years[this.years.length - 1];
          this.selectedYear = parseInt(this.session.split('-')[0]);
        }
      },
      (error) => {
        console.error('Error fetching sessions:', error);
      }
    );
  }

  onYearChange(event: any) {
    this.selectedYear = parseInt(event.target.value);
    this.session = `${this.selectedYear}-${this.selectedYear + 1}`;
    this.fetchFees();
  }

  fetchStudentDetails() {
    this.studentService.getStudent(this.studentId).subscribe(
      (student) => {
        this.className = student.className;
        this.fetchFees();
      },
      (error) => {
        console.error('Error fetching student details:', error);
      }
    );
  }

  fetchFees() {
    const formattedYear = `${this.selectedYear}-${this.selectedYear + 1}`;
    this.feesService.getStudentFees(this.studentId, formattedYear).subscribe(
      (fees) => {
        this.feeStructureService.getFeeStructure(formattedYear, this.className).subscribe(
          (feeStructure) => {
            if (feeStructure) {
              this.months = fees.map(fee => ({
                ...fee,
                name: this.getMonthName(fee.month),
                selected: this.isMonthSelected(fee.month, this.selectedYear),
                fee: feeStructure.tuitionFee
              }));
            } else {
              console.error('Fee structure not found.');
              this.months = fees.map(fee => ({
                ...fee,
                name: this.getMonthName(fee.month),
                selected: this.isMonthSelected(fee.month, this.selectedYear),
                fee: 0
              }));
            }
            this.calculateTotalAmount();
          },
          (error) => {
            console.error('Error fetching fee structure:', error);
            this.months = fees.map(fee => ({
              ...fee,
              name: this.getMonthName(fee.month),
              selected: this.isMonthSelected(fee.month, this.selectedYear),
              fee: 0
            }));
            this.calculateTotalAmount();
          }
        );
      },
      (error) => {
        console.error('Error fetching fees:', error);
      }
    );
  }

  getMonthName(monthNumber: number): string {
    const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
    return months[monthNumber - 1];
  }

  isMonthSelected(monthNumber: number, year: number): boolean {
    return this.selectedMonthsByYear[year]?.includes(monthNumber) || false;
  }

  toggleMonthSelection(month: any) {
    if (!month.paid) {
      const year = this.selectedYear; // Use the current selected year
      if (!this.selectedMonthsByYear[year]) {
        this.selectedMonthsByYear[year] = [];
      }
      const index = this.selectedMonthsByYear[year].indexOf(month.month);
      if (index === -1) {
        this.selectedMonthsByYear[year].push(month.month);
      } else {
        this.selectedMonthsByYear[year].splice(index, 1);
      }
      month.selected = this.isMonthSelected(month.month, year);
      this.calculateTotalAmount();
    }
  }

  calculateTotalAmount() {
    this.totalAmountToPay = 0;
    Object.keys(this.selectedMonthsByYear).forEach((yearKey) => {
      const year = parseInt(yearKey, 10);
      if (this.selectedMonthsByYear[year]) {
        this.selectedMonthsByYear[year].forEach((monthNumber) => {
          const formattedYear = `${year}-${year + 1}`;
          this.feesService.getStudentFee(this.studentId, formattedYear, monthNumber).subscribe(fee => {
            this.feeStructureService.getFeeStructure(formattedYear, this.className).subscribe(feeStructure => {
              if (feeStructure) {
                this.totalAmountToPay += feeStructure.tuitionFee;
              }
            });
          });
        });
      }
    });
  }

  handleSuccessfulPayment() {
    this.ngZone.run(() => {
      Object.keys(this.selectedMonthsByYear).forEach(yearKey => {
        const year = parseInt(yearKey, 10);
        const formattedYear = `${year}-${year + 1}`;
        this.selectedMonthsByYear[year].forEach(monthNumber => {
          this.feesService.getStudentFee(this.studentId, formattedYear, monthNumber).subscribe(fee => {
            fee.paid = true;
            this.feesService.updateStudentFees(fee).subscribe(() => {
              this.fetchFees();
            });
          });
        });
      });
      this.totalAmountToPay = 0;
      this.selectedMonthsByYear = {};
      this.cdr.detectChanges();
    });
    alert('Payment successful! Months marked as paid.');
  }
}