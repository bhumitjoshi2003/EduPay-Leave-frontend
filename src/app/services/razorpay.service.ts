import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentData } from '../interfaces/payment-data';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {

  private baseUrl = `${environment.apiUrl}/api/payments`;

  constructor(private http: HttpClient) { }

  createOrder(paymentData: PaymentData) {
    return this.http.post(`${this.baseUrl}/create`, { paymentData });
  }

  verifyPayment(paymentResponse: any, orderDetails: any) {
    return this.http.post(`${this.baseUrl}/verify`, { paymentResponse, orderDetails });
  }
}
