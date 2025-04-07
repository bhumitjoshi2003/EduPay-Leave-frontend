import { Component, EventEmitter, Input, input, Output } from '@angular/core';
import { RazorpayService } from '../../services/razorpay.service';
import { PaymentData } from '../../interfaces/payment-data';
import Swal from 'sweetalert2';

declare var Razorpay: any;

@Component({
  selector: 'app-payment',
  imports: [],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent {

  constructor(private razorpayService: RazorpayService) {}

  @Input() paymentData: PaymentData = {
    totalAmount: 0,
    monthSelectionString: "000000000000",
    totalTuitionFee: 0,
    totalAnnualCharges: 0,
    totalLabCharges: 0,
    totalEcaProject: 0,
    totalBusFee: 0,
    totalExaminationFee:0,
    studentId: "",
    studentName: "",
    className: "",
    session: "",
  };

  @Output() paymentSuccess = new EventEmitter<void>();

  initiatePayment() {
    this.paymentData.totalAmount *= 100;
    this.razorpayService.createOrder(this.paymentData).subscribe((response: any) => {
      console.log(response);
      const options = {
        key: 'rzp_test_uzFJONVXH4vqou',  
        amount: response.amount,      
        currency: 'INR',
        name: 'Indra Academy School',
        description: 'School Fee Payment',
        order_id: response.orderId,   // Order ID from backend
        prefill: {
          name: 'Hari Narayan',  // Prefill name
          email: 'haridas@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3399cc'  // Customize color
        },
        method: {
          netbanking: true,
          card: true,
          upi: true,  // ✅ Enable UPI
          wallet: false
        },
        handler: (paymentResponse: any) => {
          console.log('Payment Success:', paymentResponse);
          console.log(response);
          this.verifyPayment(paymentResponse, response);
        },
        modal: {
          ondismiss: function () {
            Swal.fire({
              icon: "warning",
              title: "Payment Cancelled!",
              text: "Please try again if you wish to proceed.",
              confirmButtonText: "Okay",
              confirmButtonColor: "#ff6b6b",
              background: "#fef2f2",
              color: "#b91c1c",
              timer: 4000,
              timerProgressBar: true
            });
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    });
  }

  verifyPayment(paymentResponse: any, orderDetails : any) {
    this.razorpayService.verifyPayment(paymentResponse, orderDetails).subscribe((result: any) => {
      if (result.success) {
        this.paymentSuccess.emit(); 
      } else {
        alert('Payment Verification Failed!');
      }
    });
  }
}
