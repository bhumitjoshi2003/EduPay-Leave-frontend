import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaymentHistory } from '../interfaces/payment-history';
import { PaymentHistoryDetails } from '../interfaces/payment-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentHistoryService {

  private baseUrl = `${environment.apiUrl}/api/payments/history`;

  constructor(private http: HttpClient) { }

  getPaymentHistory(studentId: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.baseUrl}/${studentId}`);
  }

  getPaymentHistoryDetails(paymentId: string): Observable<PaymentHistoryDetails> {
    return this.http.get<PaymentHistoryDetails>(`${this.baseUrl}/details/${paymentId}`);
  }

  getAllPaymentHistory(): Observable<PaymentHistory[]> {
    console.log(`${this.baseUrl}/all`);
    return this.http.get<PaymentHistory[]>(`${this.baseUrl}/all`);
  }

  getPaymentHistoryByClass(className: string): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(`${this.baseUrl}/class/${className}`);
  }

  downloadPaymentReceipt(paymentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/receipt/${paymentId}`, {
      responseType: 'blob',
    });
  }
}

