import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaymentComponent } from "../payment/payment.component";
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { FeesService } from '../../services/fees.service';
import { FeeStructureService } from '../../services/fee-structure.service';
import { StudentService } from '../../services/student.service';
import { BusFeesService } from '../../services/bus-fees.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-payment-tracker',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentComponent],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css']
})
export class PaymentTrackerComponent implements OnInit {
  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private feesService: FeesService,
    private feeStructureService: FeeStructureService,
    private studentService: StudentService,
    private busFeesService: BusFeesService
  ) {}

  selectedYear: number = new Date().getFullYear();
  months: any[] = [];
  totalAmountToPay: number = 0;
  selectedMonthsByYear: { [year: number]: number[] } = {};
  studentId: string = 'S102';
  className: string = '';
  session: string = `<span class="math-inline">\{this\.selectedYear\}\-</span>{this.selectedYear + 1}`;
  years: string[] = [];
  newAdmission: boolean = false;
  selectedMonthDetails: any = null;
  lastSelectedMonth: any = null;
  monthsSelectedInCurrentSession: boolean = false;

  ngOnInit() {
    this.fetchSessions();
    this.fetchFees();
  }

  fetchSessions() {
    this.feesService.getDistinctYearsByStudentId(this.studentId).subscribe({
      next: (sessions) => {
        this.years = sessions;
        if (this.years.length > 0) {
          this.session = this.years[this.years.length - 1];
          this.selectedYear = parseInt(this.session.split('-')[0]);
        }
      },
      error: (error) => {
        console.error('Error fetching sessions:', error);
      }
    });
  }

  onYearChange(event: any) {
    this.selectedYear = parseInt(event.target.value);
    this.session = `${this.selectedYear}-${this.selectedYear + 1}`;
    this.fetchFees();
  }

  fetchBusFees() {
    this.months
      .filter(month => month.takesBus)
      .forEach(month => {
        this.busFeesService.getBusFeesOfDistance(month.distance, this.session).subscribe({
          next: (busFee) => {
            month.busFee = busFee;
          },
          error: (error) => {
            console.error('Error fetching bus fee:', error);
            month.busFee = 0;
          }
        });
      });
  }

  fetchFees() {
    this.feesService.getStudentFees(this.studentId, this.session).subscribe({
      next: (fees) => {
        this.className = fees[0].className;
        this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
          next: (feeStructure) => {
            if (feeStructure) {
              this.months = fees.map(fee => ({
                ...fee,
                name: this.getMonthName(fee.month),
                selected: this.isMonthSelected(fee.month, this.selectedYear),
                fee: feeStructure.tuitionFee + ((fee.month !== 1) ? 0 : feeStructure.annualCharges + feeStructure.ecaProject + feeStructure.examinationFee + feeStructure.labCharges),
                busFee: 0
              }));
              this.fetchBusFees();
            } else {
              console.error('Fee structure not found.');
              this.months = fees.map(fee => ({
                ...fee,
                name: this.getMonthName(fee.month),
                selected: this.isMonthSelected(fee.month, this.selectedYear),
                fee: 0,
                busFee: 0
              }));
              this.totalAmountToPay = 0;
            }
          },
          error: (error) => {
            console.error('Error fetching fee structure:', error);
            this.months = fees.map(fee => ({
              ...fee,
              name: this.getMonthName(fee.month),
              selected: this.isMonthSelected(fee.month, this.selectedYear),
              fee: 0,
              busFee: 0
            }));
            this.totalAmountToPay = 0;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching fees:', error);
      }
    });
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
      const year = this.selectedYear;

      if (!this.selectedMonthsByYear[year]) {
        this.selectedMonthsByYear[year] = [];
      }

      const index = this.selectedMonthsByYear[year].indexOf(month.month);
      if (index === -1) {
        this.totalAmountToPay += month.fee + (month.busFee || 0);
        this.selectedMonthsByYear[year].push(month.month);
        this.lastSelectedMonth = month; // Update last selected
        this.populateMonthDetails(month);
        this.monthsSelectedInCurrentSession = true;
      } else {
        this.totalAmountToPay -= month.fee + (month.busFee || 0);
        this.selectedMonthsByYear[year].splice(index, 1);
        if(this.lastSelectedMonth === month){
          if(this.selectedMonthsByYear[year].length > 0){
            let lastSelectedIndex = this.selectedMonthsByYear[year][this.selectedMonthsByYear[year].length -1];
            let lastSelectedMonth = this.months.find(m => m.month === lastSelectedIndex);
            if(lastSelectedMonth){
              this.populateMonthDetails(lastSelectedMonth);
              this.lastSelectedMonth = lastSelectedMonth;
            } else {
              this.selectedMonthDetails = null;
              this.lastSelectedMonth = null;
            }
          } else {
            this.selectedMonthDetails = null;
            this.lastSelectedMonth = null;
          }
        }
      }
      month.selected = !month.selected;
      this.monthsSelectedInCurrentSession = Object.keys(this.selectedMonthsByYear).some(key => this.selectedMonthsByYear[parseInt(key)].length > 0);
    }
  }


  populateMonthDetails(month: any) {
    this.studentService.getStudent(this.studentId).subscribe({
      next: (student) => {
        this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
          next: (feeStructure) => {
            if (feeStructure) {
              this.selectedMonthDetails = {
                studentName: student.name,
                studentId: this.studentId,
                studentClass: student.className,
                tuitionFee: feeStructure.tuitionFee,
                annualCharges: (month.month==1) ? feeStructure.annualCharges : 0,
                labCharges: (month.month==1) ? feeStructure.labCharges : 0,
                ecaProject: (month.month==1) ? feeStructure.ecaProject : 0,
                busFee: month.busFee,
                monthName: month.name
              };
            }
          },
          error: (error) => {
            console.error('Error fetching fee structure:', error);
            this.selectedMonthDetails = null;
          }
        });
      },
      error: (error) => {
        console.error('Error fetching student:', error);
        this.selectedMonthDetails = null;
      }
    });
  }

  handleSuccessfulPayment() {
    this.ngZone.run(() => {
      const promises: Promise<any>[] = [];
      Object.keys(this.selectedMonthsByYear).forEach(yearKey => {
        const year = parseInt(yearKey, 10);
        const formattedYear = `${year}-${year + 1}`;
        this.selectedMonthsByYear[year].forEach(monthNumber => {
          promises.push(new Promise<void>((resolve) => {
            this.feesService.getStudentFee(this.studentId, formattedYear, monthNumber).subscribe(fee => {
              fee.paid = true;
              this.feesService.updateStudentFees(fee).subscribe(() => {
                resolve();
              });
            });
          }));
        });
      });

      Promise.all(promises).then(() => {
        this.fetchFees();
        this.selectedMonthsByYear = {};
        this.totalAmountToPay = 0;
        this.cdr.detectChanges();
        
        Swal.fire({
          title: '🎉 Payment Successful!',
          text: 'Your payment has been processed successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true,
        });
      });
    });
  }
}