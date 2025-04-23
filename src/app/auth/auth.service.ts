import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth';

  constructor(private http: HttpClient) { }

  register(userData: any): Observable<any> {
    return this.http.post(this.apiUrl + '/register', userData, { responseType: 'text' });
  }

  login(userId: string, password: string): Observable<string> {
    return this.http.post(this.apiUrl + '/login', { userId, password }, { responseType: 'text' });
  }

  changePassword(request: ChangePasswordRequest): Observable<any> {
    return this.http.post(this.apiUrl + '/change-password', request, { responseType: 'text' });
  }

  logout() {
    localStorage.removeItem('token');
  }

  getUserRole(): string {
    const token = localStorage.getItem('token');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.role;
    }
    return '';
  }
}
