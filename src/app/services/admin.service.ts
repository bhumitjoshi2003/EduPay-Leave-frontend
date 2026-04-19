import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Admin } from '../interfaces/admin';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private baseUrl = `${environment.apiUrl}/admins`;
  private noticeUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) { }

  getAdminById(adminId: string): Observable<Admin> {
    return this.http.get<Admin>(`${this.baseUrl}/${adminId}`);
  }

  getAllAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.baseUrl);
  }

  createAdmin(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(this.baseUrl, admin);
  }

  updateAdmin(adminId: string, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.baseUrl}/${adminId}`, admin);
  }

  deleteAdmin(adminId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${adminId}`);
  }

  sendNoticeToStudents(data: { title: string; subject: string; body: string }): Observable<string> {
    return this.http.post(this.noticeUrl + '/notice', data, { responseType: 'text' });
  }

  uploadAdminPhoto(adminId: string, file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ photoUrl: string }>(`${this.baseUrl}/${adminId}/photo`, formData);
  }
}
