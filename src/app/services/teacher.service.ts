import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {

  private baseUrl = 'http://localhost:8081/teachers'; 

  constructor(private http: HttpClient) {}

   getTeacher(teacherId: string): Observable<any> {
     return this.http.get<any>(`${this.baseUrl}/${teacherId}`);
   }

}
