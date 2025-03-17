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
import { PaymentData } from '../../interfaces/payment-data';

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
  studentId: string = 'S101';
  className: string = '';
  session: string = ``;
  years: string[] = [];
  newAdmission: boolean = false;
  selectedMonthDetails: any = null;
  lastSelectedMonth: any = null;
  studentName: string = '';

  paymentData: PaymentData = {
    totalAmount: 0,
    monthSelectionString: "000000000000",
    totalTuitionFee: 0,
    totalAnnualCharges: 0,
    totalLabCharges: 0,
    totalEcaProject: 0,
    totalBusFee: 0,
    totalExaminationFee: 0,
    studentId: "",
    studentName: "",
    className: "",
    session: "",
  };

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
                monthNumber: fee.month,
                selected: this.isMonthSelected(fee.month, this.selectedYear),
                fee: feeStructure.tuitionFee + ((fee.month!==1) ? 0 : feeStructure.annualCharges + feeStructure.ecaProject + feeStructure.examinationFee + feeStructure.labCharges),
                tuitionFee: feeStructure.tuitionFee,
                annualCharges: (fee.month !== 1) ? 0 : feeStructure.annualCharges,
                ecaProject: (fee.month !== 1) ? 0 : feeStructure.ecaProject,
                examinationFee: (fee.month !== 1) ? 0 : feeStructure.examinationFee,  
                labCharges: (fee.month !== 1) ? 0 : feeStructure.labCharges, 
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
        this.totalAmountToPay += month.fee + month.busFee;
        this.selectedMonthsByYear[year].push(month.month);
        this.lastSelectedMonth = month; 
        this.populateMonthDetails(month);

        this.updatePaymentData(month, true);

      } else {
        this.totalAmountToPay -= month.fee + month.busFee;
        this.selectedMonthsByYear[year].splice(index, 1);

        this.updatePaymentData(month, false);

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
    }
  }

  updatePaymentData(month: any, add: boolean) {
    let months = this.paymentData.monthSelectionString;
    this.paymentData.monthSelectionString =  months.substring(0, month.monthNumber-1) + ((add) ? '1' : '0') + months.substring(month.monthNumber);  


    this.paymentData.totalAmount =  this.totalAmountToPay;
    this.paymentData.totalTuitionFee += add ? month.tuitionFee : -month.tuitionFee;
    this.paymentData.totalAnnualCharges += add ? month.annualCharges :  -month.annualCharges;
    this.paymentData.totalBusFee += add ? month.busFee : -month.busFee;
    this.paymentData.totalEcaProject += add ? month.ecaProject : -month.ecaProject;
    this.paymentData.totalLabCharges += add ? month.labCharges : -month.labCharges;
    this.paymentData.totalExaminationFee += add ? month.examinationFee : -month.examinationFee;

    this.paymentData.studentId = this.studentId;
    this.paymentData.studentName = this.studentName;
    this.paymentData.className = this.className;
    this.paymentData.session = this.session;

    console.log(this.paymentData);
  }


  populateMonthDetails(month: any) {
    this.studentService.getStudent(this.studentId).subscribe({
      next: (student) => {
        this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
          next: (feeStructure) => {
            if (feeStructure) {
              this.studentName = student.name;
              this.selectedMonthDetails = {
                studentId: this.studentId,
                studentClass: student.className,
                studentName: this.studentName,
                tuitionFee: feeStructure.tuitionFee,
                annualCharges: (month.month==1) ? feeStructure.annualCharges : 0,
                labCharges: (month.month==1) ? feeStructure.labCharges : 0,
                ecaProject: (month.month==1) ? feeStructure.ecaProject : 0,
                examinationFee: (month.month==1) ? feeStructure.examinationFee : 0,
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

      this.initPaymentData();

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

  initPaymentData(){
    this.paymentData.totalAmount= 0,
    this.paymentData.monthSelectionString= "000000000000",
    this.paymentData.totalTuitionFee= 0,
    this.paymentData.totalAnnualCharges= 0,
    this.paymentData.totalLabCharges= 0,
    this.paymentData.totalEcaProject= 0,
    this.paymentData.totalBusFee= 0,
    this.paymentData.totalExaminationFee= 0,
    this.paymentData.studentId= "",
    this.paymentData.studentName= "",
    this.paymentData.className= "",
    this.paymentData.session= "";
  }
}