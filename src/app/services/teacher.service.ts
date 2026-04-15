import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Teacher } from '../interfaces/teacher';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {

  private baseUrl = `${environment.apiUrl}/teachers`;

  constructor(private http: HttpClient) { }

  getTeacher(teacherId: string): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.baseUrl}/${teacherId}`);
  }

  getAllTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(`${this.baseUrl}`);
  }

  updateTeacher(teacherId: string, updatedTeacher: Partial<Teacher>): Observable<Teacher> {
    return this.http.put<Teacher>(`${this.baseUrl}/${teacherId}`, updatedTeacher);
  }

  addTeacher(teacherData: Omit<Teacher, 'teacherId'>): Observable<Teacher> {
    return this.http.post<Teacher>(this.baseUrl, teacherData);
  }
}
