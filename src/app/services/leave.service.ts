import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaveRequest } from '../interfaces/leave-request';

interface LeaveApplication {
  studentId: string;
  name: string; 
  leaveDate: string;
  reason: string;
  className: string;
}

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
    return this.http.get<string[]>(`${this.apiUrl}/date/${date}/class/${selectedClass}`);
  }

  deleteLeave(studentId: string, leaveDate: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${studentId}/${leaveDate}`, { responseType: 'text' });
  }

  getStudentLeaves(studentId:string):Observable<LeaveApplication[]>{
    return this.http.get<LeaveApplication[]>(`${this.apiUrl}/${studentId}`);
  }

  getAllLeaves(): Observable<LeaveApplication[]> {
    return this.http.get<LeaveApplication[]>(`${this.apiUrl}/all`);
  }

  getLeavesByClass(className: string): Observable<LeaveApplication[]> {
    console.log(`${this.apiUrl}/class/${className}`);
    return this.http.get<LeaveApplication[]>(`${this.apiUrl}/class/${className}`); 
  }

  deleteLeaveById(leaveId: string): Observable<string> {
    return this.http.delete(`${this.apiUrl}/${leaveId}`, { responseType: 'text' });
  }
}

