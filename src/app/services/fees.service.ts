import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, switchMap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentData } from '../interfaces/payment-data';
import { StudentFee } from '../interfaces/student-fee';

@Injectable({
  providedIn: 'root'
})
export class FeesService {

  private baseUrl = `${environment.apiUrl}/student-fees`;

  constructor(private http: HttpClient) { }

  getStudentFees(studentId: string, year: string): Observable<StudentFee[]> {
    return this.http.get<StudentFee[]>(`${this.baseUrl}/${studentId}/${year}`);
  }

  getStudentFee(studentId: string, year: string, month: number): Observable<StudentFee> {
    return this.http.get<StudentFee>(`${this.baseUrl}/${studentId}/${year}/${month}`);
  }

  updateStudentFees(studentFees: StudentFee): Observable<StudentFee> {
    return this.http.put<StudentFee>(`${this.baseUrl}/`, studentFees);
  }

  createStudentFees(studentFees: StudentFee): Observable<StudentFee> {
    return this.http.post<StudentFee>(`${this.baseUrl}/`, studentFees);
  }

  getDistinctYearsByStudentId(studentId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/sessions/${studentId}`);
  }

  recordManualPayment(manualPaymentDetails: PaymentData): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/manual-payment`, manualPaymentDetails);
  }

  processManualPayment(
    studentId: string,
    selectedMonthsByYear: { [year: number]: number[] },
    totalAmount: number,
    paymentData: PaymentData
  ): Observable<void> {
    const selectedMonthsCount = Object.values(selectedMonthsByYear).flat().length;
    const baseAmountPerMonth = Math.floor(totalAmount / selectedMonthsCount);
    let remainder = totalAmount % selectedMonthsCount;

    const amountsToApply: { [year: number]: { [month: number]: number } } = {};
    Object.keys(selectedMonthsByYear).forEach(yearKey => {
      const year = parseInt(yearKey, 10);
      amountsToApply[year] = {};
      selectedMonthsByYear[year].forEach(monthNumber => {
        let amount = baseAmountPerMonth;
        if (remainder > 0) { amount++; remainder--; }
        amountsToApply[year][monthNumber] = amount;
      });
    });

    const updateRequests: Observable<StudentFee>[] = [];
    Object.keys(selectedMonthsByYear).forEach(yearKey => {
      const year = parseInt(yearKey, 10);
      const formattedYear = `${year}-${year + 1}`;
      selectedMonthsByYear[year].forEach(monthNumber => {
        updateRequests.push(
          this.getStudentFee(studentId, formattedYear, monthNumber).pipe(
            switchMap(fee => {
              fee.paid = true;
              fee.manuallyPaid = true;
              fee.manualPaymentReceived = amountsToApply[year][monthNumber];
              fee.amountPaid = amountsToApply[year][monthNumber];
              return this.updateStudentFees(fee);
            })
          )
        );
      });
    });

    const updatedPaymentData: PaymentData = { ...paymentData, paidManually: true, amountPaid: totalAmount };

    return forkJoin(updateRequests).pipe(
      switchMap(() => this.recordManualPayment(updatedPaymentData)),
      map(() => void 0)
    );
  }
}
