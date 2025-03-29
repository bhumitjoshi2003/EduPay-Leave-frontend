import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AttendanceData } from '../interfaces/atendance-data';
import { Observable } from 'rxjs';
import { text } from 'stream/consumers';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = 'http://localhost:8081/attendance';

  constructor(private http: HttpClient) { }

  saveAttendance(attendanceData: AttendanceData[]): Observable<any> {
    return this.http.post(this.apiUrl, attendanceData, {responseType: 'text'});
  }

  getAttendanceByDateAndClass(absentDate: string, className: string): Observable<AttendanceData[]> {
    return this.http.get<AttendanceData[]>(`${this.apiUrl}/date/${absentDate}/class/${className}`);
  }

  getAttendanceCounts(studentId: string, year: number, month: number): Observable<{ studentAbsent: number; totalAbsent: number }> {
    return this.http.get<{ studentAbsent: number; totalAbsent: number }>(`${this.apiUrl}/counts/${studentId}/${year}/${month}`);
  }
}
