import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface StudentLeaveDTO {
  studentId: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})


export class StudentService {
  private baseUrl = 'http://localhost:8081/students'; 

  constructor(private http: HttpClient) {}

  getStudent(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${studentId}`);
  }

  getStudentsByClass(selectedClass: string): Observable<StudentLeaveDTO[]> {
    return this.http.get<StudentLeaveDTO[]>(`${this.baseUrl}/class/${selectedClass}`);
  }
}