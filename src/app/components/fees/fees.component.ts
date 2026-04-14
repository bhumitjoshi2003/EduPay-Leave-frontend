import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaymentComponent } from "../payment/payment.component";
import { ChangeDetectionStrategy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FeesService } from '../../services/fees.service';
import { FeeStructureService } from '../../services/fee-structure.service';
import { StudentService } from '../../services/student.service';
import { BusFeesService } from '../../services/bus-fees.service';
import Swal from 'sweetalert2';
import { PaymentData } from '../../interfaces/payment-data';
import { AuthStateService } from '../../auth/auth-state.service';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AttendanceService } from '../../services/attendance.service';
import { ComingSoonComponent } from '../coming-soon/coming-soon.component';
import { MODULE_MESSAGES } from '../../config/module-messages.config';


const PLATFORM_FEE_PERCENTAGE = 0.015;

@Component({
  selector: 'app-payment-tracker',
  standalone: true,
  imports: [ComingSoonComponent, FormsModule, CommonModule, PaymentComponent, MatFormFieldModule, MatInputModule],
  templateUrl: './fees.component.html',
  styleUrls: ['./fees.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTrackerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private feesService: FeesService,
    private feeStructureService: FeeStructureService,
    private studentService: StudentService,
    private busFeesService: BusFeesService,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private authStateService: AuthStateService
  ) { }

  comingSoonConfig = MODULE_MESSAGES.fees;
  showFeesModule: boolean = false;
  unpaidCurrentMonthName: string = '';
  pastUnpaidMonthNames: string[] = [];
  selectedYear: number = new Date().getFullYear();
  months: any[] = [];
  totalAmountToPay: number = 0;
  selectedMonthsByYear: { [year: number]: number[] } = {};
  studentId: string = '';
  className: string = '';
  session: string = '';
  years: string[] = [];
  newAdmission: boolean = false;
  selectedMonthDetails: any = null;
  lastSelectedMonth: any = null;
  studentName: string = '';
  role: string = '';
  manualPaymentAmount: number = 0;
  paidManually: boolean = false;
  amountPaid: number = 0;
  totalUnappliedLeaves: number = 0;
  totalUnappliedLeaveCharge: number = 0;
  lateFees: number = 0;
  lateFeePerDay: number[] = [12, 15, 18, 21];
  isLoadingPayment: boolean = false;
  platformFeeAmount: number = 0;

  currentMonth = new Date().getMonth() + 1;
  academicCurrentMonth = this.getAcademicMonth(this.currentMonth);

  currentAcademicYear: string = '';

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
    paidManually: false,
    amountPaid: 0,
    additionalCharges: 0,
    lateFees: 0,
    platformFee: 0
  };

  ngOnInit() {
    this.role = this.authService.getUserRole();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const studentIdFromParams = params['studentId'];
      if (studentIdFromParams) {
        this.studentId = studentIdFromParams;
      }
    });
    if (this.role === 'STUDENT') this.getStudentId();
    const today = new Date();
    this.currentAcademicYear = this.getAcademicYear(today);
    this.fetchSessions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStudentId(): void {
    this.studentId = this.authStateService.getUserId();
  }

  fetchSessions() {
    this.feesService.getDistinctYearsByStudentId(this.studentId).subscribe({
      next: (sessions) => {
        this.years = sessions;
        if (this.years.length > 0) {
          this.session = this.years[this.years.length - 1];
          this.selectedYear = parseInt(this.session.split('-')[0]);
        }
        this.fetchFees();
      },
      error: (error) => {
        console.error('Error fetching sessions:', error);
      }
    });
  }

  getAcademicMonth(month: number): number {
    return (month >= 4) ? (month - 3) : (month + 9);
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
    this.onPaymentProcessCompleted();
    this.feesService.getStudentFees(this.studentId, this.session).subscribe({
      next: (fees) => {
        this.className = fees[0].className;
        this.attendanceService.getTotalUnappliedLeaveCount(this.studentId, this.session).subscribe({
          next: (totalUnappliedLeaves) => {
            this.totalUnappliedLeaves = totalUnappliedLeaves;
            this.totalUnappliedLeaveCharge = this.totalUnappliedLeaves * 25;

            this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
              next: (feeStructure) => {
                if (feeStructure) {
                  this.months = fees.map(fee => ({
                    ...fee,
                    name: this.getMonthName(fee.month),
                    monthNumber: fee.month,
                    selected: this.isMonthSelected(fee.month, this.selectedYear),
                    fee: feeStructure.tuitionFee + ((fee.month !== 1) ? 0 : feeStructure.annualCharges + feeStructure.ecaProject + feeStructure.examinationFee + feeStructure.labCharges),
                    tuitionFee: feeStructure.tuitionFee,
                    annualCharges: (fee.month !== 1) ? 0 : feeStructure.annualCharges,
                    ecaProject: (fee.month !== 1) ? 0 : feeStructure.ecaProject,
                    examinationFee: (fee.month !== 1) ? 0 : feeStructure.examinationFee,
                    labCharges: (fee.month !== 1) ? 0 : feeStructure.labCharges,
                    busFee: 0,
                    unappliedLeaveCharge: 0,
                    lateFee: this.lateFees = this.calculateLateFees(fee.month)
                  }));
                  this.fetchBusFees();
                  this.checkAndDisplayFeeWarnings();
                } else {
                  console.error('Fee structure not found.');
                  this.months = fees.map(fee => ({
                    ...fee,
                    name: this.getMonthName(fee.month),
                    selected: this.isMonthSelected(fee.month, this.selectedYear),
                    fee: 0,
                    busFee: 0,
                    unappliedLeaveCharge: 0,
                    lateFee: 0
                  }));
                  this.totalAmountToPay = 0;
                  this.checkAndDisplayFeeWarnings();
                }
              },
              error: (error) => {
                console.error('Error fetching fee structure:', error);
                this.months = fees.map(fee => ({
                  ...fee,
                  name: this.getMonthName(fee.month),
                  selected: this.isMonthSelected(fee.month, this.selectedYear),
                  fee: 0,
                  busFee: 0,
                  unappliedLeaveCharge: 0,
                  lateFee: 0
                }));
                this.totalAmountToPay = 0;
                this.checkAndDisplayFeeWarnings();
              }
            });
          },
          error: (error) => {
            console.error('Error fetching total unapplied leave count:', error);
            this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
              next: (feeStructure) => {
                this.months = fees.map(fee => ({ ...fee, name: this.getMonthName(fee.month), selected: this.isMonthSelected(fee.month, this.selectedYear), fee: 0, busFee: 0, unappliedLeaveCharge: 0, lateFee: 0 }));
                this.totalAmountToPay = 0;
                this.checkAndDisplayFeeWarnings();
              },
              error: () => {
                this.months = fees.map(fee => ({ ...fee, name: this.getMonthName(fee.month), selected: this.isMonthSelected(fee.month, this.selectedYear), fee: 0, busFee: 0, unappliedLeaveCharge: 0, lateFee: 0 }));
                this.totalAmountToPay = 0;
                this.checkAndDisplayFeeWarnings();
              }
            });
          }
        });
      },
      error: (error) => {
        console.error('Error fetching fees:', error);
      }
    });
  }

  checkAndDisplayFeeWarnings() {
    if (this.role === 'STUDENT') {
      const selectedYear = this.getSessionStartYear(this.session);
      const currentYear = this.getSessionStartYear(this.currentAcademicYear);

      if (selectedYear > currentYear) {
        this.pastUnpaidMonthNames = [];
        this.unpaidCurrentMonthName = '';
        return;
      }

      const today = new Date();
      const currentCalendarMonth = today.getMonth() + 1;
      const currentAcademicMonth = this.getAcademicMonth(currentCalendarMonth);

      const currentMonthFee = this.months.find(
        month => month.monthNumber === currentAcademicMonth
      );

      if (currentMonthFee && !currentMonthFee.paid) {
        this.unpaidCurrentMonthName = this.getMonthName(currentMonthFee.monthNumber);
      } else {
        this.unpaidCurrentMonthName = '';
      }

      const pastUnpaid = this.months.filter(month => {
        return !month.paid && month.monthNumber < currentAcademicMonth && month.lateFee > 0;
      });

      this.pastUnpaidMonthNames = pastUnpaid.map(m => this.getMonthName(m.monthNumber));
    }
  }


  calculateLateFees(academicFeeMonth: number): number {
    if (this.session !== this.currentAcademicYear) {
      return 0;
    }

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const academicCurrentMonth = this.getAcademicMonth(currentMonth);

    let monthDifference = academicCurrentMonth - academicFeeMonth;

    if (monthDifference <= 0) return 0;

    if (monthDifference >= 9) {
      return 30 * this.lateFeePerDay[3];
    } else if (monthDifference >= 6) {
      return 30 * this.lateFeePerDay[2];
    } else if (monthDifference >= 3) {
      return 30 * this.lateFeePerDay[1];
    } else {
      return 30 * this.lateFeePerDay[0];
    }
  }

  getMonthName(monthNumber: number): string {
    const months = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
    return months[monthNumber - 1];
  }

  isMonthSelected(monthNumber: number, year: number): boolean {
    return this.selectedMonthsByYear[year]?.includes(monthNumber) || false;
  }


  private recalculateTotals(): void {
    let subTotal = 0;

    Object.keys(this.selectedMonthsByYear).forEach(yearKey => {
      const year = parseInt(yearKey, 10);
      this.selectedMonthsByYear[year].forEach(monthNumber => {
        const month = this.months.find(m => m.month === monthNumber);
        if (month) {
          subTotal += month.fee + (month.busFee || 0) + month.lateFee;
        }
      });
    });

    const year = this.selectedYear;
    if (this.selectedMonthsByYear[year]?.length > 0 && this.totalUnappliedLeaveCharge > 0) {
      subTotal += this.totalUnappliedLeaveCharge;
    }

    // 3. Calculate Platform Fee
    this.platformFeeAmount = Math.ceil(subTotal * PLATFORM_FEE_PERCENTAGE);

    this.totalAmountToPay = subTotal + this.platformFeeAmount;

    this.paymentData.totalAmount = this.totalAmountToPay;
    this.paymentData.platformFee = this.platformFeeAmount;
  }


  toggleMonthSelection(month: any) {
    if (!month.paid) {
      if (this.isLoadingPayment) {
        return;
      }
      const year = this.selectedYear;

      if (!this.selectedMonthsByYear[year]) {
        this.selectedMonthsByYear[year] = [];
      }

      const index = this.selectedMonthsByYear[year].indexOf(month.month);
      if (index === -1) {
        // this.totalAmountToPay += month.fee + (month.busFee || 0) + month.lateFee;
        // if (this.selectedMonthsByYear[year].length === 0 && this.totalUnappliedLeaveCharge > 0) {
        //   this.totalAmountToPay += this.totalUnappliedLeaveCharge;
        // }
        this.selectedMonthsByYear[year].push(month.month);
        this.cdr.markForCheck();
        this.lastSelectedMonth = month;

        this.populateMonthDetails(month)
          .then(() => {
            this.recalculateTotals();
            this.updatePaymentData(month, true);
          })
          .catch((error) => {
            console.error('Error during populateMonthDetails:', error);
          });

      } else {
        //   this.totalAmountToPay -= month.fee + (month.busFee || 0) + month.lateFee;
        this.selectedMonthsByYear[year].splice(index, 1);
        this.cdr.markForCheck();
        this.updatePaymentData(month, false);
        this.recalculateTotals();

        if (this.lastSelectedMonth === month) {
          if (this.selectedMonthsByYear[year].length > 0) {
            let lastSelectedIndex = this.selectedMonthsByYear[year][this.selectedMonthsByYear[year].length - 1];
            let lastSelectedMonth = this.months.find(m => m.month === lastSelectedIndex);
            if (lastSelectedMonth) {
              this.populateMonthDetails(lastSelectedMonth).then(() => {
                this.lastSelectedMonth = lastSelectedMonth;
              });
            } else {
              this.selectedMonthDetails = null;
              this.lastSelectedMonth = null;
            }
          } else {
            this.selectedMonthDetails = null;
            this.lastSelectedMonth = null;
            // if (this.totalUnappliedLeaveCharge > 0) {
            //   this.totalAmountToPay -= this.totalUnappliedLeaveCharge;
            // }
          }
        }
      }
      month.selected = !month.selected;
    }
  }

  populateMonthDetails(month: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.studentService.getStudent(this.studentId).subscribe({
        next: (student) => {
          this.studentName = student.name;
          this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
            next: (feeStructure) => {
              if (feeStructure) {
                this.selectedMonthDetails = {
                  studentId: this.studentId,
                  studentClass: student.className,
                  studentName: this.studentName,
                  tuitionFee: feeStructure.tuitionFee,
                  annualCharges: (month.month === 1) ? feeStructure.annualCharges : 0,
                  labCharges: (month.month === 1) ? feeStructure.labCharges : 0,
                  ecaProject: (month.month === 1) ? feeStructure.ecaProject : 0,
                  examinationFee: (month.month === 1) ? feeStructure.examinationFee : 0,
                  busFee: month.busFee,
                  monthName: month.name,
                  additionalCharges: this.totalUnappliedLeaveCharge,
                  lateFee: month.lateFee
                };
                resolve();
              } else {
                console.error('Fee structure not found.');
                this.selectedMonthDetails = null;
                resolve();
              }
            },
            error: (error) => {
              console.error('Error fetching fee structure:', error);
              this.selectedMonthDetails = null;
              resolve();
            }
          });
        },
        error: (error) => {
          console.error('Error fetching student:', error);
          this.selectedMonthDetails = null;
          resolve();
        }
      });
    });
  }

  updatePaymentData(month: any, add: boolean) {
    let months = this.paymentData.monthSelectionString;
    this.paymentData.monthSelectionString = months.substring(0, month.monthNumber - 1) + ((add) ? '1' : '0') + months.substring(month.monthNumber);


    this.paymentData.totalAmount = this.totalAmountToPay;
    this.paymentData.totalTuitionFee += add ? month.tuitionFee : -month.tuitionFee;
    this.paymentData.totalAnnualCharges += add ? month.annualCharges : -month.annualCharges;
    this.paymentData.totalBusFee += add ? month.busFee : -month.busFee;
    this.paymentData.totalEcaProject += add ? month.ecaProject : -month.ecaProject;
    this.paymentData.totalLabCharges += add ? month.labCharges : -month.labCharges;
    this.paymentData.totalExaminationFee += add ? month.examinationFee : -month.examinationFee;
    this.paymentData.lateFees += add ? month.lateFee : -month.lateFee;

    this.paymentData.studentId = this.studentId;
    this.paymentData.studentName = this.studentName;
    this.paymentData.className = this.className;
    this.paymentData.session = this.session;
    this.paymentData.paidManually = this.paidManually;
    this.paymentData.amountPaid = this.paidManually ? this.amountPaid : this.totalAmountToPay;
    this.paymentData.additionalCharges = this.totalUnappliedLeaveCharge;
    this.paymentData.platformFee = this.platformFeeAmount;

    console.log(this.paymentData);
  }

  onPaymentProcessingStarted(): void {
    this.ngZone.run(() => {
      // this.isLoadingPayment = true;
      console.log('Payment processing started: UI locked.');
    });
  }

  onPaymentProcessCompleted(): void {
    this.ngZone.run(() => {
      this.isLoadingPayment = false;
      this.cdr.detectChanges();
    });
  }

  handleSuccessfulPayment() {
    this.ngZone.run(() => {
      this.initPaymentData();

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
      }).then(() => {
        this.onPaymentProcessCompleted();
      });
    })
  }

  initPaymentData() {
    this.paymentData.totalAmount = 0,
      this.paymentData.monthSelectionString = "000000000000",
      this.paymentData.totalTuitionFee = 0,
      this.paymentData.totalAnnualCharges = 0,
      this.paymentData.totalLabCharges = 0,
      this.paymentData.totalEcaProject = 0,
      this.paymentData.totalBusFee = 0,
      this.paymentData.totalExaminationFee = 0,
      this.paymentData.studentName = "",
      this.paymentData.className = "",
      this.paymentData.session = "",
      this.paymentData.paidManually = false,
      this.paymentData.amountPaid = 0,
      this.paymentData.lateFees = 0,
      this.paymentData.platformFee = 0,
      this.totalUnappliedLeaves = 0,
      this.totalUnappliedLeaveCharge = 0,
      this.platformFeeAmount = 0;
  }

  markAsManuallyPaid() {
    if (this.role === 'ADMIN' && this.manualPaymentAmount !== null && this.selectedMonthsByYear[this.selectedYear]?.length > 0) {
      const selectedMonthsCount = Object.values(this.selectedMonthsByYear)
        .flat()
        .length;

      if (selectedMonthsCount === 0) {
        Swal.fire('Warning', 'Please select months to mark as paid.', 'warning');
        return;
      }

      const baseAmountPerMonth = Math.floor(this.manualPaymentAmount / selectedMonthsCount);
      let remainder = this.manualPaymentAmount % selectedMonthsCount;
      const amountsToApply: { [year: number]: { [month: number]: number } } = {};

      Object.keys(this.selectedMonthsByYear).forEach(yearKey => {
        const year = parseInt(yearKey, 10);
        amountsToApply[year] = {};
        this.selectedMonthsByYear[year].forEach(monthNumber => {
          let currentMonthAmount = baseAmountPerMonth;
          if (remainder > 0) {
            currentMonthAmount += 1;
            remainder--;
          }
          amountsToApply[year][monthNumber] = currentMonthAmount;
        });
      });

      Swal.fire({
        title: 'Confirm Manual Payment',
        text: `Mark selected months as manually paid with a total amount of ₹${this.manualPaymentAmount}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, mark as paid!'
      }).then((result) => {
        if (result.isConfirmed) {
          const promises: Promise<any>[] = [];

          this.paymentData.paidManually = true;
          this.paymentData.amountPaid = this.manualPaymentAmount;
          console.log("Total amount paid:", this.manualPaymentAmount);

          Object.keys(this.selectedMonthsByYear).forEach(yearKey => {
            const year = parseInt(yearKey, 10);
            const formattedYear = `${year}-${year + 1}`;
            this.selectedMonthsByYear[year].forEach(monthNumber => {
              promises.push(new Promise<void>((resolve) => {
                this.feesService.getStudentFee(this.studentId, formattedYear, monthNumber).subscribe(fee => {
                  fee.paid = true;
                  fee.manuallyPaid = true;
                  fee.manualPaymentReceived = amountsToApply[year][monthNumber];
                  fee.amountPaid = amountsToApply[year][monthNumber];
                  this.feesService.updateStudentFees(fee).subscribe(() => {
                    resolve();
                  });
                });
              }));
            });
          });

          Promise.all(promises).then(() => {
            this.feesService.recordManualPayment(this.paymentData).subscribe({
              next: (recordResponse) => {
                console.log('Manual payment recorded:', recordResponse);
                this.initPaymentData();
                this.fetchFees();
                this.selectedMonthsByYear = {};
                this.totalAmountToPay = 0;
                this.manualPaymentAmount = 0;
                this.cdr.detectChanges();
                Swal.fire(
                  'Marked as Paid!',
                  `The selected months have been marked as paid.`,
                  'success'
                );
              },
              error: (recordError) => {
                console.error('Error recording manual payment:', recordError);
                Swal.fire(
                  'Error!',
                  'Failed to record manual payment.',
                  'error'
                );
              }
            });
          });
        }
      });
    } else if (this.role === 'ADMIN' && (this.selectedMonthsByYear[this.selectedYear]?.length === 0 || this.manualPaymentAmount === null)) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select months and enter the amount received.',
      });
    }
  }

  getAcademicYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  isLate(month: any): boolean {
    const selectedYear = this.getSessionStartYear(this.session);
    const currentYear = this.getSessionStartYear(this.currentAcademicYear);

    if (selectedYear > currentYear) return false;

    if (selectedYear < currentYear) {
      return !month.paid && !month.manuallyPaid;
    }

    return !month.paid &&
      !month.manuallyPaid &&
      month.month <= this.academicCurrentMonth;
  }

  getSessionStartYear(session: string): number {
    return parseInt(session.substring(0, 4));
  }

  trackByMonth(index: number, month: any): any { return month.month; }
  trackByYear(index: number, year: string): string { return year; }
  trackByIndex(index: number): number { return index; }
}