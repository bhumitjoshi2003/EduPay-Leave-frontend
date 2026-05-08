import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, NgZone } from '@angular/core';
import { EMPTY } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LoggerService } from '../../services/logger.service';
import { RazorpayService, RazorpayOrderResponse, RazorpayPaymentResponse } from '../../services/razorpay.service';
import { PaymentData } from '../../interfaces/payment-data';
import { ToastService } from '../../services/toast.service';
import { StudentService } from '../../services/student.service';

declare var Razorpay: any;

@Component({
  selector: 'app-payment',
  imports: [],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentComponent {

  constructor(
    private razorpayService: RazorpayService,
    private studentService: StudentService,
    private ngZone: NgZone,
    private logger: LoggerService,
    private toast: ToastService
  ) { }

  @Input() paymentData: PaymentData = {
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

  @Input() disabled: boolean = false;
  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentProcessingStarted = new EventEmitter<void>();
  @Output() paymentProcessCompleted = new EventEmitter<void>();

  studentDetails: any;

  initiatePayment() {
    this.paymentProcessingStarted.emit();
    if (!this.paymentData || !this.paymentData.studentId) {
      this.toast.warning('Payment Error', 'Payment data or student ID is missing.');
      this.paymentProcessCompleted.emit();
      return;
    }
    this.loadStudentDetails(this.paymentData.studentId);
  }

  loadStudentDetails(studentId: string): void {
    this.studentService.getStudent(studentId).pipe(
      switchMap((student) => {
        this.studentDetails = student;
        if (!this.paymentData) {
          this.toast.warning('Payment Error', 'Payment data or student details are missing.');
          this.paymentProcessCompleted.emit();
          return EMPTY;
        }
        this.paymentData.totalAmount *= 100;
        return this.razorpayService.createOrder(this.paymentData);
      })
    ).subscribe({
      next: (response: RazorpayOrderResponse) => {
        const options = {
          key: response.razorpayKey,
          amount: response.amount,
          currency: 'INR',
          name: 'Edunexify School',
          description: 'Edunexify Fee Payment',
          order_id: response.orderId,
          prefill: {
            name: this.studentDetails.name || '',
            email: this.studentDetails.email || '',
            contact: this.studentDetails.phoneNumber || ''
          },
          theme: { color: '#4fbdbd' },
          method: { netbanking: true, card: true, upi: true, wallet: false },
          handler: (paymentResponse: RazorpayPaymentResponse) => {
            this.verifyPayment(paymentResponse, response);
          },
          modal: {
            ondismiss: () => {
              this.ngZone.run(() => this.paymentProcessCompleted.emit());
              this.toast.warning('Payment Cancelled!', 'Please try again if you wish to proceed.');
            }
          }
        };
        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: (error) => {
        this.logger.error('Error fetching student details for payment:', error);
        this.toast.error('Error', 'Failed to load student details for payment.');
        this.paymentProcessCompleted.emit();
      }
    });
  }

  verifyPayment(paymentResponse: RazorpayPaymentResponse, orderDetails: RazorpayOrderResponse) {
    this.razorpayService.verifyPayment(paymentResponse, orderDetails).subscribe({
      next: (result) => {
        if (result.success) {
          this.paymentSuccess.emit(paymentResponse);
        } else {
          this.toast.error('Verification Failed!', 'Payment could not be verified. Please contact support.');
          this.paymentProcessCompleted.emit();
        }
      },
      error: (err) => {
        this.logger.error('Error during payment verification:', err);
        this.toast.error('Verification Error!', 'An error occurred during payment verification. Please try again or contact support.');
        this.paymentProcessCompleted.emit();
      }
    });
  }
}
