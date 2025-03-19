import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentData } from '../interfaces/payment-data';

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {

  private baseUrl = 'http://localhost:8081/api/payments';

  constructor(private http: HttpClient) { }

  createOrder(paymentData: PaymentData) {
    return this.http.post(`${this.baseUrl}/create`, { paymentData } );
  }

  verifyPayment(paymentResponse: any, orderDetails: any) {
    return this.http.post(`${this.baseUrl}/verify`,{ paymentResponse, orderDetails } );
  }
}
