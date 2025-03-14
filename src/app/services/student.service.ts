import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private baseUrl = 'http://localhost:8081/students'; // Replace with your backend URL

  constructor(private http: HttpClient) {}

  getStudent(studentId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${studentId}`);
  }
}