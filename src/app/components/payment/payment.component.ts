import { Component } from '@angular/core';
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

  initiatePayment() {
    const amount = 50000; // Example amount (₹500.00)

    this.razorpayService.createOrder(amount).subscribe((response: any) => {
      const options = {
        key: 'your_razorpay_key_id',  // Replace with Razorpay Key ID
        amount: response.amount,      // Amount in paisa (100 INR = 10000 paisa)
        currency: 'INR',
        name: 'Indra Academy School',
        description: 'School Fee Payment',
        order_id: response.orderId,   // Order ID from backend
        prefill: {
          name: 'John Doe',  // Prefill name
          email: 'john@example.com',
          contact: '9876543210'
        },
        theme: {
          color: '#3399cc'  // Customize color
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
