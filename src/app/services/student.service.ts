import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentService {

  private baseUrl = 'http://localhost:8081/student';

  constructor(private http: HttpClient) {}

  getStudentDetails(): Observable<any> {
    return this.http.get(`${this.baseUrl}/details`); // Token is handled by interceptor
  }
}
