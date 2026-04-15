import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Student } from '../interfaces/student';

interface StudentDTO {
  studentId: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private baseUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) { }

  getStudent(studentId: string): Observable<Student> {
    return this.http.get<Student>(`${this.baseUrl}/${studentId}`);
  }

  getActiveStudentsByClass(selectedClass: string): Observable<StudentDTO[]> {
    return this.http.get<StudentDTO[]>(`${this.baseUrl}/active/class/${selectedClass}`);
  }

  updateStudent(studentId: string, payload: { studentDetails: Partial<Student>; effectiveFromMonth: number | null }): Observable<Student> {
    return this.http.put<Student>(`${this.baseUrl}/${studentId}`, payload);
  }

  addStudent(studentData: Omit<Student, 'studentId'>): Observable<Student> {
    return this.http.post<Student>(this.baseUrl, studentData);
  }

  getNewStudentsByClass(selectedClass: string): Observable<StudentDTO[]> {
    return this.http.get<StudentDTO[]>(`${this.baseUrl}/new/class/${selectedClass}`);
  }

  getInactiveStudentsByClass(selectedClass: string): Observable<StudentDTO[]> {
    return this.http.get<StudentDTO[]>(`${this.baseUrl}/inactive/class/${selectedClass}`);
  }

}