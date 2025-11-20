import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) { }

  register(userData: any): Observable<any> {
    return this.http.post(this.apiUrl + '/register', userData, { responseType: 'text' });
  }

  login(userId: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { userId, password });
  }

  refreshToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    return this.http.post(`${this.apiUrl}/refresh-token`, { refreshToken });
  }


  changePassword(request: ChangePasswordRequest): Observable<any> {
    return this.http.post(this.apiUrl + '/change-password', request, { responseType: 'text' });
  }

  requestPasswordReset(userId: string, email: string): Observable<any> {
    return this.http.post(this.apiUrl + '/request-password-reset', { userId, email }, { responseType: 'text' });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    console.log(this.apiUrl + '/reset-password?token=' + token);
    return this.http.post(this.apiUrl + '/reset-password?token=' + token, { newPassword }, { responseType: 'text' });
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getUserRole(): string {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.role;
    }
    return '';
  }

  getUserId(): string {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      return decodedToken.userId;
    }
    return '';
  }
}
