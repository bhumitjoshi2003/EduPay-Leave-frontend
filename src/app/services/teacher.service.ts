import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {

  private baseUrl = `${environment.apiUrl}/teachers`;

  constructor(private http: HttpClient) { }

  getTeacher(teacherId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${teacherId}`);
  }

  getAllTeachers(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}`);
  }

  updateTeacher(teacherId: string, updatedTeacher: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${teacherId}`, updatedTeacher);
  }

  addTeacher(teacherData: any): Observable<any> {
    return this.http.post(this.baseUrl, teacherData);
  }
}
