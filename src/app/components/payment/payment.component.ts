import { Component, Input, input } from '@angular/core';
import { RazorpayService } from '../../services/razorpay.service';

declare var Razorpay: any;

@Component({
  selector: 'app-payment',
  imports: [],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent {

  constructor(private razorpayService: RazorpayService) {}

  @Input() amount!: number;

  initiatePayment() {
    // Receive the amount from FeesComponent
    console.log(`Making a payment of ${this.amount}`);

    this.razorpayService.createOrder(this.amount*100).subscribe((response: any) => {
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
          email: 'bhumitharidas@example.com',
          contact: '7906341843'
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
          // Verify the payment on backend
          this.verifyPayment(paymentResponse);
        },
        modal: {
          ondismiss: function () {
            alert('Payment popup closed');
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    });
  }

  verifyPayment(paymentResponse: any) {
    this.razorpayService.verifyPayment(paymentResponse).subscribe((result: any) => {
      if (result.success) {
        alert('Payment Successful!');
      } else {
        alert('Payment Verification Failed!');
      }
    });
  }
}
