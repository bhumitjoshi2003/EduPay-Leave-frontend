import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentDetailsComponent } from '../components/student-details/student-details.component';

interface StudentDTO {
  studentId: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private baseUrl = 'http://localhost:8081/students';

  constructor(private http: HttpClient) { }

  getStudent(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${studentId}`);
  }

  getStudentsByClass(selectedClass: string): Observable<StudentDTO[]> {
    return this.http.get<StudentDTO[]>(`${this.baseUrl}/class/${selectedClass}`);
  }

  updateStudent(studentId: string, updatedDetails: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${studentId}`, updatedDetails);
  }

  addStudent(studentData: any): Observable<any> {
    return this.http.post(this.baseUrl, studentData);
  }

  getNewStudentsByClass(selectedClass: string): Observable<StudentDTO[]> {
    return this.http.get<StudentDTO[]>(`${this.baseUrl}/new/class/${selectedClass}`);
  }
}