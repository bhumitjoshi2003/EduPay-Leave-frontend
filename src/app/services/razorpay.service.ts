import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {

  private backendUrl = 'http://localhost:8081/api/payments';

  constructor(private http: HttpClient) { }

  createOrder(amount: number){
    return this.http.post(`${this.backendUrl}/create`, {amount});
  }

  verifyPayment(paymentData: any) {
    return this.http.post(`${this.backendUrl}/verify`, paymentData);
  }
}
