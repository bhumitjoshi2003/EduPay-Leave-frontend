import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface FeeStructure {
  id?: number;
  academicYear: string;
  className: string;
  tuitionFee: number;
  admissionFee: number;
  annualCharges: number;
  ecaProject: number;
  examinationFee: number;
  labCharges: number;
}

@Injectable({
  providedIn: 'root'
})
export class FeeStructureService {
  private baseUrl = 'http://localhost:8081/fee-structure'; 

  constructor(private http: HttpClient) {}

  getAcademicYears(): Observable<string[]> {
    return this.http.get<FeeStructure[]>(this.baseUrl).pipe(
      map(fees => {
        const years = new Set(fees.map(fee => fee.academicYear));
        return Array.from(years).sort();
      })
    );
  }

  getFeeStructure(session: string, className: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${session}/${className}`);
  }

  getFeeStructures(year: string): Observable<FeeStructure[]> {
    return this.http.get<FeeStructure[]>(`${this.baseUrl}/${year}`);
  }

  updateFeeStructures(year: string, feeStructures: FeeStructure[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${year}`, feeStructures);
  }

  createNewSession(fromSession: string, toSession: string, feeStructures: FeeStructure[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${toSession}`, feeStructures);
  }
}