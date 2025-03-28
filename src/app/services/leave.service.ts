import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaveRequest } from '../interfaces/leave-request';

@Injectable({
  providedIn: 'root',
})

export class LeaveService {

  private apiUrl = 'http://localhost:8081/leaves';

  constructor(private http: HttpClient) {}

  applyLeave(leaveRequest: LeaveRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/apply-leave`, leaveRequest, { responseType: 'text' });
  }

  getLeavesByDateAndClass(date: string, selectedClass: string): Observable<string[]> {
    console.log(`${this.apiUrl}/date/${date}/class/${selectedClass}`);
    return this.http.get<string[]>(`${this.apiUrl}/date/${date}/class/${selectedClass}`);
  }

  deleteLeave(studentId: string, leaveDate: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${studentId}/${leaveDate}`, { responseType: 'text' });
  }

  getStudentLeaves(studentId:string):Observable<LeaveRequest[]>{
    return this.http.get<LeaveRequest[]>(`${this.apiUrl}/${studentId}`);
  }
}

