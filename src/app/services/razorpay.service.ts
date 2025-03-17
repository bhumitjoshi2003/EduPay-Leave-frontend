import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentData } from '../interfaces/payment-data';

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {

  private backendUrl = 'http://localhost:8081/api/payments';

  constructor(private http: HttpClient) { }

  createOrder(paymentData: PaymentData) {
    return this.http.post(`${this.backendUrl}/create`, { paymentData } );
  }

  verifyPayment(paymentResponse: any, orderDetails: any) {
    return this.http.post(`${this.backendUrl}/verify`,{ paymentResponse, orderDetails } );
  }
}
