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
import { FeesCalculationService, PaymentContext } from '../../services/fees-calculation.service';
import { FeeBreakdownComponent } from './fee-breakdown.component';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-payment-tracker',
  standalone: true,
  imports: [ComingSoonComponent, FormsModule, CommonModule, PaymentComponent, MatFormFieldModule, MatInputModule, FeeBreakdownComponent],
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
    private authStateService: AuthStateService,
    private feesCalc: FeesCalculationService,
    private logger: LoggerService
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
  isLoadingPayment: boolean = false;
  platformFeeAmount: number = 0;

  currentMonth = new Date().getMonth() + 1;
  academicCurrentMonth: number = 0;

  currentAcademicYear: string = '';

  paymentData!: PaymentData;

  ngOnInit() {
    this.paymentData = this.feesCalc.createEmptyPaymentData();
    this.academicCurrentMonth = this.feesCalc.getAcademicMonth(this.currentMonth);
    this.role = this.authService.getUserRole();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const studentIdFromParams = params['studentId'];
      if (studentIdFromParams) {
        this.studentId = studentIdFromParams;
      }
    });
    if (this.role === 'STUDENT') this.getStudentId();
    const today = new Date();
    this.currentAcademicYear = this.feesCalc.getAcademicYear(today);
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
        this.cdr.markForCheck();
        this.fetchFees();
      },
      error: (error) => {
        this.logger.error('Error fetching sessions:', error);
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
            this.cdr.markForCheck();
          },
          error: (error) => {
            this.logger.error('Error fetching bus fee:', error);
            month.busFee = 0;
            this.cdr.markForCheck();
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
                    name: this.feesCalc.getMonthName(fee.month),
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
                    lateFee: this.lateFees = this.feesCalc.calculateLateFees(fee.month, this.session, this.currentAcademicYear)
                  }));
                  this.fetchBusFees();
                  this.checkAndDisplayFeeWarnings();
                } else {
                  this.logger.error('Fee structure not found.');
                  this.months = fees.map(fee => ({
                    ...fee,
                    name: this.feesCalc.getMonthName(fee.month),
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
                this.logger.error('Error fetching fee structure:', error);
                this.months = fees.map(fee => ({
                  ...fee,
                  name: this.feesCalc.getMonthName(fee.month),
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
            this.logger.error('Error fetching total unapplied leave count:', error);
            this.feeStructureService.getFeeStructure(this.session, this.className).subscribe({
              next: (feeStructure) => {
                this.months = fees.map(fee => ({ ...fee, name: this.feesCalc.getMonthName(fee.month), selected: this.isMonthSelected(fee.month, this.selectedYear), fee: 0, busFee: 0, unappliedLeaveCharge: 0, lateFee: 0 }));
                this.totalAmountToPay = 0;
                this.checkAndDisplayFeeWarnings();
              },
              error: () => {
                this.months = fees.map(fee => ({ ...fee, name: this.feesCalc.getMonthName(fee.month), selected: this.isMonthSelected(fee.month, this.selectedYear), fee: 0, busFee: 0, unappliedLeaveCharge: 0, lateFee: 0 }));
                this.totalAmountToPay = 0;
                this.checkAndDisplayFeeWarnings();
              }
            });
          }
        });
      },
      error: (error) => {
        this.logger.error('Error fetching fees:', error);
      }
    });
  }

  checkAndDisplayFeeWarnings() {
    if (this.role === 'STUDENT') {
      const selectedYear = this.feesCalc.getSessionStartYear(this.session);
      const currentYear = this.feesCalc.getSessionStartYear(this.currentAcademicYear);

      if (selectedYear > currentYear) {
        this.pastUnpaidMonthNames = [];
        this.unpaidCurrentMonthName = '';
        return;
      }

      const today = new Date();
      const currentCalendarMonth = today.getMonth() + 1;
      const currentAcademicMonth = this.feesCalc.getAcademicMonth(currentCalendarMonth);

      const currentMonthFee = this.months.find(
        month => month.monthNumber === currentAcademicMonth
      );

      if (currentMonthFee && !currentMonthFee.paid) {
        this.unpaidCurrentMonthName = this.feesCalc.getMonthName(currentMonthFee.monthNumber);
      } else {
        this.unpaidCurrentMonthName = '';
      }

      const pastUnpaid = this.months.filter(month => {
        return !month.paid && month.monthNumber < currentAcademicMonth && month.lateFee > 0;
      });

      this.pastUnpaidMonthNames = pastUnpaid.map(m => this.feesCalc.getMonthName(m.monthNumber));
    }
    this.cdr.markForCheck();
  }


  isMonthSelected(monthNumber: number, year: number): boolean {
    return this.selectedMonthsByYear[year]?.includes(monthNumber) || false;
  }


  private recalculateTotals(): void {
    const result = this.feesCalc.recalculateTotals(
      this.selectedMonthsByYear,
      this.months,
      this.selectedYear,
      this.totalUnappliedLeaveCharge
    );
    this.platformFeeAmount = result.platformFeeAmount;
    this.totalAmountToPay = result.totalAmountToPay;
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
            this.logger.error('Error during populateMonthDetails:', error);
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
                this.cdr.markForCheck();
                resolve();
              } else {
                this.logger.error('Fee structure not found.');
                this.selectedMonthDetails = null;
                this.cdr.markForCheck();
                resolve();
              }
            },
            error: (error) => {
              this.logger.error('Error fetching fee structure:', error);
              this.selectedMonthDetails = null;
              this.cdr.markForCheck();
              resolve();
            }
          });
        },
        error: (error) => {
          this.logger.error('Error fetching student:', error);
          this.selectedMonthDetails = null;
          this.cdr.markForCheck();
          resolve();
        }
      });
    });
  }

  updatePaymentData(month: any, add: boolean) {
    const ctx: PaymentContext = {
      studentId: this.studentId,
      studentName: this.studentName,
      className: this.className,
      session: this.session,
      paidManually: this.paidManually,
      amountPaid: this.amountPaid,
      totalAmountToPay: this.totalAmountToPay,
      totalUnappliedLeaveCharge: this.totalUnappliedLeaveCharge,
      platformFeeAmount: this.platformFeeAmount,
    };
    this.paymentData = this.feesCalc.applyMonthToPaymentData(this.paymentData, month, add, ctx);
  }

  onPaymentProcessingStarted(): void {
    this.ngZone.run(() => {
      // this.isLoadingPayment = true;
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
    this.paymentData = this.feesCalc.createEmptyPaymentData();
    this.totalUnappliedLeaves = 0;
    this.totalUnappliedLeaveCharge = 0;
    this.platformFeeAmount = 0;
  }

  markAsManuallyPaid() {
    if (this.role !== 'ADMIN' || !this.manualPaymentAmount || !this.selectedMonthsByYear[this.selectedYear]?.length) {
      Swal.fire({ icon: 'warning', title: 'Warning', text: 'Please select months and enter the amount received.' });
      return;
    }

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
        this.feesService.processManualPayment(
          this.studentId,
          this.selectedMonthsByYear,
          this.manualPaymentAmount,
          this.paymentData
        ).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.initPaymentData();
            this.fetchFees();
            this.selectedMonthsByYear = {};
            this.totalAmountToPay = 0;
            this.manualPaymentAmount = 0;
            this.cdr.detectChanges();
            Swal.fire('Marked as Paid!', 'The selected months have been marked as paid.', 'success');
          },
          error: () => Swal.fire('Error!', 'Failed to record manual payment.', 'error')
        });
      }
    });
  }

  isLate(month: any): boolean {
    const selectedYear = this.feesCalc.getSessionStartYear(this.session);
    const currentYear = this.feesCalc.getSessionStartYear(this.currentAcademicYear);

    if (selectedYear > currentYear) return false;

    if (selectedYear < currentYear) {
      return !month.paid && !month.manuallyPaid;
    }

    return !month.paid &&
      !month.manuallyPaid &&
      month.month <= this.academicCurrentMonth;
  }

  trackByMonth(index: number, month: any): any { return month.month; }
  trackByYear(index: number, year: string): string { return year; }
  trackByIndex(index: number): number { return index; }
}