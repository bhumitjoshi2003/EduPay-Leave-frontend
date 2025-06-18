import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AttendanceData } from '../interfaces/atendance-data';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) { }

  saveAttendance(attendanceData: AttendanceData[]): Observable<any> {
    return this.http.post(this.apiUrl, attendanceData, { responseType: 'text' });
  }

  getAttendanceByDateAndClass(absentDate: string, className: string): Observable<AttendanceData[]> {
    return this.http.get<AttendanceData[]>(`${this.apiUrl}/date/${absentDate}/class/${className}`);
  }

  getAttendanceCounts(studentId: string, year: number, month: number): Observable<{ studentAbsent: number; totalAbsent: number }> {
    return this.http.get<{ studentAbsent: number; totalAbsent: number }>(`${this.apiUrl}/counts/${studentId}/${year}/${month}`);
  }

  getTotalUnappliedLeaveCount(studentId: string, session: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unapplied-leave-count/${studentId}/session/${session}`);
  }

  updateChargePaidAfterPayment(studentId: string, session: string): Observable<string> {
    return this.http.put<string>(`${this.apiUrl}/charge-paid/${studentId}/session/${session}`, null, { responseType: 'text' as 'json' });
  }

  deleteAttendanceByDateAndClass(absentDate: string, className: string): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/date/${absentDate}/class/${className}`, { responseType: 'text' as 'json' }
    );
  }
}