import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaymentHistory } from '../interfaces/payment-history';
import { PaymentHistoryDetails } from '../interfaces/payment-response';

@Injectable({
  providedIn: 'root'
})
export class PaymentHistoryService {

  private baseUrl = 'http://localhost:8081/api/payments/history';

  constructor(private http: HttpClient) {}

  getPaymentHistory(studentId: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.baseUrl}/${studentId}`);
  }

  getPaymentHistoryDetails(paymentId: string) : Observable<PaymentHistoryDetails>{
    return this.http.get<PaymentHistoryDetails>(`${this.baseUrl}/details/${paymentId}`);
  }
}

