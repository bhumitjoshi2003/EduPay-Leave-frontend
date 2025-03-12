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
  private apiUrl = 'http://localhost:8081/fee-structure'; 

  constructor(private http: HttpClient) {}

  getAcademicYears(): Observable<string[]> {
    return this.http.get<FeeStructure[]>(this.apiUrl).pipe(
      map(fees => {
        const years = new Set(fees.map(fee => fee.academicYear));
        return Array.from(years).sort();
      })
    );
  }

  getFeeStructures(year: string): Observable<FeeStructure[]> {
    return this.http.get<FeeStructure[]>(`${this.apiUrl}/${year}`);
  }

  updateFeeStructures(year: string, feeStructures: FeeStructure[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${year}`, feeStructures);
  }

  createNewSession(fromSession: string, toSession: string, feeStructures: FeeStructure[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${toSession}`, feeStructures);
  }
}