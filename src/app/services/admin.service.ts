import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private baseUrl = `${environment.apiUrl}/api/admins`;
  private noticeUrl = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) { }

  getAdmin(adminId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${adminId}`);
  }

  getAllAdmins(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  createAdmin(admin: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, admin);
  }

  updateAdmin(adminId: string, admin: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${adminId}`, admin);
  }

  deleteAdmin(adminId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${adminId}`);
  }

  sendNoticeToStudents(data: { title: string; subject: string; body: string }): Observable<any> {
    return this.http.post<any>(this.noticeUrl + '/notice', data);
  }
}
