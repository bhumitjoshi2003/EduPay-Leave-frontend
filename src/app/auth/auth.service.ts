import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth'; 

  constructor(private http: HttpClient) { }

  login(studentId: string, password: string): Observable<string> {
    return this.http.post(this.apiUrl + '/login', { studentId, password }, { responseType: 'text' });
  }
}