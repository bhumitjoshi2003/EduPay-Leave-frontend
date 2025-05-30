import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeesService {

  private baseUrl = `${environment.apiUrl}/student-fees`;

  constructor(private http: HttpClient) { }

  getStudentFees(studentId: string, year: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${studentId}/${year}`);
  }

  getStudentFee(studentId: string, year: string, month: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${studentId}/${year}/${month}`);
  }

  updateStudentFees(studentFees: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/`, studentFees);
  }

  createStudentFees(studentFees: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/`, studentFees);
  }

  getDistinctYearsByStudentId(studentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/sessions/${studentId}`);
  }

  recordManualPayment(manualPaymentDetails: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/manual-payment`, manualPaymentDetails);
  }
}
